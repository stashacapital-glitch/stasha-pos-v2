 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { Loader2, Clock, ChefHat, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

type Order = {
  id: string;
  created_at: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  guests: { full_name: string } | null;
  rooms: { room_number: number } | null;
  order_items: {
    quantity: number;
    notes: string | null;
    menu_items: { name: string } | null;
  }[];
};

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        guests ( full_name ),
        rooms ( room_number ),
        order_items (
          quantity,
          notes,
          menu_items ( name )
        )
      `)
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('kds-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          fetchOrders();
          toast.success('New Order Received!');
        } else if (payload.eventType === 'UPDATE') {
          setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o)));
        } else if (payload.eventType === 'DELETE') {
          setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (error) toast.error('Failed to update status');
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" size={48} /></div>;

  const pending = orders.filter((o) => o.status === 'pending');
  const preparing = orders.filter((o) => o.status === 'preparing');
  const ready = orders.filter((o) => o.status === 'ready');

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <h1 className="text-2xl font-bold text-orange-400 text-center">Kitchen Command Center</h1>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 overflow-hidden min-h-0">
        
        {/* Column 1: Pending */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-700 flex items-center gap-2 flex-shrink-0 bg-yellow-900/20">
            <Clock className="text-yellow-400" />
            <h2 className="text-xl font-bold text-yellow-400">New Orders ({pending.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {pending.map((order) => (
              <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, 'preparing')} actionLabel="Start Preparing" actionColor="bg-yellow-500" />
            ))}
            {pending.length === 0 && <p className="text-gray-500 text-center mt-10">No new orders</p>}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-700 flex items-center gap-2 flex-shrink-0 bg-blue-900/20">
            <ChefHat className="text-blue-400" />
            <h2 className="text-xl font-bold text-blue-400">Preparing ({preparing.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {preparing.map((order) => (
              <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, 'ready')} actionLabel="Mark Ready" actionColor="bg-blue-500" />
            ))}
            {preparing.length === 0 && <p className="text-gray-500 text-center mt-10">Nothing cooking</p>}
          </div>
        </div>

        {/* Column 3: Ready */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-700 flex items-center gap-2 flex-shrink-0 bg-green-900/20">
            <CheckCircle className="text-green-400" />
            <h2 className="text-xl font-bold text-green-400">Ready ({ready.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {ready.map((order) => (
              <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, 'completed')} actionLabel="Pick Up / Complete" actionColor="bg-green-500" />
            ))}
            {ready.length === 0 && <p className="text-gray-500 text-center mt-10">No orders ready</p>}
          </div>
        </div>

      </div>
    </div>
  );
}

function OrderCard({ order, onAction, actionLabel, actionColor }: { order: Order; onAction: () => void; actionLabel: string; actionColor: string }) {
  const time = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className="bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-600">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400">{time}</span>
        <span className="font-bold text-white">
          {order.guests?.full_name || 'Guest'} 
          {order.rooms && <span className="text-purple-400 ml-1">(Rm {order.rooms.room_number})</span>}
        </span>
      </div>
      
      <div className="border-t border-gray-600 pt-2 mb-3">
        {order.order_items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm py-1">
            <span className="font-medium">{item.quantity}x {item.menu_items?.name || 'Unknown Item'}</span>
          </div>
        ))}
      </div>

      <button 
        onClick={onAction}
        className={`w-full py-2 rounded text-black font-bold text-sm ${actionColor} hover:opacity-90`}
      >
        {actionLabel}
      </button>
    </div>
  );
}