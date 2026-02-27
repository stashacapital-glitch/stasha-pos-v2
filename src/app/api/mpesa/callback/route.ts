 import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Initialize Supabase inside the function to avoid build-time errors
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
  );

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    const body = await request.json();
    
    // Safaricom sends result in Body.stkCallback
    const stkCallback = body.Body?.stkCallback;
    
    if (!stkCallback) {
      return NextResponse.json({ status: 'ignored', message: 'No callback data' });
    }

    // Check if payment was successful
    if (stkCallback.ResultCode === 0) {
      // Payment Success
      // FIX: Added types to reduce parameters
      const mpesaData = stkCallback.CallbackMetadata?.Item?.reduce((obj: any, item: any) => {
        obj[item.Name] = item.Value;
        return obj;
      }, {});

      const mpesaCode = mpesaData?.MpesaReceiptNumber;

      // 1. Update Order Status
      if (orderId) {
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            payment_method: 'M-Pesa',
            transaction_id: mpesaCode
          })
          .eq('id', orderId);

        if (error) {
          console.error(`Failed to update order ${orderId}:`, error.message);
        } else {
          console.log(`Payment successful for Order ${orderId}, Mpesa Code: ${mpesaCode}`);
        }
      }
      
    } else {
      // Payment Failed
      console.log(`Payment failed: ${stkCallback.ResultDesc}`);
    }

    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error("Callback Error:", error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}