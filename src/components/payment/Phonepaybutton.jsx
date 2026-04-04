"use client";
import { useState } from "react";

let razorpayScriptPromise;

function loadRazorpayScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

export default function PhonePePayButton({
  amount,
  label,
  tierId,
  userId,
  phone,
  onSuccess,
  onError,
  style = {},
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  async function handlePay() {
    if (loading) return;
    setLoading(true);
    setStatus("pending");

    try {
      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, tierId, userId, mobileNumber: phone }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Payment initiation failed");
      }

      if (data.mock) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setStatus("success");
        setLoading(false);
        onSuccess?.({ transactionId: data.transactionId, mock: true });
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Could not load Razorpay checkout.");
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "GigShield",
        description: "Weekly income protection premium",
        order_id: data.orderId,
        prefill: {
          contact: phone || undefined,
        },
        notes: {
          tierId: tierId || "",
          userId: userId || "guest",
        },
        theme: {
          color: "#F97316",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatus(null);
          },
        },
        handler: async (paymentResult) => {
          try {
            const verifyResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transactionId: data.transactionId,
                orderId: paymentResult.razorpay_order_id,
                paymentId: paymentResult.razorpay_payment_id,
                signature: paymentResult.razorpay_signature,
              }),
            });
            const verifyData = await verifyResponse.json().catch(() => ({}));

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed");
            }

            setStatus("success");
            setLoading(false);
            onSuccess?.({
              transactionId: verifyData.transactionId || data.transactionId,
              paymentId: paymentResult.razorpay_payment_id,
              mock: false,
            });
          } catch (error) {
            console.error("Razorpay verify error:", error);
            setStatus("failed");
            setLoading(false);
            onError?.(error);
          }
        },
      });

      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      setStatus("failed");
      setLoading(false);
      onError?.(error);
    }
  }

  const baseStyle = {
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    border: "none",
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? "wait" : "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...style,
  };

  if (status === "success") {
    return (
      <button style={{ ...baseStyle, background: "#4CAF82", color: "#fff" }} disabled>
        Payment Successful
      </button>
    );
  }

  if (status === "failed") {
    return (
      <button onClick={handlePay} style={{ ...baseStyle, background: "#EF4444", color: "#fff" }}>
        Failed - Tap to retry
      </button>
    );
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      style={{ ...baseStyle, background: loading ? "#E0D9D0" : "#0F172A", color: loading ? "#9B9589" : "#fff" }}
    >
      {loading ? (
        <>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.4)",
              borderTopColor: "#fff",
              animation: "spin 0.6s linear infinite",
            }}
          />
          Processing...
        </>
      ) : (
        <>
          <span style={{ fontSize: 16, fontWeight: 800 }}>R</span>
          {label || `Pay Rs ${amount} via Razorpay`}
        </>
      )}
    </button>
  );
}
