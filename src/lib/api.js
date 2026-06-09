const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5001';

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(window.Razorpay);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout({ key, orderId, amount, name, email, onSuccess }) {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve, reject) => {
    const options = {
      key,
      amount,
      currency: 'INR',
      name: 'Alivestage',
      description: 'Booking payment',
      order_id: orderId,
      prefill: { name, email },
      handler: (response) => {
        onSuccess(response);
        resolve(response);
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    };
    const rzp = new Razorpay(options);
    rzp.open();
  });
}
