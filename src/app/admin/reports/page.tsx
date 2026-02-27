 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate';
import { Loader2, Printer, DollarSign, ShoppingCart, TrendingUp, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency'; // Import the formatter

export default function ReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'month'>('today');
  
  // State for Data
  const [salesData, setSalesData] = useState({ total: 0, count: 0, cash: 0, mpesa: 0 });
  const [topItems, setTopItems] = useState<any[]>([]);
  const [stockMoves, setStockMoves] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchAllData();
  }, [profile, dateFilter]);

  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    
    if (dateFilter === 'today') {
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1); // First day of month
    }
    return { start, end: now };
  };

  const fetchAllData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const orgId = profile?.org_id;

    // 1. Fetch Orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('org_id', orgId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // 2. Process Sales Data
    if (orders) {
      // FIX: Added type annotations to prevent implicit 'any' error
      const total = orders.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);
      const cash = orders.filter((o: any) => o.payment_method === 'Cash').reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);
      const mpesa = orders.filter((o: any) => o.payment_method === 'M-Pesa').reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);
      
      setSalesData({ total, count: orders.length, cash, mpesa });

      // Process Top Items (Simple aggregation from items array)
      const itemCounts: Record<string, { name: string; qty: number }> = {};
      // FIX: Added type annotation for order
      orders.forEach((order: any) => {
        order.items?.forEach((item: any) => {
          if (!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, qty: 0 };
          itemCounts[item.name].qty += item.quantity || 1;
        });
      });
      
      const sorted = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 5);
      setTopItems(sorted);
    }

    // 3. Fetch Stock Transactions
    const { data: transactions } = await supabase
      .from('stock_transactions')
      .select('*, menu_items(name)')
      .eq('org_id', orgId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    setStockMoves(transactions || []);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['owner', 'admin']}>
      <div className="p-8">
        {/* Header & Filters */}
        <div className="flex justify-between items-center mb-8 no-print">
          <h1 className="text-3xl font-bold text-orange-400">Reports</h1>
          <div className="flex gap-4 items-center">
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-gray-700 p-2 rounded text-white"
            >
              <option value="today">Today</option>
              <option value="month">This Month</option>
            </select>
            <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
              <Printer size={18} /> Print Report
            </button>
          </div>
        </div>

        {/* Sales Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <DollarSign className="text-green-400" />
            </div>
            {/* Updated Format */}
            <h2 className="text-3xl font-bold mt-2">KES {formatCurrency(salesData.total)}</h2>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Total Orders</p>
              <ShoppingCart className="text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold mt-2">{salesData.count}</h2>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Cash Sales</p>
              <TrendingUp className="text-yellow-400" />
            </div>
            {/* Updated Format */}
            <h2 className="text-2xl font-bold mt-2">KES {formatCurrency(salesData.cash)}</h2>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">M-Pesa/Card</p>
              <TrendingUp className="text-purple-400" />
            </div>
            {/* Updated Format */}
            <h2 className="text-2xl font-bold mt-2">KES {formatCurrency(salesData.mpesa)}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Top Selling Items */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 lg:col-span-1">
            <h3 className="text-xl font-bold mb-4">Top Selling Items</h3>
            <ul className="space-y-3">
              {topItems.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                  <span>{item.name}</span>
                  <span className="font-bold text-orange-400">{item.qty} sold</span>
                </li>
              ))}
              {topItems.length === 0 && <p className="text-gray-500 text-center py-4">No sales data yet.</p>}
            </ul>
          </div>

          {/* Stock Movement Report */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 lg:col-span-2">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package size={20} /> Stock Movement
            </h3>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="border-b border-gray-600 text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Item</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMoves.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-700">
                      <td className="p-2 text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="p-2">{tx.menu_items?.name || 'Unknown'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          tx.transaction_type === 'purchase' ? 'bg-blue-900 text-blue-300' :
                          tx.transaction_type === 'sale' ? 'bg-orange-900 text-orange-300' :
                          tx.transaction_type === 'return' ? 'bg-green-900 text-green-300' :
                          'bg-red-900 text-red-300'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className={`p-2 font-bold ${tx.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </td>
                      <td className="p-2 text-gray-400">{tx.note || '-'}</td>
                    </tr>
                  ))}
                  {stockMoves.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-4 text-gray-500">No stock movements recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </PermissionGate>
  );
}