/**
 * WhatsApp message sender via Ultramsg.
 * Falls back to console.log in development.
 */
export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.log(`[WhatsApp → ${phone}]: ${message}`);
    return;
  }

  // Normalize Egyptian phone to international format
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) normalized = '20' + normalized.slice(1);
  if (!normalized.startsWith('20')) normalized = '20' + normalized;
  const to = `+${normalized}`;

  const res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, to, body: message }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[WhatsApp error] ${res.status}: ${err}`);
    // Don't throw — WhatsApp failure should not break the main flow
  }
}
