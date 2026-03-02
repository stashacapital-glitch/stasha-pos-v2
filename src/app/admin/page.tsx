 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate';
import { Loader2, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, orders: 0, staff: 0, items: 0 });

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    setLoading(true);
    const orgId = profile?.org_id;
    const today = new Date().toISOString().split('T')[0];

    // Fetch basic counts (optimized for speed)
    const [
      { count: orderCount },
      { data: orders },
      { count: staffCount },
      { count: itemCount }
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', `${today}T00:00:00`),
      supabase.from('orders').select('total_price').eq('org_id', orgId).gte('created_at', `${today}T00:00:00`),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
    ]);

    const totalRevenue = orders?.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;

    setStats({
      revenue: totalRevenue,
      orders: orderCount || 0,
      staff: staffCount || 0,
      items: itemCount || 0
    });
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['owner', 'admin']}>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-orange-400 mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-8">Welcome back! Here is your overview for today.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Today's Revenue</p>
              <DollarSign className="text-green-400" />
            </div>
            <h2 className="text-3xl font-bold mt-2">KES {formatCurrency(stats.revenue)}</h2>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Today's Orders</p>
              <ShoppingCart className="text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold mt-2">{stats.orders}</h2>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Total Staff</p>
              <Users className="text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold mt-2">{stats.staff}</h2>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Menu Items</p>
              <Package className="text-orange-400" />
            </div>
            <h2 className="text-3xl font-bold mt-2">{stats.items}</h2>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold mb-2">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
             <a href="/admin/pos" className="block p-4 bg-orange-500 text-black rounded font-bold text-center hover:bg-orange-400">Open POS</a>
             <a href="/admin/menu" className="block p-4 bg-gray-700 text-white rounded font-bold text-center hover:bg-gray-600">Manage Menu</a>
             <a href="/admin/settings/team" className="block p-4 bg-gray-700 text-white rounded font-bold text-center hover:bg-gray-600">Add Staff</a>
             <a href="/admin/reports" className="block p-4 bg-gray-700 text-white rounded font-bold text-center hover:bg-gray-600">View Reports</a>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}