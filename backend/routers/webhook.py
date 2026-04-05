"""Stripe webhook handler with signature verification."""
import os
import stripe
from fastapi import APIRouter, Request, HTTPException
from backend.services.supabase_client import get_supabase

router = APIRouter()


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events with signature verification."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    supabase = get_supabase()

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_id = session.get("customer", "")
        customer_email = session.get("customer_email", "")
        subscription_id = session.get("subscription", "")

        # Determine tier from price
        # Look up the subscription to get the price ID
        tier = "pro"  # Default
        if subscription_id:
            try:
                sub = stripe.Subscription.retrieve(subscription_id)
                price_id = sub["items"]["data"][0]["price"]["id"] if sub.get("items", {}).get("data") else ""
                if price_id == os.environ.get("STRIPE_PREMIUM_PRICE_ID"):
                    tier = "premium"
            except Exception:
                pass

        # Upsert subscriber
        supabase.table("subscribers").upsert(
            {
                "email": customer_email,
                "stripe_customer_id": customer_id,
                "stripe_subscription_id": subscription_id,
                "tier": tier,
                "is_active": True,
            },
            on_conflict="email",
        ).execute()
        print(f"Subscriber upgraded: {customer_email} -> {tier}")

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        subscription_id = subscription.get("id", "")

        supabase.table("subscribers").update(
            {"tier": "free", "is_active": True, "stripe_subscription_id": None}
        ).eq("stripe_subscription_id", subscription_id).execute()
        print(f"Subscription cancelled: {subscription_id}")

    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer", "")

        supabase.table("subscribers").update(
            {"is_active": False}
        ).eq("stripe_customer_id", customer_id).execute()
        print(f"Payment failed for customer: {customer_id}")

    return {"status": "ok"}
