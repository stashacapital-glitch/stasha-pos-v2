 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, DollarSign, BedDouble, CookingPot, Users, Utensils, Home, TrendingUp, TrendingDown, CalendarDays, Infinity, Play, Square } from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Today's Stats
  const [todaysSales, setTodaysSales] = useState(0);
  const [todaysExpenses, setTodaysExpenses] = useState(0);
  
  // Life-to-Date Stats (All Time)
  const [totalSalesLife, setTotalSalesLife] = useState(0);
  const [totalExpensesLife, setTotalExpensesLife] = useState(0);

  const [occupancy, setOccupancy] = useState({ occupied: 0, total: 0 });
  const [activeOrders, setActiveOrders] = useState(0);
  const [guestsCount, setGuestsCount] = useState(0); // FIX: Added missing state
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);

  // Shift State
  const [isOnShift, setIsOnShift] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      if (profile.is_on_shift !== undefined) setIsOnShift(profile.is_on_shift);
      if (profile.is_on_shift || profile.role === 'admin') {
        fetchStats();
        setupRealtime();
      } else {
        setLoading(false);
      }
    }
  }, [profile]);

  const handleStartShift = async () => {
    setShiftLoading(true);
    const { error } = await supabase.from('staff').update({ is_on_shift: true, shift_start_time: new Date().toISOString() }).eq('auth_id', profile?.id);
    if (error) toast.error("Could not start shift");
    else { setIsOnShift(true); toast.success("Shift Started!"); fetchStats(); }
    setShiftLoading(false);
  };

  const handleEndShift = async () => {
    if(!confirm("End your shift? You will be logged out.")) return;
    setShiftLoading(true);
    await supabase.from('staff').update({ is_on_shift: false }).eq('auth_id', profile?.id);
    toast.success("Shift Ended. Goodbye!");
    await supabase.auth.signOut();
    setShiftLoading(false);
  };

  const fetchStats = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // 1. TODAY'S FIGURES
    const { data: salesTodayData } = await supabase.from('orders').select('total_price').eq('org_id', profile.org_id).eq('status', 'paid').gte('paid_at', todayStart);
    const salesTodayTotal = salesTodayData?.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
    setTodaysSales(salesTodayTotal);

    const { data: expTodayData } = await supabase.from('expenses').select('amount').eq('org_id', profile.org_id).gte('created_at', todayStart);
    const expTodayTotal = expTodayData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    setTodaysExpenses(expTodayTotal);

    // 2. LIFE-TO-DATE FIGURES (ALL TIME)
    const { data: salesAllData } = await supabase.from('orders').select('total_price').eq('org_id', profile.org_id).eq('status', 'paid');
    const salesAllTotal = salesAllData?.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
    setTotalSalesLife(salesAllTotal);

    const { data: expAllData } = await supabase.from('expenses').select('amount').eq('org_id', profile.org_id);
    const expAllTotal = expAllData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    setTotalExpensesLife(expAllTotal);

    // 3. OTHER STATS
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
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split('T')[0]); }
    const startDate = days[0];
    const { data } = await supabase.from('orders').select('total_price, paid_at').eq('org_id', profile?.org_id).eq('status', 'paid').gte('paid_at', `${startDate}T00:00:00`);
    if (data) {
      const groupedData = days.map(date => {
        const dayTotal = data.filter((o: any) => o.paid_at?.startsWith(date)).reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
        return { name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }), sales: dayTotal };
      });
      setSalesHistory(groupedData);
    }
  };

  const setupRealtime = () => {
    const channel = supabase.channel('dashboard-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchStats()).on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchStats()).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const formatMoney = (amount: number) => amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading && !isOnShift) return <div className="flex items-center justify-center h-screen bg-gray-900"><Loader2 className="animate-spin text-orange-400" size={48} /></div>;

  if (!isOnShift) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-xl max-w-sm">
          <div className="p-4 bg-orange-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4"><Play className="text-orange-400" size={40} /></div>
          <h1 className="text-2xl font-bold text-white mb-2">Ready to Work?</h1>
          <p className="text-gray-400 mb-6">You must start your shift to access the POS system.</p>
          <button onClick={handleStartShift} disabled={shiftLoading} className="w-full py-3 bg-orange-500 text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-orange-400 transition disabled:opacity-50">
            {shiftLoading ? <Loader2 className="animate-spin" /> : <><Play size={20} /> Start Shift</>}
          </button>
        </div>
      </div>
    );
  }

  const netToday = todaysSales - todaysExpenses;
  const netLife = totalSalesLife - totalExpensesLife;

  return (
    <div className="p-6 md:p-8 bg-gray-900 min-h-screen">
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white text-center flex-1">Dashboard</h1>
        <button onClick={handleEndShift} disabled={shiftLoading} className="bg-red-900 text-red-200 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-red-800 border border-red-700 disabled:opacity-50"><Square size={14} /> End Shift</button>
      </div>

      {/* ROW 1: TODAY'S SNAPSHOT */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-400 mb-3 flex items-center gap-2"><CalendarDays size={18} /> Today's Performance</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center">
            <TrendingUp className="text-green-400 mb-1" size={24} />
            <p className="text-gray-500 text-xs">Sales</p>
            <p className="text-xl font-bold text-white">KES {formatMoney(todaysSales)}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center">
            <TrendingDown className="text-red-400 mb-1" size={24} />
            <p className="text-gray-500 text-xs">Expenses</p>
            <p className="text-xl font-bold text-white">KES {formatMoney(todaysExpenses)}</p>
          </div>
          <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${netToday >= 0 ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
            <DollarSign className={`mb-1 ${netToday >= 0 ? 'text-green-300' : 'text-red-300'}`} size={24} />
            <p className={`text-xs ${netToday >= 0 ? 'text-green-300' : 'text-red-300'}`}>Net Profit</p>
            <p className={`text-xl font-bold ${netToday >= 0 ? 'text-green-400' : 'text-red-400'}`}>KES {formatMoney(Math.abs(netToday))}</p>
          </div>
        </div>
      </div>

      {/* ROW 2: LIFE TO DATE */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-400 mb-3 flex items-center gap-2"><Infinity size={18} /> Life to Date (All Time)</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center">
            <p className="text-gray-500 text-xs">Total Sales</p>
            <p className="text-xl font-bold text-white">KES {formatMoney(totalSalesLife)}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center">
            <p className="text-gray-500 text-xs">Total Expenses</p>
            <p className="text-xl font-bold text-white">KES {formatMoney(totalExpensesLife)}</p>
          </div>
          <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${netLife >= 0 ? 'bg-blue-900/30 border-blue-700' : 'bg-red-900/30 border-red-700'}`}>
            <p className={`text-xs ${netLife >= 0 ? 'text-blue-300' : 'text-red-300'}`}>Net Profit/Loss</p>
            <p className={`text-xl font-bold ${netLife >= 0 ? 'text-blue-400' : 'text-red-400'}`}>KES {formatMoney(Math.abs(netLife))}</p>
          </div>
        </div>
      </div>

      {/* OTHER STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center">
          <BedDouble className="text-purple-400 mb-1" size={20} /><p className="text-gray-500 text-xs">Rooms</p><p className="text-xl font-bold text-white">{occupancy.occupied} / {occupancy.total}</p>
        </div>
        <Link href="/admin/kds" className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center hover:border-orange-500 cursor-pointer">
          <CookingPot className="text-orange-400 mb-1" size={20} /><p className="text-gray-500 text-xs">Kitchen</p><p className="text-xl font-bold text-white">{activeOrders}</p>
        </Link>
        <Link href="/admin/settings/guests" className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center hover:border-blue-500 cursor-pointer col-span-2">
          <Users className="text-blue-400 mb-1" size={20} /><p className="text-gray-500 text-xs">Total Guests</p><p className="text-xl font-bold text-white">{guestsCount}</p>
        </Link>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-4 gap-4">
              <Link href="/admin/pos" className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-lg flex flex-col items-center justify-center gap-2 transition"><Utensils size={20} /> POS</Link>
              <Link href="/admin/rooms" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-lg flex flex-col items-center justify-center gap-2 transition"><Home size={20} /> Rooms</Link>
              <Link href="/admin/kds" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg flex flex-col items-center justify-center gap-2 transition"><CookingPot size={20} /> Kitchen</Link>
              <Link href="/admin/reports" className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-lg flex flex-col items-center justify-center gap-2 transition"><TrendingUp size={20} /> Reports</Link>
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 min-h-[300px]">
            <h3 className="text-lg font-bold text-white mb-4">Sales (Last 7 Days)</h3>
            {salesHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={salesHistory}>
                  <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `K${v/1000}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} formatter={(v: any) => [`KES ${formatMoney(v)}`, 'Sales']}/>
                  <Area type="monotone" dataKey="sales" stroke="#f97316" fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : ( <div className="h-full flex items-center justify-center text-gray-500">Loading...</div> )}
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
          <h3 className="text-lg font-bold text-white mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.length === 0 ? ( <p className="text-gray-500 text-sm text-center py-4">No recent orders</p> ) : (
              recentOrders.map((o: any) => (
                <div key={o.id} className="border-b border-gray-700 pb-2 last:border-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white text-sm font-medium">{o.guests?.full_name || 'Guest'} {o.rooms && <span className="text-purple-400 text-xs">(Rm {o.rooms.room_number})</span>}</p>
                      <p className="text-gray-500 text-xs">{new Date(o.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-mono text-sm">KES {formatMoney(o.total_price)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${o.status === 'paid' ? 'bg-green-800 text-green-300' : 'bg-yellow-800 text-yellow-300'}`}>{o.status}</span>
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