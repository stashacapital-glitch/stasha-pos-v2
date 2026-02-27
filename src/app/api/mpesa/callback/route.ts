import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Service Role Key for backend operations to bypass RLS if needed, or standard anon key with proper logic
// Ideally, use Service Role Key stored in .env for backend tasks
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // You need to add this to your .env.local
);

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    const body = await request.json();
    
    // Safaricom sends result in Body.stkCallback
    const stkCallback = body.Body.stkCallback;
    
    // Check if payment was successful
    if (stkCallback.ResultCode === 0) {
      // Payment Success
      const mpesaData = stkCallback.CallbackMetadata.Item.reduce((obj: any, item: any) => {
        obj[item.Name] = item.Value;
        return obj;
      }, {});

      const mpesaCode = mpesaData.MpesaReceiptNumber;

      // 1. Update Order Status
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_method: 'M-Pesa',
          transaction_id: mpesaCode
        })
        .eq('id', orderId);

      // 2. Deduct Stock (Call your stock logic or replicate it here)
      // Ideally, we call a Supabase function here. For now, we assume the POS payment page handles deduction, 
      // but since this is an async callback, we must handle it here if the user didn't click "Paid".
      
      // IMPORTANT: You might want to ensure stock is deducted here if not done on frontend.
      // For now, we just mark it Paid.

      console.log(`Payment successful for Order ${orderId}, Mpesa Code: ${mpesaCode}`);
      
    } else {
      // Payment Failed
      console.log(`Payment failed for Order ${orderId}: ${stkCallback.ResultDesc}`);
    }

    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error("Callback Error:", error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}