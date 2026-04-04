"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const txnId  = searchParams.get('txnId');
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    if (!txnId) { setStatus('error'); return; }

    let attempts = 0;
    const poll = async () => {
      try {
        const res  = await fetch(`/api/phonepe/callback?txnId=${txnId}`);
        const data = await res.json();
        if (data.status === 'success') { setStatus('success'); return; }
        if (data.status === 'failed')  { setStatus('failed');  return; }
      } catch (_) {}
      if (++attempts < 10) setTimeout(poll, 2000);
      else setStatus('timeout');
    };

    poll();
  }, [txnId]);

  const content = {
    checking: { icon: '⏳', color: '#F59E0B', title: 'Verifying Payment...', sub: 'Please wait a moment' },
    success:  { icon: '✅', color: '#4CAF82', title: 'Payment Successful!',  sub: 'Your GigShield is now active' },
    failed:   { icon: '❌', color: '#EF4444', title: 'Payment Failed',        sub: 'Please try again' },
    timeout:  { icon: '⚠️', color: '#F59E0B', title: 'Still Checking...',     sub: 'Check your bank — policy may already be active' },
    error:    { icon: '❌', color: '#EF4444', title: 'Invalid Request',       sub: 'No transaction found' },
  }[status];

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 40, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 4px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>{content.icon}</div>
        {status === 'checking' && (
          <div style={{ width: 48, height: 48, border: '4px solid #E0D9D0', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
        )}
        <h2 style={{ fontFamily: 'serif', fontSize: 24, color: content.color, marginBottom: 8 }}>{content.title}</h2>
        <p style={{ color: '#6B6258', fontSize: 14, marginBottom: 24 }}>{content.sub}</p>
        {txnId && <p style={{ fontSize: 11, color: '#9B9589', marginBottom: 16 }}>Ref: {txnId}</p>}
        <button
          onClick={() => window.location.href = '/'}
          style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: '#FF6B35', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          {status === 'success' ? '→ Go to Dashboard' : '← Back to GigShield'}
        </button>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
