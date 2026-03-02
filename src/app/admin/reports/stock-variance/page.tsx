'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Printer, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function StockVariancePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchReport();
    }
  }, [profile, reportDate]);

  const fetchReport = async () => {
    setLoading(true);
    
    // 1. Get all Menu Items
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('id, name, unit')
      .eq('org_id', profile?.org_id);

    if (itemsError) {
      toast.error('Failed to fetch items');
      setLoading(false);
      return;
    }

    // 2. Get Transactions for the date
    // We need: Opening (before date), Purchases (on date), Adjustments (on date), Sales (on date)
    
    const startOfDay = `${reportDate}T00:00:00`;
    const endOfDay = `${reportDate}T23:59:59`;

    const { data: transactions, error: txError } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('org_id', profile?.org_id)
      .lte('created_at', endOfDay); // Get everything up to end of day

    if (txError) {
      toast.error('Failed to fetch transactions');
      setLoading(false);
      return;
    }

    // 3. Process Data
    const processedData = items.map(item => {
      const itemTx = transactions.filter(tx => tx.menu_item_id === item.id);

      // Opening: Sum of quantities BEFORE the report date
      const opening = itemTx
        .filter(tx => tx.created_at < startOfDay)
        .reduce((sum, tx) => sum + (tx.quantity || 0), 0);

      // Purchases: Sum of 'purchase' types ON the date
      const purchases = itemTx
        .filter(tx => tx.transaction_type === 'purchase' && tx.created_at >= startOfDay)
        .reduce((sum, tx) => sum + (tx.quantity || 0), 0);

      // Adjustments: Sum of 'adjustment' types ON the date
      const adjustments = itemTx
        .filter(tx => tx.transaction_type === 'adjustment' && tx.created_at >= startOfDay)
        .reduce((sum, tx) => sum + (tx.quantity || 0), 0);

      // Sales: Sum of 'sale' types ON the date
      const sales = itemTx
        .filter(tx => tx.transaction_type === 'sale' && tx.created_at >= startOfDay)
        .reduce((sum, tx) => sum + Math.abs(tx.quantity || 0), 0); // Sales are negative, take abs

      const expected = opening + purchases + adjustments - sales;
      
      // Actual: The latest 'count' transaction for the day, or null
      const countTx = itemTx.find(tx => tx.transaction_type === 'count' && tx.created_at >= startOfDay);
      const actual = countTx ? countTx.quantity : null;
      
      const diff = actual !== null ? actual - expected : null;

      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        opening,
        purchases,
        adjustments,
        sales,
        expected,
        actual,
        diff
      };
    });

    setReportData(processedData);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Stock Variance Report</h1>
          <p className="text-gray-400 text-sm">Opening + Purchases + Adj - Sales = Expected | Expected - Actual = Diff</p>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="date" 
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="bg-gray-700 p-2 rounded border border-gray-600"
          />
          <button onClick={handlePrint} className="p-2 bg-blue-600 rounded text-white flex items-center gap-2">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800 text-gray-300 text-xs">
              <th className="p-3 border border-gray-700">Item</th>
              <th className="p-3 border border-gray-700 text-center">Opening</th>
              <th className="p-3 border border-gray-700 text-center">+ Purchases</th>
              <th className="p-3 border border-gray-700 text-center">+ Adj</th>
              <th className="p-3 border border-gray-700 text-center">- Sales</th>
              <th className="p-3 border border-gray-700 text-center">= Expected</th>
              <th className="p-3 border border-gray-700 text-center">Actual</th>
              <th className="p-3 border border-gray-700 text-center">Diff</th>
              <th className="p-3 border border-gray-700 no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map(row => (
              <tr key={row.id} className="hover:bg-gray-800/50 text-sm">
                <td className="p-3 border border-gray-700 font-medium">
                  {row.name}
                  <span className="text-xs text-gray-500 ml-1">({row.unit || 'pcs'})</span>
                </td>
                <td className="p-3 border border-gray-700 text-center">{row.opening}</td>
                <td className="p-3 border border-gray-700 text-center text-green-400">+{row.purchases}</td>
                <td className="p-3 border border-gray-700 text-center text-blue-400">{row.adjustments > 0 ? `+${row.adjustments}` : row.adjustments}</td>
                <td className="p-3 border border-gray-700 text-center text-red-400">-{row.sales}</td>
                <td className="p-3 border border-gray-700 text-center font-bold">{row.expected}</td>
                <td className="p-3 border border-gray-700 text-center font-bold bg-gray-700">
                  {row.actual !== null ? row.actual : '-'}
                </td>
                <td className={`p-3 border border-gray-700 text-center font-bold ${
                  row.diff === null ? 'text-gray-500' :
                  row.diff === 0 ? 'text-green-400' :
                  row.diff > 0 ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {row.diff !== null ? (row.diff > 0 ? `+${row.diff}` : row.diff) : '-'}
                </td>
                <td className="p-3 border border-gray-700 no-print">
                  <div className="flex gap-1">
                    <Link href={`/admin/stock/purchase?item=${row.id}`} className="p-1 bg-green-700 rounded text-xs" title="Add Purchase"><Plus size={12}/></Link>
                    <Link href={`/admin/stock/adjust?item=${row.id}`} className="p-1 bg-blue-700 rounded text-xs" title="Adjust Stock"><ArrowUp size={12}/></Link>
                    <Link href={`/admin/stock/count?item=${row.id}`} className="p-1 bg-gray-600 rounded text-xs" title="Record Count"><FileText size={12}/></Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}