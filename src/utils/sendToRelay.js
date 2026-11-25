// POSTs a form's JSON to the suggestion relay (relay/). Throws on a network error, a timeout,
// or any answer but 2xx, so the form can say it wasn't sent and keep what was typed.
const SEND_TIMEOUT_MS = 20000;

export default async function sendToRelay(endpoint, body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout?.(SEND_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Relay answered ${response.status}`);
}
