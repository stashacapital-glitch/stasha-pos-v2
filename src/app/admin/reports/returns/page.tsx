 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Printer, Plus, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReturnsReportPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any[]>([]);
  
  // Modal States
  const [showPurchase, setShowPurchase] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [inputQty, setInputQty] = useState<string>(''); // Changed to string to fix NaN warning

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchBaseData();
    }
  }, [profile]);

  useEffect(() => {
    if (menuItems.length > 0) {
      generateReport();
    }
  }, [reportDate, menuItems]);

  const fetchBaseData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('menu_items')
      .select('id, name, emoji, stock_quantity')
      .eq('org_id', profile?.org_id)
      .order('name');
    setMenuItems(data || []);
    setLoading(false);
  };

  const generateReport = async () => {
    setLoading(true);
    
    const startOfDay = `${reportDate}T00:00:00`;
    const endOfDay = `${reportDate}T23:59:59`;
    
    const { data: orders } = await supabase
      .from('orders')
      .select('items')
      .eq('org_id', profile?.org_id)
      .eq('status', 'paid')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    const salesMap: Record<string, number> = {};
    // FIX: Added type annotation for order
    orders?.forEach((order: any) => {
      order.items.forEach((item: any) => {
        salesMap[item.id] = (salesMap[item.id] || 0) + item.quantity;
      });
    });

    const { data: purchases } = await supabase
      .from('stock_purchases')
      .select('item_id, quantity')
      .eq('org_id', profile?.org_id)
      .eq('date', reportDate);

    const purchaseMap: Record<string, number> = {};
    // FIX: Added type annotation for p
    purchases?.forEach((p: any) => {
      purchaseMap[p.item_id] = (purchaseMap[p.item_id] || 0) + p.quantity;
    });

    const { data: counts } = await supabase
      .from('stock_counts')
      .select('item_id, quantity')
      .eq('org_id', profile?.org_id)
      .eq('date', reportDate);

    const countMap: Record<string, number> = {};
    // FIX: Added type annotation for c
    counts?.forEach((c: any) => {
      countMap[c.item_id] = c.quantity;
    });

    const prevDate = new Date(reportDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const { data: prevCounts } = await supabase
      .from('stock_counts')
      .select('item_id, quantity')
      .eq('org_id', profile?.org_id)
      .eq('date', prevDateStr);

    const openingMap: Record<string, number> = {};
    // FIX: Added type annotation for c
    prevCounts?.forEach((c: any) => {
      openingMap[c.item_id] = c.quantity;
    });

    // FIX: Added type annotation for item
    const data = menuItems.map((item: any) => {
      const opening = openingMap[item.id] || 0;
      const purchased = purchaseMap[item.id] || 0;
      const sold = salesMap[item.id] || 0;
      const expected = opening + purchased - sold;
      const actual = countMap[item.id] !== undefined ? countMap[item.id] : null;
      const diff = actual !== null ? actual - expected : null;

      return {
        ...item,
        opening,
        purchased,
        sold,
        expected,
        actual,
        diff
      };
    });

    setReportData(data);
    setLoading(false);
  };

  const handleAddPurchase = async () => {
    const qty = parseInt(inputQty);
    if (!selectedItem || isNaN(qty) || qty <= 0) {
        toast.error("Please enter a valid quantity.");
        return;
    }

    const { error } = await supabase.from('stock_purchases').insert({
      org_id: profile?.org_id,
      item_id: selectedItem.id,
      quantity: qty,
      date: reportDate
    });

    if (error) toast.error('Error: ' + error.message);
    else {
      toast.success('Purchase Added!');
      setShowPurchase(false);
      setInputQty('');
      generateReport();
    }
  };

  const handleSubmitCount = async () => {
    const qty = parseInt(inputQty);
    if (!selectedItem || isNaN(qty) || qty < 0) {
        toast.error("Please enter a valid quantity.");
        return;
    }

    const { error } = await supabase.from('stock_counts').upsert({
      org_id: profile?.org_id,
      item_id: selectedItem.id,
      quantity: qty,
      date: reportDate
    }, { onConflict: 'org_id,item_id,date' });

    if (error) toast.error('Error: ' + error.message);
    else {
      toast.success('Stock Count Submitted!');
      setShowCount(false);
      setInputQty('');
      generateReport();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && reportData.length === 0) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8 print:p-4">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Stock Variance Report</h1>
          <p className="text-gray-400">Opening + Purchases - Sales = Expected | Expected - Actual = Diff</p>
        </div>
        <div className="flex gap-3">
            <input 
                type="date" 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)} 
                className="bg-gray-700 p-2 rounded border border-gray-600"
            />
            <button onClick={handlePrint} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2">
                <Printer size={18}/> Print
            </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="p-3">Item</th>
              <th className="p-3 text-center">Opening</th>
              <th className="p-3 text-center text-green-400">+ Purchases</th>
              <th className="p-3 text-center text-red-400">- Sales</th>
              <th className="p-3 text-center">= Expected</th>
              <th className="p-3 text-center text-blue-400">Actual</th>
              <th className="p-3 text-center text-yellow-400">Diff</th>
              <th className="p-3 text-center print:hidden">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {reportData.map(item => (
              <tr key={item.id} className="hover:bg-gray-700/50">
                <td className="p-3 font-bold">{item.emoji} {item.name}</td>
                <td className="p-3 text-center">{item.opening}</td>
                <td className="p-3 text-center text-green-400">{item.purchased}</td>
                <td className="p-3 text-center text-red-400">{item.sold}</td>
                <td className="p-3 text-center border-l border-gray-600">{item.expected}</td>
                <td className="p-3 text-center">
                    {item.actual !== null ? item.actual : <span className="text-gray-500">-</span>}
                </td>
                <td className={`p-3 text-center font-bold ${item.diff !== null ? (item.diff < 0 ? 'text-red-500' : 'text-green-500') : 'text-gray-500'}`}>
                    {item.diff !== null ? item.diff : '-'}
                </td>
                <td className="p-3 text-center print:hidden">
                   <div className="flex gap-2 justify-center">
                     <button 
                        onClick={() => { setSelectedItem(item); setShowPurchase(true); }} 
                        className="text-xs bg-green-600 px-2 py-1 rounded"
                     >
                       + Purchase
                     </button>
                     <button 
                        onClick={() => { setSelectedItem(item); setShowCount(true); }} 
                        className="text-xs bg-blue-600 px-2 py-1 rounded"
                     >
                       Count
                     </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Purchase Modal */}
      {showPurchase && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 print:hidden">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Add Purchase</h2>
            <p className="text-gray-400 mb-4">Item: {selectedItem?.name}</p>
            <input 
              type="number" 
              placeholder="Quantity" 
              value={inputQty}
              onChange={(e) => setInputQty(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded mb-4"
            />
            <div className="flex gap-2">
                <button onClick={handleAddPurchase} className="flex-1 bg-green-600 py-2 rounded font-bold">Save</button>
                <button onClick={() => {setShowPurchase(false); setInputQty('');}} className="flex-1 bg-gray-600 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Count Modal */}
      {showCount && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 print:hidden">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Submit Stock Count</h2>
            <p className="text-gray-400 mb-4">Item: {selectedItem?.name}</p>
            <p className="text-xs text-gray-500 mb-2">Expected Stock: {selectedItem?.expected}</p>
            <input 
              type="number" 
              placeholder="Actual Physical Count" 
              value={inputQty}
              onChange={(e) => setInputQty(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded mb-4"
            />
            <div className="flex gap-2">
                <button onClick={handleSubmitCount} className="flex-1 bg-blue-600 py-2 rounded font-bold">Submit</button>
                <button onClick={() => {setShowCount(false); setInputQty('');}} className="flex-1 bg-gray-600 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}