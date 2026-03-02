 'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, CheckCircle, Beer, UtensilsCrossed, Clock } from 'lucide-react';
import PermissionGate from '@/components/PermissionGate';
import toast from 'react-hot-toast';

export default function KitchenDisplay() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [metaData, setMetaData] = useState<{tables: any[], rooms: any[]}>({ tables: [], rooms: [] });

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      loadData();
      const channel = supabase.channel('kitchen-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData()).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [profile]);

  const loadData = async () => {
    const [ordersRes, tablesRes, roomsRes] = await Promise.all([
      supabase.from('orders').select('*').eq('org_id', profile?.org_id).in('status', ['pending', 'ready']).order('created_at', { ascending: true }),
      supabase.from('tables').select('id, table_number').eq('org_id', profile?.org_id),
      supabase.from('rooms').select('id, room_number').eq('org_id', profile?.org_id)
    ]);
    if (ordersRes.data) setOrders(ordersRes.data);
    if (tablesRes.data && roomsRes.data) setMetaData({ tables: tablesRes.data, rooms: roomsRes.data });
    setLoading(false);
  };

  // NEW LOGIC: Mark specific items as ready
  const handleItemReady = async (order: any, categories: string[]) => {
    // 1. Clone items
    const updatedItems = order.items.map((item: any) => {
      if (categories.includes(item.category) && item.status !== 'ready') {
        return { ...item, status: 'ready' };
      }
      return item;
    });

    // 2. Check if ALL items in the order are ready
    const allItemsReady = updatedItems.every((item: any) => item.status === 'ready');

    // 3. Update Order
    const { error } = await supabase
      .from('orders')
      .update({ 
        items: updatedItems, 
        // If all items are ready, set main status to ready. Otherwise keep pending.
        status: allItemsReady ? 'ready' : 'pending' 
      })
      .eq('id', order.id);

    if (error) toast.error('Update failed');
    else {
      toast.success('Marked as Ready!');
      loadData();
    }
  };

  const kitchenCategories = ['food'];
  const barCategories = ['bar', 'drinks', 'soft_drink', 'beer', 'cigarettes'];

  const hasAnyCategory = (order: any, categories: string[]) => order.items?.some((item: any) => categories.includes(item.category));
  
  // Filter orders that have AT LEAST ONE pending item for this station
  const kitchenOrders = useMemo(() => orders.filter(o => o.items?.some((i: any) => kitchenCategories.includes(i.category) && i.status !== 'ready')), [orders]);
  const barOrders = useMemo(() => orders.filter(o => o.items?.some((i: any) => barCategories.includes(i.category) && i.status !== 'ready')), [orders]);

  const getTableName = (id: string) => metaData.tables.find(t => t.id === id)?.table_number || id.slice(0,4);
  const getRoomName = (id: string) => metaData.rooms.find(r => r.id === id)?.room_number || id.slice(0,4);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['owner', 'admin', 'kitchen_master', 'barman']}>
      <div className="p-8 h-screen flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-orange-400">Kitchen / Bar Display</h1>
          <div className="text-sm text-gray-400 flex items-center gap-2"><Clock size={16} /> Live</div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
          
          {/* KITCHEN COLUMN */}
          <div className="flex flex-col bg-gray-900 rounded-xl p-4 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 border-b border-gray-700 pb-3">
              <div className="p-2 bg-orange-900 rounded"><UtensilsCrossed className="text-orange-400" size={20} /></div>
              <h2 className="text-xl font-bold">Kitchen Orders</h2>
              <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">{kitchenOrders.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {kitchenOrders.length === 0 ? (<div className="text-center text-gray-500 mt-10">No food orders pending</div>) : (
                kitchenOrders.map((order) => (
                  <OrderCard key={order.id} order={order} categories={kitchenCategories} label={order.table_id ? `Table ${getTableName(order.table_id)}` : `Room ${getRoomName(order.room_id)}`} onUpdate={handleItemReady} />
                ))
              )}
            </div>
          </div>

          {/* BAR COLUMN */}
          <div className="flex flex-col bg-gray-900 rounded-xl p-4 overflow-hidden border-l border-gray-700">
            <div className="flex items-center gap-3 mb-4 border-b border-gray-700 pb-3">
              <div className="p-2 bg-blue-900 rounded"><Beer className="text-blue-400" size={20} /></div>
              <h2 className="text-xl font-bold">Bar Orders</h2>
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{barOrders.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {barOrders.length === 0 ? (<div className="text-center text-gray-500 mt-10">No drink orders pending</div>) : (
                barOrders.map((order) => (
                  <OrderCard key={order.id} order={order} categories={barCategories} label={order.table_id ? `Table ${getTableName(order.table_id)}` : `Room ${getRoomName(order.room_id)}`} onUpdate={handleItemReady} />
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </PermissionGate>
  );
}

// SUB-COMPONENT
function OrderCard({ order, categories, label, onUpdate }: { order: any, categories: string[], label: string, onUpdate: (order: any, categories: string[]) => void }) {
  // Filter items for this station that are NOT ready yet
  const pendingItems = order.items?.filter((item: any) => categories.includes(item.category) && item.status !== 'ready');

  if (!pendingItems || pendingItems.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="font-bold text-lg text-orange-300">{label}</h3>
          <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</p>
        </div>
        <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-600 text-white">PENDING</span>
      </div>

      <div className="space-y-2 mb-4">
        {pendingItems.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm">
            <span className="font-bold text-orange-400">{item.quantity}x</span>
            <span className="flex-1 ml-3">{item.name}</span>
          </div>
        ))}
      </div>

      <button onClick={() => onUpdate(order, categories)} className="w-full py-2 bg-green-600 text-white rounded font-bold text-sm hover:bg-green-500 flex items-center justify-center gap-2">
        <CheckCircle size={16} /> Mark Ready
      </button>
    </div>
  );
}