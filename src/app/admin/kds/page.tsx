 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, ChefHat, Clock, CheckCircle2, AlertTriangle, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KitchenPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchKitchenData();
      setupRealtime();
      // Refresh data every 30 seconds for time updates
      const interval = setInterval(fetchKitchenData, 30000);
      return () => clearInterval(interval);
    }
  }, [profile]);

  const fetchKitchenData = async () => {
    // 1. Fetch Orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, created_at, status, guests(full_name), rooms(room_number), order_items(quantity, menu_items(name))')
      .eq('org_id', profile?.org_id)
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true });
    setOrders(orderData || []);

    // 2. Fetch Low Stock Alerts
    const { data: stockData } = await supabase
      .from('menu_items')
      .select('id, name, current_stock, min_stock')
      .eq('org_id', profile?.org_id)
      .not('current_stock', 'is', null);
      
    if (stockData) {
        const lowItems = stockData.filter((i: any) => i.current_stock <= i.min_stock);
        setLowStockItems(lowItems);
    }

    setLoading(false);
  };

  const setupRealtime = () => {
    const channel = supabase.channel('kds-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchKitchenData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchKitchenData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) toast.error('Error updating status');
    else fetchKitchenData();
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* --- KITCHEN DASHBOARD HEADER --- */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
                <ChefHat size={28} className="text-orange-400" />
                <h1 className="text-2xl font-bold text-white">Kitchen Command</h1>
            </div>
            <div className="flex items-center gap-2 text-gray-300 bg-gray-700 px-3 py-1 rounded">
                <Clock size={16} />
                <span className="font-mono text-lg">{new Date().toLocaleTimeString()}</span>
            </div>
        </div>

        {/* LOW STOCK ALERT WIDGET */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-300 font-bold mb-2">
                <AlertTriangle size={16} /> Low Stock Alerts ({lowStockItems.length})
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
                {lowStockItems.map(item => (
                    <div key={item.id} className="bg-gray-900 px-3 py-1 rounded text-xs text-white flex-shrink-0 border border-red-800">
                        {item.name} (<span className="text-red-400 font-bold">{item.current_stock}</span> left)
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* --- ORDER COLUMNS --- */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          {/* Pending */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-4 text-yellow-400 border-b border-gray-700 pb-2">
              <Clock /> <h2 className="font-bold">Pending ({orders.filter(o => o.status === 'pending').length})</h2>
            </div>
            <div className="space-y-3">
              {orders.filter(o => o.status === 'pending').map(order => (
                <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, 'preparing')} actionLabel="Start" actionColor="bg-yellow-500" />
              ))}
            </div>
          </div>

          {/* Preparing */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-4 text-blue-400 border-b border-gray-700 pb-2">
              <Utensils /> <h2 className="font-bold">Preparing ({orders.filter(o => o.status === 'preparing').length})</h2>
            </div>
            <div className="space-y-3">
              {orders.filter(o => o.status === 'preparing').map(order => (
                <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, 'ready')} actionLabel="Ready" actionColor="bg-blue-500" />
              ))}
            </div>
          </div>

          {/* Ready */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-4 text-green-400 border-b border-gray-700 pb-2">
              <CheckCircle2 /> <h2 className="font-bold">Ready ({orders.filter(o => o.status === 'ready').length})</h2>
            </div>
            <div className="space-y-3">
              {orders.filter(o => o.status === 'ready').map(order => (
                <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, 'completed')} actionLabel="Complete" actionColor="bg-green-500" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onAction, actionLabel, actionColor }: { order: any; onAction: () => void; actionLabel: string; actionColor: string }) {
  return (
    <div className="bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-600">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</span>
        <span className="text-xs text-white font-bold bg-gray-900 px-2 py-0.5 rounded">
          {order.guests?.full_name || 'Guest'} {order.rooms && <span className="text-purple-300">(Rm {order.rooms.room_number})</span>}
        </span>
      </div>
      <div className="border-t border-gray-600 pt-2 mb-3 space-y-1">
        {order.order_items.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between text-sm text-white">
            <span>{item.quantity}x {item.menu_items?.name || 'Item'}</span>
          </div>
        ))}
      </div>
      <button onClick={onAction} className={`w-full py-2 rounded text-black text-xs font-bold ${actionColor}`}>
        {actionLabel}
      </button>
    </div>
  );
}