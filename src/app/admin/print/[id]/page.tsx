 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';

export default function PrintReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) { 
        router.push('/login'); 
        return; 
      }

      const id = params.id;
      
      // 1. Fetch Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, guests(id, full_name), rooms(id, room_number), tables(id, table_number)')
        .eq('id', id)
        .maybeSingle();

      if (orderError || !orderData) {
        console.error("Order Error:", orderError);
        router.push('/admin/pos');
        setLoading(false);
        return;
      }

      // 2. Fetch Settings
      const { data: profileData, error: settingsError } = await supabase
        .from('profiles')
        .select('business_name, business_address, tax_rate, service_charge_rate, tax_enabled, service_charge_enabled')
        .eq('id', session.user.id)
        .maybeSingle();

      if (settingsError) {
        console.error("Settings Fetch Error:", settingsError);
      }

      setOrder(orderData);
      setSettings(profileData || {});
      setLoading(false);
    };

    fetchOrder();
  }, [params.id, router]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!order) return null;

  // --- CALCULATION LOGIC ---
  const itemsSubtotal = order.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
  
  const taxRate = settings?.tax_rate || 0.16;
  const serviceRate = settings?.service_charge_rate || 0.02;
  const isTaxEnabled = settings?.tax_enabled ?? false;
  const isServiceEnabled = settings?.service_charge_enabled ?? false;

  let taxAmount = 0;
  let serviceAmount = 0;

  if (isTaxEnabled) {
    taxAmount = itemsSubtotal * taxRate;
  }
  if (isServiceEnabled) {
    serviceAmount = itemsSubtotal * serviceRate;
  }

  const calculatedGrandTotal = itemsSubtotal + taxAmount + serviceAmount;
  const finalGrandTotal = Math.max(order.total_price, calculatedGrandTotal);

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
      <div className="bg-white text-black w-full max-w-md mx-auto shadow-2xl print:shadow-none text-sm">
        
        <div className="border-b border-dashed border-gray-300 p-4 text-center">
          <h1 className="text-xl font-bold tracking-wide">{settings?.business_name || 'STASHA POS'}</h1>
          {settings?.business_address && <p className="text-xs text-gray-600 whitespace-pre-line mt-1">{settings.business_address}</p>}
          <p className="text-xs text-gray-500 mt-2 font-bold">OFFICIAL {order.status === 'paid' ? 'RECEIPT' : 'BILL'}</p>
        </div>

        <div className="p-4 text-xs border-b border-dashed border-gray-300">
          <div className="flex justify-between mb-1"><span className="text-gray-600">Date:</span><span>{new Date(order.created_at).toLocaleDateString()}</span></div>
          <div className="flex justify-between mb-1"><span className="text-gray-600">Time:</span><span>{new Date(order.created_at).toLocaleTimeString()}</span></div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Table:</span>
            <span className="font-bold">{order.rooms ? `Room ${order.rooms.room_number}` : order.tables ? `Table ${order.tables.table_number}` : 'N/A'}</span>
          </div>
          <div className="flex justify-between"><span className="text-gray-600">Receipt #:</span><span>{order.id.slice(0, 8).toUpperCase()}</span></div>
          {order.guests && <div className="flex justify-between mt-1"><span className="text-gray-600">Guest:</span><span>{order.guests.full_name}</span></div>}
        </div>

        <div className="p-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200"><th className="text-left py-1 text-gray-600 font-normal">Item</th><th className="text-center py-1 text-gray-600 font-normal w-12">Qty</th><th className="text-right py-1 text-gray-600 font-normal">Price</th></tr></thead>
            <tbody>
              {order.items?.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="py-2"><span className="font-medium">{item.name}</span></td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">KES {(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t-2 border-dashed border-gray-300 space-y-1 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-mono">KES {itemsSubtotal.toLocaleString()}</span>
          </div>

          {isTaxEnabled && (
            <div className="flex justify-between items-center text-red-600">
              <span>VAT ({Number(taxRate) * 100}%)</span>
              <span className="font-mono">KES {taxAmount.toLocaleString()}</span>
            </div>
          )}

          {isServiceEnabled && (
            <div className="flex justify-between items-center text-blue-600">
              <span>Service ({Number(serviceRate) * 100}%)</span>
              <span className="font-mono">KES {serviceAmount.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
            <span className="text-lg font-bold">TOTAL</span>
            <span className="text-2xl font-bold text-orange-600">KES {finalGrandTotal.toLocaleString()}</span>
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