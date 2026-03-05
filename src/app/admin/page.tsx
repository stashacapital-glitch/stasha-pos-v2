 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, DollarSign, BedDouble, CookingPot, Users, Utensils, Home, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [todaysSales, setTodaysSales] = useState(0);
  const [occupancy, setOccupancy] = useState({ occupied: 0, total: 0 });
  const [activeOrders, setActiveOrders] = useState(0);
  const [guestsCount, setGuestsCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  
  // State for Chart Data
  const [salesHistory, setSalesHistory] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchStats();
      setupRealtime();
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!profile?.org_id) return;
    
    const today = new Date().toISOString().split('T')[0]; 

    // 1. Today's Sales
    const { data: salesData } = await supabase
      .from('orders')
      .select('total_price, paid_at')
      .eq('org_id', profile.org_id)
      .eq('status', 'paid')
      .gte('paid_at', `${today}T00:00:00`)
      .lte('paid_at', `${today}T23:59:59`);
    
    const total = salesData?.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
    setTodaysSales(total);

    // 2. Room Occupancy
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('org_id', profile.org_id);
    
    const occupied = roomsData?.filter((r: any) => r.status === 'occupied').length || 0;
    setOccupancy({ occupied, total: roomsData?.length || 0 });

    // 3. Active Orders (Kitchen Load)
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', profile.org_id)
      .in('status', ['pending', 'preparing', 'ready']);
    
    setActiveOrders(count || 0);

    // 4. Total Guests
    const { count: guestCount } = await supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', profile.org_id);
    
    setGuestsCount(guestCount || 0);

    // 5. Recent Activity
    const { data: recent } = await supabase
      .from('orders')
      .select('id, created_at, total_price, status, guests(full_name), rooms(room_number)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    setRecentOrders(recent || []);

    // 6. Fetch Sales History (Last 7 Days)
    await fetchSalesHistory();

    setLoading(false);
  };

  const fetchSalesHistory = async () => {
    // Get date 7 days ago
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    // Fetch all paid orders from the last 7 days
    const startDate = days[0];
    const { data, error } = await supabase
      .from('orders')
      .select('total_price, paid_at')
      .eq('org_id', profile?.org_id)
      .eq('status', 'paid')
      .gte('paid_at', `${startDate}T00:00:00`);

    if (error) {
      console.error("Chart error:", error);
      return;
    }

    // Process data: Group by date
    const groupedData = days.map(date => {
      const dayTotal = data?.filter((o: any) => o.paid_at?.startsWith(date)).reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
      
      // Format date for display (e.g., "Mon", "Tue")
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      return { 
        name: dayName, 
        date: date, 
        sales: dayTotal 
      };
    });

    setSalesHistory(groupedData);
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900"><Loader2 className="animate-spin text-orange-400" size={48} /></div>;

  return (
    <div className="p-6 md:p-8 bg-gray-900 min-h-screen">
      
      {/* CENTERED TITLE */}
      <h1 className="text-3xl font-bold text-white mb-8 text-center">Dashboard</h1>

      {/* TOP STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Sales Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center justify-center text-center">
          <DollarSign className="text-green-400 mb-2" size={32} />
          <p className="text-gray-400 text-sm">Today Sales</p>
          <p className="text-3xl font-bold text-white mt-1">KES {formatMoney(todaysSales)}</p>
        </div>

        {/* Occupancy Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center justify-center text-center">
          <BedDouble className="text-purple-400 mb-2" size={32} />
          <p className="text-gray-400 text-sm">Room Occupancy</p>
          <p className="text-3xl font-bold text-white mt-1">{occupancy.occupied} / {occupancy.total}</p>
          <div className="w-full bg-gray-700 h-1 rounded mt-3">
            <div className="bg-purple-500 h-1 rounded" style={{ width: `${occupancy.total > 0 ? (occupancy.occupied / occupancy.total) * 100 : 0}%` }}></div>
          </div>
        </div>

        {/* Kitchen Load Card */}
        <Link href="/admin/kds" className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center justify-center text-center hover:border-orange-500 transition cursor-pointer">
          <CookingPot className="text-orange-400 mb-2" size={32} />
          <p className="text-gray-400 text-sm">Active Orders</p>
          <p className="text-3xl font-bold text-white mt-1">{activeOrders}</p>
          <p className="text-xs text-orange-400 mt-2">View Kitchen &rarr;</p>
        </Link>

        {/* Guests Card */}
        <Link href="/admin/settings/guests" className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center justify-center text-center hover:border-blue-500 transition cursor-pointer">
          <Users className="text-blue-400 mb-2" size={32} />
          <p className="text-gray-400 text-sm">Total Guests</p>
          <p className="text-3xl font-bold text-white mt-1">{guestsCount}</p>
          <p className="text-xs text-blue-400 mt-2">Manage &rarr;</p>
        </Link>

      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: Chart & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Actions */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/admin/orders/new" className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-lg flex flex-col items-center justify-center gap-2 transition">
                <Utensils size={20} /> New Order
              </Link>
              <Link href="/admin/rooms" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-lg flex flex-col items-center justify-center gap-2 transition">
                <Home size={20} /> Rooms
              </Link>
              <Link href="/admin/kds" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg flex flex-col items-center justify-center gap-2 transition">
                <CookingPot size={20} /> Kitchen
              </Link>
              <Link href="/admin/reports" className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-lg flex flex-col items-center justify-center gap-2 transition">
                <TrendingUp size={20} /> Reports
              </Link>
            </div>
          </div>

          {/* Sales Chart */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-80">
            <h3 className="text-lg font-bold text-white mb-4">Sales (Last 7 Days)</h3>
            {salesHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={salesHistory}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `K${value / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#f97316' }}
                    formatter={(value: any) => [`KES ${formatMoney(value)}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#f97316" fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
            )}
          </div>
        </div>

        {/* RIGHT: Recent Activity */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No recent orders</p>
            ) : (
              recentOrders.map((order: any) => (
                <div key={order.id} className="border-b border-gray-700 pb-2 last:border-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {order.guests?.full_name || 'Guest'}
                        {order.rooms && <span className="text-purple-400 text-xs ml-1">(Rm {order.rooms.room_number})</span>}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-mono text-sm">KES {formatMoney(order.total_price)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        order.status === 'paid' ? 'bg-green-800 text-green-300' : 
                        order.status === 'pending' ? 'bg-yellow-800 text-yellow-300' : 
                        'bg-gray-600 text-gray-300'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}