 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Printer, Save } from 'lucide-react';
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

    if (!menuData) { setLoading(false); return; }

    // 2. Get Sales
    const { data: salesData } = await supabase
      .from('order_items')
      .select('menu_item_id, quantity')
      .gte('created_at', `${today}T00:00:00`);

    // 3. Get Purchases
    const { data: purchaseData } = await supabase
      .from('stock_transactions')
      .select('menu_item_id, quantity')
      .eq('transaction_type', 'purchase')
      .gte('created_at', `${today}T00:00:00`);

    // 4. Process
    const processedItems = menuData.map((item: any) => {
      const sales = salesData?.filter((s: any) => s.menu_item_id === item.id).reduce((sum, s) => sum + s.quantity, 0) || 0;
      const purchases = purchaseData?.filter((p: any) => p.menu_item_id === item.id).reduce((sum, p) => sum + p.quantity, 0) || 0;
      const opening = item.current_stock || 0;
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
      item.id === id ? { ...item, actual: val, diff: val - item.expected } : item
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of items) {
        await supabase.from('menu_items').update({ current_stock: item.actual }).eq('id', item.id);
        if (item.diff !== 0) {
           await supabase.from('stock_transactions').insert({
             org_id: profile?.org_id, menu_item_id: item.id, quantity: item.diff,
             transaction_type: 'adjustment', note: `Daily Variance`
           });
        }
      }
      toast.success("Stock Updated!");
    } catch (e) { toast.error("Error saving"); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const todayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-4 md:p-8 bg-gray-900 min-h-screen">
      
      {/* ACTION BAR (Hidden on Print) */}
      <div className="flex justify-between items-center mb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-orange-400">Daily Stock Return</h1>
          <p className="text-gray-400 text-sm">{todayDate}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-gray-700 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-600">
            <Printer size={18} /> Print
          </button>
          <button onClick={handleSave} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-green-500">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* PRINTABLE REPORT AREA */}
      <div className="bg-white text-black p-8 rounded-lg shadow-lg print:shadow-none print:p-0">
        
        {/* Report Header */}
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
          <h1 className="text-2xl font-bold uppercase">STASHA POS</h1>
          <h2 className="text-lg font-bold text-gray-700">Daily Stock Return Sheet</h2>
          <p className="text-sm text-gray-500 mt-1">Date: {todayDate}</p>
        </div>

        {/* Table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-200 text-gray-700 text-xs uppercase">
              <th className="border p-2 text-left">Item</th>
              <th className="border p-2 text-center w-16">Op.</th>
              <th className="border p-2 text-center w-16">Purch.</th>
              <th className="border p-2 text-center w-16">Sales</th>
              <th className="border p-2 text-center w-16">Exp.</th>
              <th className="border p-2 text-center w-20 bg-gray-300">Actual</th>
              <th className="border p-2 text-center w-16">Diff</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b">
                <td className="border p-2 font-medium">{item.name}</td>
                <td className="border p-2 text-center text-gray-600">{item.opening}</td>
                <td className="border p-2 text-center text-blue-600">{item.purchases}</td>
                <td className="border p-2 text-center text-red-600">{item.sales}</td>
                <td className="border p-2 text-center font-bold">{item.expected}</td>
                <td className="border p-1 bg-gray-50">
                  {/* Input for writing */}
                  <input 
                    type="number" 
                    value={item.actual} 
                    onChange={(e) => handleActualChange(item.id, e.target.value)}
                    className="w-full p-1 text-center bg-transparent border-b border-dashed border-gray-400 focus:outline-none focus:border-black print:border-none"
                  />
                </td>
                <td className={`border p-2 text-center font-bold ${item.diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {item.diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t border-gray-300">
          <div>
            <p className="text-xs text-gray-500 mb-6">Prepared By:</p>
            <div className="border-b border-gray-400 border-dashed"></div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-6">Verified By (Manager):</p>
            <div className="border-b border-gray-400 border-dashed"></div>
          </div>
        </div>
      </div>
    </div>
  );
}