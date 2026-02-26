 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, Utensils, DollarSign, ShoppingBag, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ tables: 0, items: 0, sales: 0, staff: 1 });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchData(profile.org_id);
  }, [profile]);

  const fetchData = async (orgId: string) => {
    setLoading(true);
    
    // 1. Count Tables
    const { count: tablesCount } = await supabase
      .from('tables')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    // 2. Count Menu Items
    const { count: itemsCount } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    // 3. Calculate Sales
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total_price')
      .eq('org_id', orgId);
    
    const totalSales = ordersData?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;

    // 4. Fetch Low Stock Items (Stock <= Threshold)
    const { data: items } = await supabase
      .from('menu_items')
      .select('id, name, emoji, stock_quantity, low_stock_threshold')
      .eq('org_id', orgId);

    const lowItems = (items || []).filter(item => 
        item.stock_quantity <= (item.low_stock_threshold || 10)
    );

    setStats({
      tables: tablesCount || 0,
      items: itemsCount || 0,
      sales: totalSales,
      staff: 1, 
    });
    
    setLowStockItems(lowItems);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
      <p className="text-gray-400 mb-8">Welcome back!</p>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <Link href="/admin/pos" className="block bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500">
          <p className="text-gray-400 text-sm">Total Tables</p>
          <p className="text-3xl font-bold mt-1">{stats.tables}</p>
        </Link>

        <Link href="/admin/menu" className="block bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500">
          <p className="text-gray-400 text-sm">Menu Items</p>
          <p className="text-3xl font-bold mt-1">{stats.items}</p>
        </Link>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Total Sales</p>
          <p className="text-3xl font-bold mt-1 text-orange-400">KES {stats.sales.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Staff</p>
          <p className="text-3xl font-bold mt-1">{stats.staff}</p>
        </div>

      </div>

      {/* Low Stock Alert Section */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-900/20 border border-red-500 p-6 rounded-xl mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-red-400">Low Stock Alert ({lowStockItems.length})</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-gray-800 p-3 rounded border border-gray-700 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-bold">{item.emoji} {item.name}</span>
                  <span className="text-red-400 font-mono">{item.stock_quantity}</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">Min: {item.low_stock_threshold || 10}</p>
              </div>
            ))}
          </div>
          
          <Link href="/admin/menu" className="mt-4 inline-block text-sm text-white underline hover:text-orange-400">
            Manage Inventory →
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/admin/pos" className="p-4 bg-gray-700 hover:bg-gray-600 rounded text-center">Open POS</Link>
          <Link href="/admin/menu" className="p-4 bg-gray-700 hover:bg-gray-600 rounded text-center">Menu</Link>
          <Link href="/admin/kitchen" className="p-4 bg-gray-700 hover:bg-gray-600 rounded text-center">Kitchen</Link>
          <Link href="/admin/settings" className="p-4 bg-gray-700 hover:bg-gray-600 rounded text-center">Settings</Link>
        </div>
      </div>

    </div>
  );
}