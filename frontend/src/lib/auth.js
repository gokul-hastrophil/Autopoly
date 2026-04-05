import { supabase } from './supabase'

export async function signInWithMagicLink(email) {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase.auth.signInWithOtp({ email })
  return { error: error?.message || null }
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session || null
}

export async function getAccessToken() {
  const session = await getSession()
  return session?.access_token || null
}
