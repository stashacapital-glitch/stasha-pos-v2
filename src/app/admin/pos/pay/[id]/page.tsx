 'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CreditCard, Banknote, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.id as string;
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [order, setOrder] = useState<any | null>(null);
  const [amountTendered, setAmountTendered] = useState<number | string>('');

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchOrder(profile.org_id);
  }, [profile]);

  const fetchOrder = async (orgId: string) => {
    setLoading(true);
    
    // SIMPLIFIED QUERY: Removed the "tables" join to fix 406 error
    const { data, error } = await supabase
      .from('orders')
      .select('*') 
      .eq('org_id', orgId)
      .eq('table_id', tableId)
      .in('status', ['pending', 'ready'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); 

    if (error) {
        console.error("Error fetching order:", error);
        toast.error("Error loading order.");
    } else {
        setOrder(data);
    }
    
    setLoading(false);
  };

  const handlePayment = async (method: string) => {
    if (!order) return;

    const total = order.total_price;
    const tendered = Number(amountTendered) || 0;

    if (method === 'Cash' && tendered < total) {
      toast.error("Amount tendered is less than total bill.");
      return;
    }

    if (order.status === 'pending') {
        const confirmPayment = window.confirm(
            "WARNING: The Kitchen has not marked this order as 'Ready'.\n\nAre you sure you want to process payment?"
        );
        if (!confirmPayment) return;
    }

    setProcessing(true);

    const { error } = await supabase
      .from('orders')
      .update({ 
          status: 'paid', 
          payment_method: method,
          amount_tendered: method === 'Cash' ? tendered : total,
          change_due: method === 'Cash' ? tendered - total : 0
      })
      .eq('id', order.id);

    if (error) {
      toast.error("Payment Failed: " + error.message);
      setProcessing(false);
    } else {
      toast.success('Payment Successful!');
      router.push('/admin/pos');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;
  
  if (!order) return (
      <div className="p-8 text-center text-gray-400">
          No active bill found for this table.
          <br/>
          <button onClick={() => router.back()} className="mt-4 text-orange-400 hover:underline">Go Back</button>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Use tableId from URL instead of join */}
      <h1 className="text-3xl font-bold mb-2">Payment: Table {tableId.slice(0, 4)}</h1>
      <p className="text-gray-400 mb-6">Review order and complete payment.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Bill Summary */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="font-bold mb-4 border-b border-gray-700 pb-2">Order Summary</h2>
          <ul className="space-y-2 mb-4">
            {order.items.map((item: any, idx: number) => (
              <li key={idx} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.name}</span>
                <span>KES {item.price_kes * item.quantity}</span>
              </li>
            ))}
          </ul>
          
          <div className="border-t border-gray-700 pt-4 mt-4">
            <div className="flex justify-between text-xl font-bold text-orange-400">
              <span>Total:</span>
              <span>KES {order.total_price}</span>
            </div>
          </div>
        </div>

        {/* Right: Payment Actions */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="font-bold mb-4">Payment Method</h2>

          <div className="mb-6">
            <label className="text-sm text-gray-400 mb-1 block">Cash Amount Tendered</label>
            <input 
              type="number" 
              placeholder="0"
              value={amountTendered} 
              onChange={(e) => setAmountTendered(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white text-xl font-mono"
            />
            {Number(amountTendered) >= order.total_price && (
              <p className="text-green-400 text-sm mt-2">
                Change: KES {Number(amountTendered) - order.total_price}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => handlePayment('Cash')}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 p-4 rounded text-white font-bold disabled:opacity-50"
            >
              <Banknote /> {processing ? 'Processing...' : 'PAY CASH'}
            </button>

            <button 
              onClick={() => handlePayment('M-Pesa')}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 p-4 rounded text-white font-bold disabled:opacity-50"
            >
              <Smartphone /> M-PESA (Exact)
            </button>

             <button 
              onClick={() => handlePayment('Card')}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 p-4 rounded text-white font-bold disabled:opacity-50"
            >
              <CreditCard /> CARD (Exact)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}