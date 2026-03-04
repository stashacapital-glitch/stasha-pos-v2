 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Calculator, Save, Package } from 'lucide-react';
import toast from 'react-hot-toast';

type StockItem = {
  id: string;
  name: string;
  opening: number;
  purchases: number;
  sales: number;
  expected: number;
  actual: number;
  diff: number;
};

export default function StockReturnsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<StockItem[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // 1. Get Menu Items
    const { data: menuData } = await supabase
      .from('menu_items')
      .select('id, name, current_stock')
      .eq('org_id', profile?.org_id);

    if (!menuData) {
      setLoading(false);
      return;
    }

    // 2. Get Today's Sales
    const { data: salesData } = await supabase
      .from('order_items')
      .select('menu_item_id, quantity')
      .gte('created_at', `${today}T00:00:00`);

    // 3. Get Today's Purchases
    const { data: purchaseData } = await supabase
      .from('stock_transactions')
      .select('menu_item_id, quantity')
      .eq('org_id', profile?.org_id)
      .eq('transaction_type', 'purchase')
      .gte('created_at', `${today}T00:00:00`);

    // 4. Process Calculations
    const processedItems = menuData.map((item: any) => {
      // FIX: Added explicit type '(sum: number)' to reduce functions
      const sales = salesData?.filter((s: any) => s.menu_item_id === item.id).reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
      const purchases = purchaseData?.filter((p: any) => p.menu_item_id === item.id).reduce((sum: number, p: any) => sum + p.quantity, 0) || 0;
      const opening = item.current_stock || 0;

      // Formula: Opening + Purch - Sales
      const expected = opening + purchases - sales;

      return {
        id: item.id,
        name: item.name,
        opening,
        purchases,
        sales,
        expected,
        actual: expected,
        diff: 0
      };
    });

    setItems(processedItems);
    setLoading(false);
  };

  const handleActualChange = (id: string, value: string) => {
    const val = Number(value);
    setItems(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        actual: val, 
        diff: val - item.expected
      } : item
    ));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      for (const item of items) {
        // 1. Update Menu Item Stock Level (New Opening for tomorrow)
        await supabase
          .from('menu_items')
          .update({ current_stock: item.actual })
          .eq('id', item.id);
          
        // 2. Log the Variance
        if (item.diff !== 0) {
           await supabase.from('stock_transactions').insert({
             org_id: profile?.org_id,
             menu_item_id: item.id,
             quantity: item.diff,
             transaction_type: 'adjustment',
             note: `Daily Variance (Expected: ${item.expected}, Actual: ${item.actual})`
           });
        }
      }
      
      toast.success("Stock updated successfully!");
      fetchData(); 
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Daily Stock Return</h1>
          <p className="text-gray-400">Calculated: Opening + Purch - Sales</p>
        </div>
        <button onClick={handleSubmit} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-green-500">
          <Save size={18} /> {saving ? 'Saving...' : 'Submit & Update Stock'}
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-3">Item</th>
              <th className="p-3 text-center">Opening</th>
              <th className="p-3 text-center text-blue-400">Purchases</th>
              <th className="p-3 text-center text-red-400">Sales</th>
              <th className="p-3 text-center text-orange-400 font-bold border-l border-gray-600">Expected</th>
              <th className="p-3 text-center text-green-400 border-l border-gray-600">Actual Count</th>
              <th className="p-3 text-center font-bold">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-700/50">
                <td className="p-3 font-medium text-white flex items-center gap-2"><Package size={14} className="text-gray-500"/>{item.name}</td>
                <td className="p-3 text-center text-gray-400">{item.opening}</td>
                <td className="p-3 text-center text-blue-400">+{item.purchases}</td>
                <td className="p-3 text-center text-red-400">-{item.sales}</td>
                <td className="p-3 text-center font-bold text-orange-400 border-l border-gray-600">{item.expected}</td>
                <td className="p-3 text-center border-l border-gray-600">
                  <input 
                    type="number" 
                    value={item.actual} 
                    onChange={(e) => handleActualChange(item.id, e.target.value)}
                    className="w-20 p-1 bg-gray-700 rounded text-center text-white border border-gray-600 focus:border-orange-500 outline-none"
                  />
                </td>
                <td className={`p-3 text-center font-bold text-lg ${item.diff === 0 ? 'text-gray-500' : item.diff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {item.diff > 0 ? `+${item.diff}` : item.diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}