import { initiatePayment } from "@/lib/phonepe";
import { query } from "@/lib/db";

export async function POST(request) {
  try {
    const { amount, tierId, policyId, userId, mobileNumber } = await request.json();

    if (!amount) {
      return Response.json({ error: 'amount is required' }, { status: 400 });
    }

    const merchantTransactionId = `GS_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const requestUrl = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || requestUrl.origin;

    // PhonePe sandbox — no real creds needed for testing
    let result;
    const hasPhonePeCreds = Boolean(process.env.PHONEPE_MERCHANT_ID);

    if (!hasPhonePeCreds) {
      // Demo mode: return a mock redirect
      result = {
        redirectUrl: `${baseUrl}/payment/demo?txnId=${merchantTransactionId}&amount=${amount}`,
        transactionId: merchantTransactionId,
        mock: true,
      };
    } else {
      try {
        result = await initiatePayment({
          merchantTransactionId,
          amount,
          mobileNumber,
          userId,
          redirectUrl: `${baseUrl}/payment/callback?txnId=${merchantTransactionId}`,
          callbackUrl: `${baseUrl}/api/phonepe/callback`,
        });
      } catch (phonePeError) {
        console.warn("PhonePe unavailable, falling back to demo mode:", phonePeError.message);
        result = {
          redirectUrl: `${baseUrl}/payment/demo?txnId=${merchantTransactionId}&amount=${amount}`,
          transactionId: merchantTransactionId,
          mock: true,
          fallbackReason: phonePeError.message,
        };
      }
    }

    // Store pending payment in DB
    try {
      await query(
        `INSERT INTO payments (transaction_id, user_id, amount, tier_id, policy_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
         ON CONFLICT DO NOTHING`,
        [merchantTransactionId, userId || 'guest', amount, tierId || null, policyId || null]
      );
    } catch (_) { /* Table may not exist yet */ }

    return Response.json({
      success: true,
      redirectUrl: result.redirectUrl,
      transactionId: merchantTransactionId,
      mock: result.mock || false,
    });
  } catch (err) {
    console.error('PhonePe initiate error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
