'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KitchenPage() {
  const { profile, organization } = useAuth();
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
      .eq('status', 'pending') // Only show pending orders
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
      // Refresh list
      if (profile?.org_id) fetchOrders(profile.org_id);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Kitchen Display</h1>
      <p className="text-gray-400 mb-8">Orders waiting to be prepared.</p>

      {orders.length === 0 && (
        <div className="text-center text-gray-500 mt-20">
          <p>No pending orders.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-orange-400">
                Table {order.tables?.table_number || 'N/A'}
              </h3>
              <span className="text-xs text-gray-500">
                {new Date(order.created_at).toLocaleTimeString()}
              </span>
            </div>

            <ul className="space-y-2 mb-6">
              {order.items.map((item: any, idx: number) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="text-gray-400">{item.emoji}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleComplete(order.id)}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} /> Complete Order
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}