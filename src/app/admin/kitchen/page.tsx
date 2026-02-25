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
    const { data } = await supabase
      .from('orders')
      .select('*, tables(table_number)')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    setOrders(data || []);
    setLoading(false);
  };

  const handleComplete = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);

    if (!error) {
      toast.success('Order Completed!');
      if (profile?.org_id) fetchOrders(profile.org_id);
    }
  };

  // Helper to split items
  const categorizeItems = (items: any[]) => {
    const bar = items.filter(item => item.categories?.name === 'Beverages');
    const kitchen = items.filter(item => item.categories?.name !== 'Beverages'); // Assuming everything else is food
    return { bar, kitchen };
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Kitchen & Bar Display</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Column 1: Bar Station (Drinks) */}
        <div className="bg-gray-800 p-4 rounded-xl border border-yellow-500">
          <div className="flex items-center gap-2 border-b border-gray-700 pb-3 mb-4">
            <Beer className="text-yellow-400" size={24} />
            <h2 className="text-xl font-bold text-yellow-400">Bar Station</h2>
          </div>

            {orders.map(order => {
                const { bar } = categorizeItems(order.items);
                if (bar.length === 0) return null; // Don't show order if no drinks

                return (
                    <div key={order.id} className="bg-gray-700 p-4 rounded mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-lg">Table {order.tables?.table_number || 'N/A'}</span>
                            <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                        </div>
                        <ul className="space-y-1 mb-3 text-sm">
                            {bar.map((item: any, idx: number) => (
                                <li key={idx} className="flex justify-between">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>{item.emoji}</span>
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => handleComplete(order.id)} className="w-full bg-yellow-500 text-black font-bold py-1 rounded text-sm">
                            Done
                        </button>
                    </div>
                );
            })}
        </div>

        {/* Column 2: Kitchen Station (Food) */}
        <div className="bg-gray-800 p-4 rounded-xl border border-orange-500">
            <div className="flex items-center gap-2 border-b border-gray-700 pb-3 mb-4">
                <ChefHat className="text-orange-400" size={24} />
                <h2 className="text-xl font-bold text-orange-400">Kitchen Station</h2>
            </div>

            {orders.map(order => {
                const { kitchen } = categorizeItems(order.items);
                if (kitchen.length === 0) return null; // Don't show order if no food

                return (
                    <div key={order.id} className="bg-gray-700 p-4 rounded mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-lg">Table {order.tables?.table_number || 'N/A'}</span>
                            <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                        </div>
                        <ul className="space-y-1 mb-3 text-sm">
                            {kitchen.map((item: any, idx: number) => (
                                <li key={idx} className="flex justify-between">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>{item.emoji}</span>
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => handleComplete(order.id)} className="w-full bg-orange-500 text-black font-bold py-1 rounded text-sm">
                            Done
                        </button>
                    </div>
                );
            })}
        </div>

      </div>
    </div>
  );
}