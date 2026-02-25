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
  const [amountTendered, setAmountTendered] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchOrder(profile.org_id);
  }, [profile]);

  const fetchOrder = async (orgId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, tables(table_number)')
      .eq('org_id', orgId)
      .eq('table_id', tableId)
      .eq('status', 'pending') // Only fetch active orders
      .single();

    if (data) setOrder(data);
    setLoading(false);
  };

  const handlePayment = async (method: string) => {
    if (!order) return;
    
    // Simple validation for Cash
    if (method === 'Cash' && amountTendered < order.total_price) {
        toast.error("Amount tendered is less than total bill.");
        return;
    }

    setProcessing(true);

    // Update Order Status to 'Paid'
    const { error } = await supabase
      .from('orders')
      .update({ 
          status: 'paid', 
          payment_method: method,
          amount_tendered: method === 'Cash' ? amountTendered : order.total_price,
          change_due: method === 'Cash' ? amountTendered - order.total_price : 0
      })
      .eq('id', order.id);

    if (error) {
      toast.error('Payment Failed: ' + error.message);
      setProcessing(false);
    } else {
      toast.success('Payment Successful!');
      router.push('/admin/pos'); // Go back to tables
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;
  
  if (!order) return (
      <div className="p-8 text-center text-gray-400">
          No active bill found for this table.
          <br/>
          <button onClick={() => router.back()} className="mt-4 text-orange-400">Go Back</button>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Payment: Table {order.tables?.table_number}</h1>
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

          {/* Cash Logic */}
          <div className="mb-6">
            <label className="text-sm text-gray-400 mb-1 block">Cash Amount Tendered</label>
            <input 
              type="number" 
              placeholder="0"
              value={amountTendered || ''} 
              onChange={(e) => setAmountTendered(parseInt(e.target.value))}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white text-xl font-mono"
            />
            {amountTendered >= order.total_price && (
              <p className="text-green-400 text-sm mt-2">
                Change: KES {amountTendered - order.total_price}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => handlePayment('Cash')}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 p-4 rounded text-white font-bold"
            >
              <Banknote /> PAY CASH
            </button>

            <button 
              onClick={() => handlePayment('M-Pesa')}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 p-4 rounded text-white font-bold"
            >
              <Smartphone /> M-PESA (Exact)
            </button>

             <button 
              onClick={() => handlePayment('Card')}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 p-4 rounded text-white font-bold"
            >
              <CreditCard /> CARD (Exact)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}