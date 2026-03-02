 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, CreditCard, Banknote, Smartphone, Printer, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function PaymentPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tableId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [order, setOrder] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchActiveOrder();
  }, [tableId]);

  const fetchActiveOrder = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', tableId)
      .in('status', ['pending', 'ready', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) toast.error("Error fetching order");
    setOrder(data);
    setLoading(false);
  };

  const handlePayment = async (method: 'cash' | 'mpesa' | 'card') => {
    if (!order) {
      toast.error("No active order found");
      return;
    }

    setProcessing(true);
    
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: method,
        paid_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (error) {
      toast.error("Payment failed: " + error.message);
    } else {
      toast.success("Payment Successful!");
      router.push('/admin/pos');
    }
    setProcessing(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  if (!order) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">No Active Bill</h2>
        <p className="text-gray-400 mb-6">This table does not have an active bill to pay.</p>
        <button onClick={() => router.push('/admin/pos')} className="px-6 py-2 bg-orange-500 rounded font-bold">
          Back to Tables
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
        <h1 className="text-2xl font-bold mb-2">Payment</h1>
        <p className="text-gray-400 mb-6">Table {tableId}</p>

        <div className="bg-gray-900 p-6 rounded-lg mb-6">
          <p className="text-gray-400 text-sm">Total Amount</p>
          <h2 className="text-5xl font-bold text-orange-400 mt-2">
            KES {order.total_price?.toLocaleString() || 0}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <button 
            onClick={() => handlePayment('cash')}
            disabled={processing}
            className="flex flex-col items-center gap-2 p-4 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50"
          >
            <Banknote size={24} />
            <span className="font-bold text-sm">Cash</span>
          </button>
          <button 
            onClick={() => handlePayment('mpesa')}
            disabled={processing}
            className="flex flex-col items-center gap-2 p-4 bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-50"
          >
            <Smartphone size={24} />
            <span className="font-bold text-sm">M-Pesa</span>
          </button>
          <button 
            onClick={() => handlePayment('card')}
            disabled={processing}
            className="flex flex-col items-center gap-2 p-4 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            <CreditCard size={24} />
            <span className="font-bold text-sm">Card</span>
          </button>
        </div>

        <div className="flex gap-4">
          <Link href={`/admin/print/${order.id}`} target="_blank" className="flex-1">
            <button className="w-full py-3 bg-gray-600 rounded font-bold flex items-center justify-center gap-2 hover:bg-gray-500">
              <Printer size={18} /> Print Bill
            </button>
          </Link>
          <button 
            onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-600 rounded font-bold text-gray-400 hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}