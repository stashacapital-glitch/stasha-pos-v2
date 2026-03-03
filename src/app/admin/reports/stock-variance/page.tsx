 'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2 } from 'lucide-react';

export default function StockVariancePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const supabase = createClient();

  const runReport = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);

    // 1. Get Menu Items
    const { data: items } = await supabase
      .from('menu_items')
      .select('id, name, current_stock')
      .eq('org_id', profile?.org_id);

    // 2. Get Transactions in range
    const { data: transactions } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('org_id', profile?.org_id)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // 3. Process Data
    // FIX: Added explicit (item: any) type below
    const processedData = (items || []).map((item: any) => {
      
      // FIX: Added explicit (tx: any) type below
      const itemTx = (transactions || []).filter((tx: any) => tx.menu_item_id === item.id);

      const purchases = itemTx.filter((tx: any) => tx.transaction_type === 'purchase').reduce((sum: number, tx: any) => sum + tx.quantity, 0);
      const sales = itemTx.filter((tx: any) => tx.transaction_type === 'sale').reduce((sum: number, tx: any) => sum + Math.abs(tx.quantity), 0);
      
      return {
        name: item.name,
        current_stock: item.current_stock || 0,
        purchases: purchases,
        sales: sales,
        variance: 0 
      };
    });

    setReportData(processedData);
    setLoading(false);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Stock Variance Report</h1>
          <p className="text-gray-400">Compare theoretical vs actual stock.</p>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600 text-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600 text-white" />
        </div>
        <button onClick={runReport} disabled={loading} className="px-4 py-2 bg-orange-500 text-black rounded font-bold hover:bg-orange-400 disabled:opacity-50">
          {loading ? 'Running...' : 'Run Report'}
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 border-b border-gray-700">
            <tr>
              <th className="p-4 text-gray-400">Item</th>
              <th className="p-4 text-gray-400 text-right">Purchases</th>
              <th className="p-4 text-gray-400 text-right">Sales</th>
              <th className="p-4 text-gray-400 text-right">Current Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {reportData.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">Select dates and run report.</td></tr>
            ) : (
              reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-700/50">
                  <td className="p-4 font-medium">{row.name}</td>
                  <td className="p-4 text-right text-green-400">{row.purchases}</td>
                  <td className="p-4 text-right text-red-400">{row.sales}</td>
                  <td className="p-4 text-right font-mono">{row.current_stock}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}