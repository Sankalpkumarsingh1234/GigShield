"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentDemoContent() {
  const searchParams = useSearchParams();
  const txnId  = searchParams.get('txnId');
  const amount = searchParams.get('amount');
  const [stage, setStage] = useState(0);

  const stages = [
    { label: 'Connecting to PhonePe...', icon: '📱' },
    { label: 'Verifying payment details', icon: '🔐' },
    { label: 'Processing transaction',   icon: '⚡' },
    { label: 'Payment complete!',        icon: '✅' },
  ];

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setStage(i);
      if (i >= stages.length - 1) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#1A0033', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{ background: '#5F259F', borderRadius: 12, padding: '12px 20px', marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💜</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>PhonePe</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>SANDBOX</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1512', marginBottom: 4 }}>₹{amount}</div>
        <div style={{ fontSize: 13, color: '#6B6258', marginBottom: 24 }}>GigShield Premium Payment</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {stages.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: stage >= i ? 1 : 0.3, transition: 'opacity 0.4s' }}>
              <span style={{ fontSize: 18, width: 28 }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: stage >= i ? '#1A1512' : '#9B9589', fontWeight: stage === i ? 600 : 400 }}>{s.label}</span>
              {stage > i && <span style={{ marginLeft: 'auto', color: '#4CAF82', fontSize: 14 }}>✓</span>}
              {stage === i && i < stages.length - 1 && (
                <div style={{ marginLeft: 'auto', width: 14, height: 14, border: '2px solid #5F259F', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              )}
            </div>
          ))}
        </div>

        {stage >= stages.length - 1 && (
          <button
            onClick={() => window.location.href = '/'}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#5F259F', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            → Go to Dashboard
          </button>
        )}

        <p style={{ fontSize: 10, color: '#9B9589', marginTop: 16 }}>
          🧪 Sandbox mode — add PHONEPE_MERCHANT_ID to .env for live payments
        </p>
      </div>
    </div>
  );
}

export default function PaymentDemoPage() {
  return (
    <Suspense fallback={null}>
      <PaymentDemoContent />
    </Suspense>
  );
}
