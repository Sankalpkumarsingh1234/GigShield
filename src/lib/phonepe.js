// src/lib/phonepe.js
// PhonePe UAT (sandbox) integration
// Sandbox docs: https://developer.phonepe.com/v1/reference/pay-api-1
// No KYC needed for sandbox — get credentials at developer.phonepe.com

import crypto from 'crypto';

const PHONEPE_BASE_URL = process.env.PHONEPE_ENV === 'production'
  ? 'https://api.phonepe.com/apis/hermes'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox'; // sandbox

const MERCHANT_ID   = process.env.PHONEPE_MERCHANT_ID   || 'PGTESTPAYUAT'; // sandbox default
const SALT_KEY      = process.env.PHONEPE_SALT_KEY       || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399'; // sandbox default
const SALT_INDEX    = process.env.PHONEPE_SALT_INDEX     || '1';

/**
 * Build X-VERIFY header for PhonePe API
 * Format: SHA256(base64payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
 */
export function buildChecksum(base64Payload, endpoint) {
  const data = base64Payload + endpoint + SALT_KEY;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return `${hash}###${SALT_INDEX}`;
}

/**
 * Verify callback/webhook checksum from PhonePe
 */
export function verifyChecksum(base64Response, receivedChecksum) {
  const [hash, index] = receivedChecksum.split('###');
  const expected = crypto
    .createHash('sha256')
    .update(base64Response + SALT_KEY)
    .digest('hex');
  return expected === hash;
}

/**
 * Initiate a PhonePe payment
 * @param {object} params
 * @param {string} params.merchantTransactionId - Unique ID for this transaction
 * @param {number} params.amount - Amount in paise (₹1 = 100 paise)
 * @param {string} params.mobileNumber - User's mobile number
 * @param {string} params.redirectUrl - URL to redirect after payment
 * @param {string} params.callbackUrl - Webhook URL for server-side notification
 * @param {string} params.userId - Your user ID
 */
export async function initiatePayment({
  merchantTransactionId,
  amount,
  mobileNumber,
  redirectUrl,
  callbackUrl,
  userId,
}) {
  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId,
    merchantUserId: `MUID_${userId || 'guest'}`,
    amount: Math.round(amount * 100), // paise
    redirectUrl,
    redirectMode: 'REDIRECT',
    callbackUrl,
    mobileNumber: mobileNumber?.replace(/\D/g, '') || '',
    paymentInstrument: { type: 'PAY_PAGE' },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const checksum      = buildChecksum(base64Payload, '/pg/v1/pay');

  const response = await fetch(`${PHONEPE_BASE_URL}/pg/v1/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
    },
    body: JSON.stringify({ request: base64Payload }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'PhonePe payment initiation failed');
  }

  return {
    redirectUrl: data.data?.instrumentResponse?.redirectInfo?.url,
    transactionId: merchantTransactionId,
    raw: data,
  };
}

/**
 * Check payment status
 */
export async function checkPaymentStatus(merchantTransactionId) {
  const endpoint = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
  const checksum = buildChecksum('', endpoint);

  const response = await fetch(`${PHONEPE_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'X-MERCHANT-ID': MERCHANT_ID,
    },
  });

  return response.json();
}