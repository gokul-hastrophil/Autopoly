"""Polymarket CLOB API wrapper for placing/managing orders."""
import os


def create_trader(api_key: str, api_secret: str, api_passphrase: str, private_key: str):
    """Create a ClobClient instance for a user."""
    try:
        from py_clob_client.client import ClobClient
        from py_clob_client.clob_types import ApiCreds

        host = "https://clob.polymarket.com"
        chain_id = 137  # Polygon mainnet

        creds = ApiCreds(
            api_key=api_key,
            api_secret=api_secret,
            api_passphrase=api_passphrase,
        )

        client = ClobClient(
            host,
            key=private_key,
            chain_id=chain_id,
            creds=creds,
        )
        return client
    except Exception as e:
        print(f"  Failed to create CLOB client: {e}")
        return None


def place_limit_order(client, token_id: str, side: str, price: float, size: float) -> str | None:
    """Place a limit order. Returns order_id or None on failure."""
    try:
        from py_clob_client.order_builder.constants import BUY, SELL

        order_side = BUY if side.upper() == "YES" else SELL

        order = client.create_order(
            order_args={
                "token_id": token_id,
                "price": price,
                "size": size,
                "side": order_side,
            }
        )

        if order and hasattr(order, "id"):
            return order.id
        elif isinstance(order, dict):
            return order.get("id") or order.get("orderID")
        return str(order) if order else None
    except Exception as e:
        print(f"  Order placement failed: {e}")
        return None


def cancel_order(client, order_id: str) -> bool:
    """Cancel an order. Returns True on success."""
    try:
        client.cancel(order_id)
        return True
    except Exception as e:
        print(f"  Cancel failed: {e}")
        return False


def get_open_orders(client) -> list[dict]:
    """Get all open orders for this client."""
    try:
        orders = client.get_orders()
        if isinstance(orders, list):
            return orders
        return []
    except Exception as e:
        print(f"  Get orders failed: {e}")
        return []


def test_connection(client) -> bool:
    """Test if the CLOB client can connect."""
    try:
        client.get_orders()
        return True
    except Exception:
        return False
