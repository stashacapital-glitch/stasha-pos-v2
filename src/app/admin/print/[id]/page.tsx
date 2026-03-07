 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';

export default function PrintReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, created_at, total_price, status, payment_method,
        guests(full_name), rooms(room_number), tables(table_number),
        order_items(quantity, price_at_order, menu_items(name))
      `)
      .eq('id', id)
      .single();
    
    if (data) setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!loading && order) {
      window.print();
    }
  }, [loading, order]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const date = new Date(order.created_at);
  const receiptId = order.id.substring(0, 8).toUpperCase();

  return (
    <div className="bg-white text-black min-h-screen p-4 font-mono text-xs">
      <div className="max-w-[280px] mx-auto">
        {/* Header */}
        <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
          <h1 className="font-bold text-lg">{process.env.NEXT_PUBLIC_BUSINESS_NAME || 'My Business'}</h1>
          <p className="text-[10px] text-gray-600">OFFICIAL RECEIPT</p>
        </div>

        {/* Meta */}
        <div className="mb-2 text-[10px]">
          <div className="flex justify-between"><span>Date:</span><span>{date.toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span>Time:</span><span>{date.toLocaleTimeString()}</span></div>
          <div className="flex justify-between"><span>Receipt #:</span><span>{receiptId}</span></div>
          <div className="flex justify-between">
            <span>Location:</span>
            <span>
              {order.rooms ? `Room ${order.rooms.room_number}` : order.tables ? `Table ${order.tables.table_number}` : 'Takeaway'}
            </span>
          </div>
          {order.guests && <div className="flex justify-between"><span>Guest:</span><span>{order.guests.full_name}</span></div>}
        </div>

        {/* Items */}
        <div className="border-t border-b border-dashed border-gray-400 py-2 mb-2">
          <div className="flex justify-between font-bold mb-1">
            <span>Item</span>
            <span>Price</span>
          </div>
          {order.order_items.map((i: any, idx: number) => (
            <div key={idx} className="flex justify-between mb-1">
              <span className="w-3/4 truncate">{i.quantity}x {i.menu_items.name}</span>
              <span className="w-1/4 text-right">{(i.price_at_order * i.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="font-bold text-sm">
          <div className="flex justify-between"><span>TOTAL</span><span>KES {order.total_price?.toLocaleString()}</span></div>
        </div>

        {/* Status */}
        <div className="mt-2 text-center">
            <span className={`font-bold text-xs px-2 py-1 ${order.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                {order.status === 'paid' ? 'PAID' : 'PENDING PAYMENT'}
            </span>
            {order.payment_method && <p className="text-[10px] text-gray-500 mt-1">Via {order.payment_method.toUpperCase()}</p>}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px] text-gray-500">
          <p>Thank you for dining with us!</p>
          <p className="mt-2 font-bold text-gray-700">Powered by StashaPOS</p>
        </div>

        {/* Print Button (Hidden on print) */}
        <div className="mt-8 text-center print:hidden">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            <Printer className="inline mr-2" size={14} /> Re-Print
          </button>
          <button onClick={() => router.back()} className="ml-2 bg-gray-200 text-black px-4 py-2 rounded text-sm">Back</button>
        </div>
      </div>
    </div>
  );
}