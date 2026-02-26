'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, DollarSign, ShoppingBag, TrendingUp, Coffee } from 'lucide-react';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    cashSales: 0,
    mpesaSales: 0,
    cardSales: 0,
  });
  const [topItems, setTopItems] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchData(profile.org_id);
  }, [profile]);

  const fetchData = async (orgId: string) => {
    setLoading(true);

    // 1. Fetch Paid Orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (orders) {
      // Calculate Totals
      const totalSales = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
      const cashSales = orders.filter(o => o.payment_method === 'Cash').reduce((sum, o) => sum + (o.total_price || 0), 0);
      const mpesaSales = orders.filter(o => o.payment_method === 'M-Pesa').reduce((sum, o) => sum + (o.total_price || 0), 0);
      const cardSales = orders.filter(o => o.payment_method === 'Card').reduce((sum, o) => sum + (o.total_price || 0), 0);

      setStats({
        totalSales,
        totalOrders: orders.length,
        cashSales,
        mpesaSales,
        cardSales,
      });

      // Process Recent Orders
      setRecentOrders(orders.slice(0, 10));

      // Process Top Items
      const itemCounts: Record<string, { name: string; emoji: string; count: number }> = {};
      orders.forEach(order => {
        order.items.forEach((item: any) => {
          if (!itemCounts[item.id]) {
            itemCounts[item.id] = { name: item.name, emoji: item.emoji || '🍽️', count: 0 };
          }
          itemCounts[item.id].count += item.quantity;
        });
      });
      
      const sortedItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5);
      setTopItems(sortedItems);
    }

    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Sales Reports</h1>
      <p className="text-gray-400 mb-8">Overview of your business performance.</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold mt-1 text-green-400">KES {stats.totalSales.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg"><DollarSign className="text-green-400" size={24} /></div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Orders</p>
              <p className="text-3xl font-bold mt-1">{stats.totalOrders}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg"><ShoppingBag className="text-blue-400" size={24} /></div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Average Order</p>
              <p className="text-3xl font-bold mt-1">KES {stats.totalOrders > 0 ? Math.round(stats.totalSales / stats.totalOrders).toLocaleString() : 0}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg"><TrendingUp className="text-purple-400" size={24} /></div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Best Seller</p>
              <p className="text-xl font-bold mt-1">{topItems[0]?.name || 'N/A'}</p>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-lg"><Coffee className="text-orange-400" size={24} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Payment Breakdown */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Payment Methods</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Cash</span>
                <span>KES {stats.cashSales.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${stats.totalSales > 0 ? (stats.cashSales / stats.totalSales) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>M-Pesa</span>
                <span>KES {stats.mpesaSales.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${stats.totalSales > 0 ? (stats.mpesaSales / stats.totalSales) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Card</span>
                <span>KES {stats.cardSales.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${stats.totalSales > 0 ? (stats.cardSales / stats.totalSales) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: Top Sellers */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Top Selling Items</h2>
          <div className="space-y-2">
            {topItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-gray-700 p-2 rounded">
                <span className="text-xl">{item.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.count} sold</p>
                </div>
                <span className="text-orange-400 font-bold">#{idx + 1}</span>
              </div>
            ))}
            {topItems.length === 0 && <p className="text-gray-500 text-center">No data yet</p>}
          </div>
        </div>

        {/* Right: Recent Transactions */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentOrders.map(order => (
              <div key={order.id} className="bg-gray-700 p-3 rounded text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">{new Date(order.created_at).toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded ${order.payment_method === 'Cash' ? 'bg-green-600' : 'bg-purple-600'}`}>
                    {order.payment_method}
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{order.items.length} Items</span>
                  <span className="text-orange-400">KES {order.total_price}</span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && <p className="text-gray-500 text-center">No transactions</p>}
          </div>
        </div>

      </div>
    </div>
  );
}