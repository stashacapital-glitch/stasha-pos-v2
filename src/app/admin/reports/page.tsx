 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, DollarSign, ShoppingBag, TrendingDown, TrendingUp, CreditCard, Smartphone, Banknote, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

type Order = { id: string; total_price: number; payment_method: string | null; created_at: string; items: any[]; staff_id: string | null; staff: { full_name: string } | null; };
type Expense = { id: string; amount: number; category: string; created_at: string; };

export default function ReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  const supabase = createClient();

  useEffect(() => { if (profile?.org_id) fetchReportData(); }, [profile, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    const now = new Date(); let startDate = new Date();
    if (dateRange === 'today') startDate.setHours(0, 0, 0, 0);
    else if (dateRange === 'week') startDate.setDate(now.getDate() - 7);
    else startDate.setMonth(now.getMonth() - 1);

    const { data: orderData } = await supabase.from('orders').select('id, total_price, payment_method, created_at, items, staff_id, staff(id, full_name)').eq('org_id', profile?.org_id).eq('status', 'paid').gte('paid_at', startDate.toISOString()).order('paid_at', { ascending: false });
    const { data: expenseData } = await supabase.from('expenses').select('id, amount, category, created_at').eq('org_id', profile?.org_id).gte('created_at', startDate.toISOString()).order('created_at', { ascending: false });

    setOrders(orderData || []);
    setExpenses(expenseData || []);
    setLoading(false);
  };

  // Calculations
  const totalSales = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalOrders = orders.length;
  const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalSales - totalExpenses;

  const methodCounts = orders.reduce((acc, o) => { const m = o.payment_method || 'unknown'; acc[m] = (acc[m] || 0) + (o.total_price || 0); return acc; }, {} as Record<string, number>);

  // Staff Performance
  const staffPerf: Record<string, { name: string; sales: number; count: number }> = {};
  orders.forEach(o => {
    if (o.staff) {
      const id = o.staff_id;
      if (!staffPerf[id]) staffPerf[id] = { name: o.staff.full_name, sales: 0, count: 0 };
      staffPerf[id].sales += o.total_price;
      staffPerf[id].count++;
    }
  });
  const topStaff = Object.values(staffPerf).sort((a, b) => b.sales - a.sales);

  // Top Items
  const itemCounts: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach(order => { order.items?.forEach((item: any) => { if (!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, qty: 0, revenue: 0 }; itemCounts[item.name].qty += item.quantity; itemCounts[item.name].revenue += (item.price * item.quantity); }); });
  const topItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 5);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-6 md:p-8 bg-gray-900 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-white">Financial Report</h1>
        <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
          <button onClick={() => setDateRange('today')} className={`px-4 py-2 rounded text-sm font-medium transition ${dateRange === 'today' ? 'bg-orange-500 text-black' : 'text-gray-400 hover:bg-gray-700'}`}>Today</button>
          <button onClick={() => setDateRange('week')} className={`px-4 py-2 rounded text-sm font-medium transition ${dateRange === 'week' ? 'bg-orange-500 text-black' : 'text-gray-400 hover:bg-gray-700'}`}>7 Days</button>
          <button onClick={() => setDateRange('month')} className={`px-4 py-2 rounded text-sm font-medium transition ${dateRange === 'month' ? 'bg-orange-500 text-black' : 'text-gray-400 hover:bg-gray-700'}`}>Month</button>
        </div>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700"><p className="text-gray-400 text-sm flex items-center gap-2"><TrendingUp size={14} className="text-green-400"/> Total Sales</p><p className="text-3xl font-bold text-white mt-2">KES {totalSales.toLocaleString()}</p></div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700"><p className="text-gray-400 text-sm flex items-center gap-2"><TrendingDown size={14} className="text-red-400"/> Total Expenses</p><p className="text-3xl font-bold text-white mt-2">KES {totalExpenses.toLocaleString()}</p></div>
        <div className={`p-6 rounded-xl border ${netProfit >= 0 ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}><p className={`text-sm flex items-center gap-2 ${netProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}><DollarSign size={14}/> Net Profit</p><p className={`text-3xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>KES {Math.abs(netProfit).toLocaleString()}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Payment Breakdown */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Payment Methods</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Banknote className="text-green-400" size={20} /><span className="text-white">Cash</span></div><span className="font-mono text-white font-bold">KES {(methodCounts['cash'] || 0).toLocaleString()}</span></div>
            <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Smartphone className="text-purple-400" size={20} /><span className="text-white">M-Pesa</span></div><span className="font-mono text-white font-bold">KES {(methodCounts['mpesa'] || 0).toLocaleString()}</span></div>
            <div className="flex justify-between items-center"><div className="flex items-center gap-3"><CreditCard className="text-blue-400" size={20} /><span className="text-white">Card</span></div><span className="font-mono text-white font-bold">KES {(methodCounts['card'] || 0).toLocaleString()}</span></div>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Top Selling Items</h3>
          {topItems.length === 0 ? <p className="text-gray-500 text-center py-4">No data</p> : <div className="space-y-3">{topItems.map(item => <div key={item.name} className="flex justify-between items-center border-b border-gray-700 pb-2 last:border-0"><div><p className="text-white font-medium">{item.name}</p><p className="text-xs text-gray-400">{item.qty} sold</p></div><p className="text-orange-400 font-mono text-sm">KES {item.revenue.toLocaleString()}</p></div>)}</div>}
        </div>

        {/* Staff Performance */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><UserCheck size={18}/> Staff Performance</h3>
          {topStaff.length === 0 ? <p className="text-gray-500 text-center py-4">No data</p> : <div className="space-y-3">{topStaff.map(s => <div key={s.name} className="flex justify-between items-center border-b border-gray-700 pb-2 last:border-0"><div><p className="text-white font-medium">{s.name}</p><p className="text-xs text-gray-400">{s.count} orders</p></div><p className="text-green-400 font-mono text-sm">KES {s.sales.toLocaleString()}</p></div>)}</div>}
        </div>
      </div>
    </div>
  );
}