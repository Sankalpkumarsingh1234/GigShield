import { query } from "@/lib/db";

function demoOrder(transactionId, amount) {
  return {
    success: true,
    mock: true,
    transactionId,
    orderId: transactionId,
    amount: Math.round(amount * 100),
    currency: "INR",
  };
}

export async function POST(request) {
  try {
    const { amount, tierId, policyId, userId, mobileNumber } = await request.json();

    if (!amount) {
      return Response.json({ error: "amount is required" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const receipt = `gs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let result;

    if (!keyId || !keySecret) {
      result = demoOrder(receipt, amount);
    } else {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: "INR",
          receipt,
          notes: {
            tierId: tierId || "",
            userId: userId || "guest",
            mobileNumber: mobileNumber || "",
          },
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.warn("Razorpay unavailable, falling back to demo mode:", data?.error?.description || data?.error || response.statusText);
        result = demoOrder(receipt, amount);
      } else {
        result = {
          success: true,
          mock: false,
          keyId,
          transactionId: data.id,
          orderId: data.id,
          amount: data.amount,
          currency: data.currency,
        };
      }
    }

    try {
      await query(
        `INSERT INTO payments (transaction_id, user_id, amount, tier_id, policy_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
         ON CONFLICT DO NOTHING`,
        [result.transactionId, userId || "guest", amount, tierId || null, policyId || null]
      );
    } catch (_) {}

    return Response.json(result);
  } catch (error) {
    console.error("Razorpay order error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
