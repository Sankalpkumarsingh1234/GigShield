// src/services/twilio-whatsapp.js

async function twilioRequest(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    console.log('[Twilio DEMO] Would send to', to, ':', message.slice(0, 80));
    return { sid: `demo_${Date.now()}`, status: 'demo' };
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: `whatsapp:${from}`, To: `whatsapp:${to}`, Body: message }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Twilio error');
  }

  return res.json();
}

export async function sendWhatsAppNotification(phoneNumber, message) {
  if (!phoneNumber) return { status: 'skipped' };
  try {
    return await twilioRequest(phoneNumber, message);
  } catch (err) {
    console.error('WhatsApp send error:', err.message);
    return { status: 'failed', error: err.message };
  }
}

export async function sendPayoutNotification(phoneNumber, { amount, reference, timestamp }) {
  const message = `🛵 *GigShield Payout*\n\nYour payout of ₹${amount} has been sent!\n\n📍 Ref: ${reference}\n⏰ ${new Date(timestamp).toLocaleTimeString('en-IN')}\n\nCheck your account — transfer completes in seconds.\n\n🛡 GigShield`;
  return sendWhatsAppNotification(phoneNumber, message);
}

export async function sendClaimNotification(phoneNumber, { amount, reason, claimId }) {
  const message = `🛵 *GigShield Claim Approved*\n\nYour claim of ₹${amount} is approved!\n\n📌 Reason: ${reason}\n🎫 ID: ${claimId}\n\nPayout will be credited to your UPI shortly.\n\n🛡 GigShield`;
  return sendWhatsAppNotification(phoneNumber, message);
}

export async function sendOTPNotification(phoneNumber, otp) {
  const message = `🛵 GigShield OTP: *${otp}*\nValid for 10 minutes. Do not share with anyone.`;
  return sendWhatsAppNotification(phoneNumber, message);
}

export async function sendOnboardingMessage(phoneNumber, name) {
  const message = `👋 Welcome to *GigShield*, ${name}!\n\nYour income protection is now active. You'll get instant payouts when disruptions hit.\n\n✅ Status: Protected\n💰 Auto-payout on triggers\n📍 Zone-based coverage\n\nStay safe! 🛡`;
  return sendWhatsAppNotification(phoneNumber, message);
}

export async function sendAlertNotification(phoneNumber, alert) {
  const message = `🚨 *GigShield Alert*\n\n${alert.title}\n${alert.description}\n\nStorm window active — extend coverage for +₹8?`;
  return sendWhatsAppNotification(phoneNumber, message);
}