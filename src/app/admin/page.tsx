 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, DollarSign, BedDouble, CookingPot, Users, Utensils, Home, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Stats State
  const [todaysSales, setTodaysSales] = useState(0);
  const [occupancy, setOccupancy] = useState({ occupied: 0, total: 0 });
  const [activeOrders, setActiveOrders] = useState(0);
  const [guestsCount, setGuestsCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

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
      .select('total_price')
      .eq('org_id', profile.org_id)
      .eq('status', 'paid')
      .gte('paid_at', `${today}T00:00:00`)
      .lte('paid_at', `${today}T23:59:59`);
    
    // FIX: Added explicit types
    const total = salesData?.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
    setTodaysSales(total);

    // 2. Room Occupancy
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('org_id', profile.org_id);
    
    // FIX: Added explicit types
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

    setLoading(false);
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900"><Loader2 className="animate-spin text-orange-400" size={48} /></div>;

  return (
    <div className="p-6 md:p-8 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

      {/* TOP STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Sales Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-green-900/50 rounded-lg">
            <DollarSign className="text-green-400" size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Today Sales</p>
            <p className="text-2xl font-bold text-white">KES {todaysSales.toLocaleString()}</p>
          </div>
        </div>

        {/* Occupancy Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-purple-900/50 rounded-lg">
            <BedDouble className="text-purple-400" size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Room Occupancy</p>
            <p className="text-2xl font-bold text-white">{occupancy.occupied} / {occupancy.total}</p>
            <div className="w-full bg-gray-700 h-1 rounded mt-2">
              <div className="bg-purple-500 h-1 rounded" style={{ width: `${occupancy.total > 0 ? (occupancy.occupied / occupancy.total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* Kitchen Load Card */}
        <Link href="/admin/kds" className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center gap-4 hover:border-orange-500 transition cursor-pointer">
          <div className="p-3 bg-orange-900/50 rounded-lg">
            <CookingPot className="text-orange-400" size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Active Orders</p>
            <p className="text-2xl font-bold text-white">{activeOrders}</p>
            <p className="text-xs text-orange-400 mt-1">View Kitchen</p>
          </div>
        </Link>

        {/* Guests Card */}
        <Link href="/admin/settings/guests" className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center gap-4 hover:border-blue-500 transition cursor-pointer">
          <div className="p-3 bg-blue-900/50 rounded-lg">
            <Users className="text-blue-400" size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Guests</p>
            <p className="text-2xl font-bold text-white">{guestsCount}</p>
            <p className="text-xs text-blue-400 mt-1">Manage</p>
          </div>
        </Link>

      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          
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

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-64 flex items-center justify-center">
             <div className="text-center text-gray-500">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-20"/>
                <p>Sales Charts (Coming Soon)</p>
             </div>
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
                      <p className="text-orange-400 font-mono text-sm">KES {order.total_price}</p>
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