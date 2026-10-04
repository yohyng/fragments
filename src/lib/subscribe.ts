/**
 * Sends a subscription request for `email` to api/subscribe (the subscriber
 * list in Supabase; see src/lib/newsletter.mjs). Resolves to 'pending' when a
 * confirmation mail went out, 'active' when the address is on the list at
 * once (no mail set up). Throws when it could not be sent.
 */
export type SubscribeState = 'pending' | 'active';

export async function subscribe(email: string, website = ''): Promise<SubscribeState> {
  const res = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, website }),
  });
  if (res.status === 400) throw new Error('invalid');
  if (!res.ok) throw new Error('failed');
  const data = await res.json().catch(() => ({}));
  return data.state === 'active' ? 'active' : 'pending';
}
