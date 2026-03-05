 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, DollarSign, BedDouble, CookingPot, Users, Utensils, Home, TrendingUp, Play, Square } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [todaysSales, setTodaysSales] = useState(0);
  const [occupancy, setOccupancy] = useState({ occupied: 0, total: 0 });
  const [activeOrders, setActiveOrders] = useState(0);
  const [guestsCount, setGuestsCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);

  // Shift State
  const [isOnShift, setIsOnShift] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      // Check shift status from AuthContext
      if (profile.is_on_shift !== undefined) {
        setIsOnShift(profile.is_on_shift);
      }
      
      // If on shift (or admin), load data
      if (profile.is_on_shift || profile.role === 'admin') {
        fetchStats();
        setupRealtime();
      } else {
        setLoading(false);
      }
    }
  }, [profile]);

  // 1. Start Shift
  const handleStartShift = async () => {
    setShiftLoading(true);
    const { error } = await supabase
      .from('staff')
      .update({ 
        is_on_shift: true, 
        shift_start_time: new Date().toISOString() 
      })
      .eq('auth_id', profile?.id);

    if (error) {
      toast.error("Could not start shift");
      console.error(error);
    } else {
      setIsOnShift(true);
      toast.success("Shift Started!");
      fetchStats(); // Load data now
    }
    setShiftLoading(false);
  };

  // 2. End Shift (Logout)
  const handleEndShift = async () => {
    if(!confirm("End your shift? You will be logged out.")) return;
    
    setShiftLoading(true);
    const { error } = await supabase
      .from('staff')
      .update({ is_on_shift: false })
      .eq('auth_id', profile?.id);

    if (error) toast.error("Error ending shift");
    else {
      toast.success("Shift Ended. Goodbye!");
      await supabase.auth.signOut();
    }
    setShiftLoading(false);
  };

  const fetchStats = async () => {
    if (!profile?.org_id) return;
    
    setLoading(true);
    const today = new Date().toISOString().split('T')[0]; 

    const { data: salesData } = await supabase.from('orders').select('total_price, paid_at').eq('org_id', profile.org_id).eq('status', 'paid').gte('paid_at', `${today}T00:00:00`).lte('paid_at', `${today}T23:59:59`);
    const total = salesData?.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
    setTodaysSales(total);

    const { data: roomsData } = await supabase.from('rooms').select('id, status').eq('org_id', profile.org_id);
    const occupied = roomsData?.filter((r: any) => r.status === 'occupied').length || 0;
    setOccupancy({ occupied, total: roomsData?.length || 0 });

    const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('org_id', profile.org_id).in('status', ['pending', 'preparing', 'ready']);
    setActiveOrders(count || 0);

    const { count: guestCount } = await supabase.from('guests').select('id', { count: 'exact', head: true }).eq('org_id', profile.org_id);
    setGuestsCount(guestCount || 0);

    const { data: recent } = await supabase.from('orders').select('id, created_at, total_price, status, guests(full_name), rooms(room_number)').eq('org_id', profile.org_id).order('created_at', { ascending: false }).limit(5);
    setRecentOrders(recent || []);

    await fetchSalesHistory();
    setLoading(false);
  };

  const fetchSalesHistory = async () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const startDate = days[0];
    const { data, error } = await supabase.from('orders').select('total_price, paid_at').eq('org_id', profile?.org_id).eq('status', 'paid').gte('paid_at', `${startDate}T00:00:00`);

    if (!error && data) {
      const groupedData = days.map(date => {
        const dayTotal = data.filter((o: any) => o.paid_at?.startsWith(date)).reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        return { name: dayName, date: date, sales: dayTotal };
      });
      setSalesHistory(groupedData);
    }
  };

  const setupRealtime = () => {
    const channel = supabase.channel('dashboard-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchStats()).on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchStats()).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const formatMoney = (amount: number) => amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // --- RENDER LOGIC ---

  // Loading state
  if (loading && !isOnShift) return <div className="flex items-center justify-center h-screen bg-gray-900"><Loader2 className="animate-spin text-orange-400" size={48} /></div>;

  // SHIFT GATE: If not on shift, show Start Shift screen
  if (!isOnShift) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-xl max-w-sm">
          <div className="p-4 bg-orange-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Play className="text-orange-400" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Ready to Work?</h1>
          <p className="text-gray-400 mb-6">You must start your shift to access the POS system.</p>
          <button 
            onClick={handleStartShift} 
            disabled={shiftLoading}
            className="w-full py-3 bg-orange-500 text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-orange-400 transition disabled:opacity-50"
          >
            {shiftLoading ? <Loader2 className="animate-spin" /> : <><Play size={20} /> Start Shift</>}
          </button>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="p-6 md:p-8 bg-gray-900 min-h-screen">
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white text-center flex-1">Dashboard</h1>
        
        {/* End Shift Button - Top Right */}
        <button 
          onClick={handleEndShift}
          disabled={shiftLoading}
          className="bg-red-900 text-red-200 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-red-800 border border-red-700 disabled:opacity-50"
        >
          <Square size={14} /> End Shift
        </button>
      </div>

      {/* TOP STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center justify-center text-center">
          <DollarSign className="text-green-400 mb-2" size={32} />
          <p className="text-gray-400 text-sm">Today Sales</p>
          <p className="text-3xl font-bold text-white mt-1">KES {formatMoney(todaysSales)}</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center justify-center text-center">
          <BedDouble className="text-purple-400 mb-2" size={32} />
          <p className="text-gray-400 text-sm">Room Occupancy</p>
          <p className="text-3xl font-bold text-white mt-1">{occupancy.occupied} / {occupancy.total}</p>
          <div className="w-full bg-gray-700 h-1 rounded mt-3">
            <div className="bg-purple-500 h-1 rounded" style={{ width: `${occupancy.total > 0 ? (occupancy.occupied / occupancy.total) * 100 : 0}%` }}></div>
          </div>
        </div>

        <Link href="/admin/kds" className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center justify-center text-center hover:border-orange-500 transition cursor-pointer">
          <CookingPot className="text-orange-400 mb-2" size={32} />
          <p className="text-gray-400 text-sm">Active Orders</p>
          <p className="text-3xl font-bold text-white mt-1">{activeOrders}</p>
          <p className="text-xs text-orange-400 mt-2">View Kitchen &rarr;</p>
        </Link>

        <Link href="/admin/settings/guests" className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center justify-center text-center hover:border-blue-500 transition cursor-pointer">
          <Users className="text-blue-400 mb-2" size={32} />
          <p className="text-gray-400 text-sm">Total Guests</p>
          <p className="text-3xl font-bold text-white mt-1">{guestsCount}</p>
          <p className="text-xs text-blue-400 mt-2">Manage &rarr;</p>
        </Link>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/admin/pos" className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-lg flex flex-col items-center justify-center gap-2 transition">
                <Utensils size={20} /> POS
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

          {/* Chart - Fixed min-height to prevent render warning */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 min-h-[320px]">
            <h3 className="text-lg font-bold text-white mb-4">Sales (Last 7 Days)</h3>
            {salesHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
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
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem' }} labelStyle={{ color: '#f97316' }} formatter={(value: any) => [`KES ${formatMoney(value)}`, 'Sales']}/>
                  <Area type="monotone" dataKey="sales" stroke="#f97316" fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : ( <div className="h-full flex items-center justify-center text-gray-500">Loading chart...</div> )}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentOrders.length === 0 ? ( <p className="text-gray-500 text-sm text-center py-4">No recent orders</p> ) : (
              recentOrders.map((order: any) => (
                <div key={order.id} className="border-b border-gray-700 pb-2 last:border-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {order.guests?.full_name || 'Guest'}
                        {order.rooms && <span className="text-purple-400 text-xs ml-1">(Rm {order.rooms.room_number})</span>}
                      </p>
                      <p className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-mono text-sm">KES {formatMoney(order.total_price)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${order.status === 'paid' ? 'bg-green-800 text-green-300' : 'bg-yellow-800 text-yellow-300'}`}>
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