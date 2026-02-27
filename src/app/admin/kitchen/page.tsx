 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, Beer, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KitchenPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchOrders(profile.org_id);
    }
  }, [profile]);

  const fetchOrders = async (orgId: string) => {
    setLoading(true);
    
    // We still fetch orders, but we will filter them in the UI based on the new columns
    const { data } = await supabase
      .from('orders')
      .select('*, tables(table_number)')
      .eq('org_id', orgId)
      .in('status', ['pending', 'ready']) // Main order must be active
      .order('created_at', { ascending: true });
    
    setOrders(data || []);
    setLoading(false);
  };

  // FIX: Update ONLY the Kitchen Status
  const handleKitchenReady = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ kitchen_status: 'ready' }) 
      .eq('id', orderId);

    if (!error) {
      toast.success('Kitchen marked Ready!');
      fetchOrders(profile?.org_id);
    } else {
      toast.error("Error updating");
    }
  };

  // FIX: Update ONLY the Bar Status
  const handleBarReady = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ bar_status: 'ready' }) 
      .eq('id', orderId);

    if (!error) {
      toast.success('Bar marked Ready!');
      fetchOrders(profile?.org_id);
    } else {
      toast.error("Error updating");
    }
  };

  // Helper to filter items
  const getItemsByType = (items: any[], isKitchen: boolean) => {
    return items.filter(item => item.is_kitchen_item === isKitchen);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Kitchen & Bar Display</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* BAR STATION */}
        <div className="bg-gray-800 p-4 rounded-xl border border-yellow-500">
          <div className="flex items-center gap-2 border-b border-gray-700 pb-3 mb-4">
            <Beer className="text-yellow-400" size={24} />
            <h2 className="text-xl font-bold text-yellow-400">Bar Station</h2>
          </div>

          {orders.map(order => {
            const barItems = getItemsByType(order.items, false); // isKitchen=false
            if (barItems.length === 0) return null; // Skip if no bar items

            // Check status from the NEW column
            const isReady = order.bar_status === 'ready';

            return (
              <div key={order.id} className={`p-4 rounded mb-4 border-l-4 ${isReady ? 'bg-green-900/30 border-green-500' : 'bg-gray-700 border-transparent'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">Table {order.tables?.table_number}</span>
                  <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                </div>
                
                <ul className="space-y-1 mb-3 text-sm">
                  {barItems.map((item: any, idx: number) => (
                    <li key={idx} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>{item.emoji}</span>
                    </li>
                  ))}
                </ul>

                {!isReady ? (
                  <button 
                    onClick={() => handleBarReady(order.id)} 
                    className="w-full bg-yellow-500 text-black font-bold py-1 rounded text-sm hover:bg-yellow-400"
                  >
                    Mark Ready
                  </button>
                ) : (
                  <div className="text-center text-green-400 font-bold text-sm animate-pulse">
                    READY FOR PICKUP
                  </div>
                )}
              </div>
            );
          })}
          {orders.every(o => getItemsByType(o.items, false).length === 0) && (
            <p className="text-gray-500 text-center py-8">No bar orders</p>
          )}
        </div>

        {/* KITCHEN STATION */}
        <div className="bg-gray-800 p-4 rounded-xl border border-orange-500">
          <div className="flex items-center gap-2 border-b border-gray-700 pb-3 mb-4">
            <ChefHat className="text-orange-400" size={24} />
            <h2 className="text-xl font-bold text-orange-400">Kitchen Station</h2>
          </div>

          {orders.map(order => {
            const kitchenItems = getItemsByType(order.items, true); // isKitchen=true
            if (kitchenItems.length === 0) return null;

            // Check status from the NEW column
            const isReady = order.kitchen_status === 'ready';

            return (
              <div key={order.id} className={`p-4 rounded mb-4 border-l-4 ${isReady ? 'bg-green-900/30 border-green-500' : 'bg-gray-700 border-transparent'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">Table {order.tables?.table_number}</span>
                  <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                </div>
                
                <ul className="space-y-1 mb-3 text-sm">
                  {kitchenItems.map((item: any, idx: number) => (
                    <li key={idx} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>{item.emoji}</span>
                    </li>
                  ))}
                </ul>

                {!isReady ? (
                  <button 
                    onClick={() => handleKitchenReady(order.id)} 
                    className="w-full bg-orange-500 text-black font-bold py-1 rounded text-sm hover:bg-orange-400"
                  >
                    Mark Ready
                  </button>
                ) : (
                  <div className="text-center text-green-400 font-bold text-sm animate-pulse">
                    READY FOR PICKUP
                  </div>
                )}
              </div>
            );
          })}
          {orders.every(o => getItemsByType(o.items, true).length === 0) && (
            <p className="text-gray-500 text-center py-8">No kitchen orders</p>
          )}
        </div>

      </div>
    </div>
  );
}