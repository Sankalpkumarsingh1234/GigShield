import { sendWhatsAppNotification } from "@/services/twilio-whatsapp";

export async function POST(request) {
  try {
    const { to, message, type } = await request.json();

    if (!to || !message) {
      return Response.json({ error: 'to and message are required' }, { status: 400 });
    }

    // Strip whatsapp: prefix if caller includes it
    const phone = to.replace('whatsapp:', '').trim();
    const result = await sendWhatsAppNotification(phone, message);

    return Response.json({ success: true, messageSid: result.sid, status: result.status });
  } catch (err) {
    console.error('Twilio route error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}