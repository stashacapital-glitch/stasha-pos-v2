 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';

export default function PrintReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const supabase = createClient();
      
      // FIX: Wait for session to be ready (essential for new tabs)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error("No session found. Redirecting to login.");
        router.push('/login');
        return;
      }

      const id = params.id;
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error("Database Error:", error);
        router.push('/admin/pos');
      } else if (!data) {
        console.error("Order not found");
        router.push('/admin/pos');
      } else {
        setOrder(data);
      }
      
      setLoading(false);
    };

    fetchOrder();
  }, [params.id]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-200 py-8">
      
      {/* Controls */}
      <div className="max-w-md mx-auto mb-4 flex justify-between items-center print:hidden px-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-black">
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">
          <Printer size={18} /> Print
        </button>
      </div>

      {/* Receipt */}
      <div className="bg-white text-black w-full max-w-md mx-auto shadow-2xl print:shadow-none">
        
        <div className="border-b border-dashed border-gray-300 p-4 text-center">
          <h1 className="text-xl font-bold tracking-wide">STASHA POS</h1>
          <p className="text-xs text-gray-500 mt-1">OFFICIAL {order.status === 'paid' ? 'RECEIPT' : 'BILL'}</p>
        </div>

        <div className="p-4 text-xs border-b border-dashed border-gray-300">
          <div className="flex justify-between mb-1"><span className="text-gray-600">Date:</span><span>{new Date(order.created_at).toLocaleDateString()}</span></div>
          <div className="flex justify-between mb-1"><span className="text-gray-600">Time:</span><span>{new Date(order.created_at).toLocaleTimeString()}</span></div>
          <div className="flex justify-between mb-1"><span className="text-gray-600">Table:</span><span className="font-bold">{order.table_id || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Receipt #:</span><span>{order.id.slice(0, 8).toUpperCase()}</span></div>
        </div>

        <div className="p-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200"><th className="text-left py-1 text-gray-600 font-normal">Item</th><th className="text-center py-1 text-gray-600 font-normal w-12">Qty</th><th className="text-right py-1 text-gray-600 font-normal">Price</th></tr></thead>
            <tbody>
              {order.items?.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="py-2">
                    <span className="font-medium">{item.name}</span>
                    {item.added_at && <span className="block text-xs text-gray-400">{new Date(item.added_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                  </td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">KES {(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t-2 border-dashed border-gray-300">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">TOTAL</span>
            <span className="text-2xl font-bold">KES {order.total_price?.toLocaleString()}</span>
          </div>
        </div>

        <div className="p-4 border-t border-dashed border-gray-300 text-center text-sm">
           <div className={order.status === 'paid' ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
             {order.status === 'paid' ? `PAID via ${order.payment_method?.toUpperCase()}` : "PENDING PAYMENT"}
           </div>
        </div>

        <div className="p-4 border-t border-dashed border-gray-300 text-center text-xs text-gray-400">
          <p className="mb-1">Thank you for dining with us!</p>
          <p>Powered by StashaPOS</p>
        </div>
      </div>
    </div>
  );
}