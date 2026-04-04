import { handleWhatsAppOnboarding } from "@/lib/whatsappOnboarding";

export const dynamic = "force-dynamic";

function xmlMessage(message) {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const from = String(form.get("From") || "").replace(/^whatsapp:/, "").trim();
    const body = String(form.get("Body") || "").trim();

    const reply = await handleWhatsAppOnboarding(from, body);

    return new Response(xmlMessage(reply), {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("Twilio webhook error:", error);
    return new Response(xmlMessage("Something went wrong. Please try again."), {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }
}
