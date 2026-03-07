 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Calendar, Download } from 'lucide-react';
import PermissionGate from '@/components/PermissionGate';

export default function ReportsPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [sales, setSales] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [profit, setProfit] = useState(0);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.org_id) fetchReportData();
  }, [profile, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);

    // 1. Fetch Paid Orders in Range
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total_price, created_at, items')
      .eq('org_id', profile?.org_id)
      .eq('status', 'paid')
      .gte('paid_at', `${startDate}T00:00:00`)
      .lte('paid_at', `${endDate}T23:59:59`);

    // 2. Fetch Expenses in Range
    const { data: expenseData } = await supabase
      .from('expenses')
      .select('amount, created_at')
      .eq('org_id', profile?.org_id)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    // 3. Calculate Totals
    const totalSales = ordersData?.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
    const totalExp = expenseData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    
    setSales(totalSales);
    setExpenses(totalExp);
    setProfit(totalSales - totalExp);

    // 4. Calculate Top Selling Items
    const itemCounts: Record<string, number> = {};
    // FIX: Explicitly type 'order' as any
    ordersData?.forEach((order: any) => {
        (order.items || []).forEach((item: any) => {
            const name = item.name || 'Unknown';
            itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
        });
    });

    const sortedItems = Object.entries(itemCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    setTopItems(sortedItems);

    // 5. Recent Transactions for Table
    setRecentTransactions(ordersData?.slice(0, 10) || []);

    setLoading(false);
  };

  const formatMoney = (amount: number) => amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold text-orange-400">Financial Reports</h1>
            
            {/* Date Filter */}
            <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-lg border border-gray-700">
                <Calendar size={16} className="text-gray-400" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-white text-sm focus:outline-none" />
                <span className="text-gray-500">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-white text-sm focus:outline-none" />
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-green-900/30 rounded-full"><TrendingUp className="text-green-400" size={24} /></div>
                <div>
                    <p className="text-gray-400 text-sm">Total Sales</p>
                    <p className="text-2xl font-bold text-white">KES {formatMoney(sales)}</p>
                </div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-red-900/30 rounded-full"><TrendingDown className="text-red-400" size={24} /></div>
                <div>
                    <p className="text-gray-400 text-sm">Total Expenses</p>
                    <p className="text-2xl font-bold text-white">KES {formatMoney(expenses)}</p>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-blue-900/30 rounded-full"><DollarSign className="text-blue-400" size={24} /></div>
                <div>
                    <p className="text-gray-400 text-sm">Net Profit</p>
                    <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>KES {formatMoney(profit)}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Items */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h2 className="text-lg font-bold text-white mb-4">Top Selling Items</h2>
                {topItems.length === 0 ? <p className="text-gray-500 text-sm">No data for this period.</p> : (
                    <div className="space-y-3">
                        {topItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                                <span className="text-white text-sm">{idx + 1}. {item.name}</span>
                                <span className="text-orange-400 font-bold">{item.count} sold</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sales Log */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h2 className="text-lg font-bold text-white mb-4">Recent Sales Log</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-left text-gray-400 border-b border-gray-700">
                                <th className="pb-2">Date</th>
                                <th className="pb-2">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-white">
                            {recentTransactions.map((t, idx) => (
                                <tr key={idx} className="border-b border-gray-700/50">
                                    <td className="py-2">{new Date(t.created_at).toLocaleString()}</td>
                                    <td className="py-2 text-right text-green-400">KES {formatMoney(t.total_price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </PermissionGate>
  );
}