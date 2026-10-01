/**
 * Sends a subscription request for `email`.
 *
 * The backend is not decided yet (see design_handoff_fragments/README.md
 * 「購読欄」: Substack via a custom form, an external service such as
 * Supascribe, or Substack's official embed). Until then this is a stand-in
 * that waits ~800ms — the time the prototype shows 「Sending…」 — and succeeds.
 */
export async function subscribe(email: string): Promise<void> {
  void email;
  await new Promise((resolve) => setTimeout(resolve, 800));
}
