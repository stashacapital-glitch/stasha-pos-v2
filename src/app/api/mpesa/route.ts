import { NextResponse } from 'next/server';

// Helper to generate M-Pesa Auth Token
async function getMpesaAccessToken() {
  const consumer_key = process.env.MPESA_CONSUMER_KEY!;
  const consumer_secret = process.env.MPESA_CONSUMER_SECRET!;
  const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');

  const response = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    method: 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  
  const data = await response.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const { phone, amount, orderId } = await request.json();

    const token = await getMpesaAccessToken();
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const timestamp = new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    // Callback URL: Where Safaricom will send the result
    // This must be a public URL (your Vercel domain)
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa/callback?orderId=${orderId}`;

    const response = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline', // Use 'CustomerBuyGoodsOnline' for Till
        Amount: amount,
        PartyA: phone, // Phone number sending money
        PartyB: shortcode, // Organization receiving money
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: `Stasha POS ${orderId.slice(0, 5)}`, // Shows on customer phone
        TransactionDesc: 'Payment for Order',
      }),
    });

    const data = await response.json();

    if (data.ResponseCode === '0') {
      return NextResponse.json({ success: true, message: 'STK Push Sent! Check your phone.' });
    } else {
      console.error("M-Pesa Error:", data);
      return NextResponse.json({ success: false, message: data.errorMessage || 'Failed to initiate payment.' }, { status: 400 });
    }

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}