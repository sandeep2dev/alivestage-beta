import { apiFetch, openRazorpayCheckout } from '@/lib/api';

/** Complete a fee payment (mock skips Razorpay checkout). */
export async function payAndConfirm({ order, token, confirmPath, body = {} }) {
  const isMock =
    order.mock ||
    String(order.orderId || '').startsWith('mock_order_') ||
    order.key === 'mock_key';

  if (isMock) {
    return apiFetch(confirmPath, {
      method: 'POST',
      token,
      body: {
        ...body,
        orderId: order.orderId,
        paymentId: `mock_pay_${Date.now()}`,
        signature: 'mock',
      },
    });
  }

  return new Promise((resolve, reject) => {
    openRazorpayCheckout({
      key: order.key,
      orderId: order.orderId,
      amount: order.amount,
      name: '',
      email: '',
      onSuccess: async (response) => {
        try {
          const result = await apiFetch(confirmPath, {
            method: 'POST',
            token,
            body: {
              ...body,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
    }).catch(reject);
  });
}
