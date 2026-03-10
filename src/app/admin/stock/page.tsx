 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, ArrowLeft, Save, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';
import Link from 'next/link';

export default function StockPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  
  // Inputs
  const [purchases, setPurchases] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, string>>({});
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.org_id) fetchItems();
  }, [profile]);

  const fetchItems = async () => {
    setLoading(true);
    
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('id, name, category, current_stock, min_stock')
      .eq('org_id', profile?.org_id)
      .order('name', { ascending: true });

    if (error) { toast.error("Failed to load items"); setLoading(false); return; }

    const { data: entries } = await supabase
        .from('stock_entries')
        .select('menu_item_id, type, quantity')
        .eq('org_id', profile?.org_id);

    const { data: orders } = await supabase
        .from('orders')
        .select('items')
        .eq('org_id', profile?.org_id)
        .eq('status', 'paid');

    const salesMap: Record<string, number> = {};
    (orders || []).forEach((order: any) => {
        (order.items || []).forEach((item: any) => {
            if (!salesMap[item.id]) salesMap[item.id] = 0;
            salesMap[item.id] += item.quantity || 0;
        });
    });

    const detailedItems = (menuItems || []).map((item: any) => {
        const itemEntries = entries?.filter((e: any) => e.menu_item_id === item.id) || [];
        const opening = itemEntries.filter((e: any) => e.type === 'opening').reduce((sum: number, e: any) => sum + e.quantity, 0) || 0;
        const dbPurchases = itemEntries.filter((e: any) => e.type === 'purchase').reduce((sum: number, e: any) => sum + e.quantity, 0) || 0;
        const sales = salesMap[item.id] || 0;
        return { ...item, opening_stock: opening, db_purchases: dbPurchases, total_sales: sales };
    });

    setItems(detailedItems);
    setLoading(false);
  };

  const handlePurchaseChange = (itemId: string, value: string) => {
    setPurchases(prev => ({ ...prev, [itemId]: value }));
  };

  const handleCountChange = (itemId: string, value: string) => {
    setCounts(prev => ({ ...prev, [itemId]: value }));
  };

  const getExpectedStock = (item: any) => {
    const inputPurchase = parseFloat(purchases[item.id] || '0');
    return item.opening_stock + item.db_purchases + inputPurchase - item.total_sales;
  };

  const getVariance = (item: any) => {
    const countStr = counts[item.id];
    if (countStr === '' || countStr === undefined) return null;
    const actual = parseFloat(countStr);
    const expected = getExpectedStock(item);
    return actual - expected;
  };

  const handleSaveAll = async () => {
    if (!profile?.org_id) {
        toast.error("Session invalid. Please log in again.");
        return;
    }

    setSubmitting(true);
    
    try {
        const promises = [];

        for (const [itemId, qtyStr] of Object.entries(purchases)) {
            const qty = parseFloat(qtyStr);
            if (isNaN(qty) || qty <= 0) continue;
            promises.push(supabase.from('stock_entries').insert({ org_id: profile.org_id, menu_item_id: itemId, type: 'purchase', quantity: qty }));
            promises.push(supabase.rpc('add_stock', { item_id: itemId, qty: qty }));
        }

        for (const [itemId, qtyStr] of Object.entries(counts)) {
            const qty = parseFloat(qtyStr);
            if (isNaN(qty)) continue;
            const item = items.find(i => i.id === itemId);
            const diff = qty - (item?.current_stock || 0);
            promises.push(supabase.from('stock_entries').insert({ org_id: profile.org_id, menu_item_id: itemId, type: 'adjustment', quantity: diff, notes: 'Stock Count' }));
            promises.push(supabase.from('menu_items').update({ current_stock: qty }).eq('id', itemId));
        }

        const results = await Promise.all(promises);
        const errors = results.filter((r: any) => r.error);
        if (errors.length > 0) throw new Error(errors[0].error.message);

        toast.success("Saved Successfully!");
        setPurchases({});
        setCounts({});
        await fetchItems(); 

    } catch (err: any) {
        toast.error(err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* UPDATED: Clear Back Button */}
            <Link 
                href="/admin" 
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm font-medium transition print:hidden"
            >
               <ArrowLeft size={18} /> Back
            </Link>
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-orange-400">Daily Stock Sheet</h1>
                <p className="text-xs text-gray-500">Formula: Op + Purch - Sales = Expected | Actual - Expected = Variance</p>
            </div>
          </div>
          
          {/* UPDATED: Clear Button Styles */}
          <div className="flex gap-2 print:hidden">
            <button 
                onClick={handleSaveAll} 
                disabled={submitting} 
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition cursor-pointer"
            >
                {submitting ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} 
                {submitting ? 'Saving...' : 'Save Sheet'}
            </button>
            <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-sm transition cursor-pointer"
            >
                <Printer size={16}/> Print
            </button>
          </div>
        </div>

        <div id="printableArea" className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-900">
              <tr className="text-left text-gray-400 border-b border-gray-700 text-xs uppercase">
                <th className="p-4 w-1/5">Item Name</th>
                <th className="p-4 text-right">(1) Opening</th>
                <th className="p-4 text-center">(2) + Purchases</th>
                <th className="p-4 text-right">(3) - Sales</th>
                <th className="p-4 text-right font-bold text-blue-300 border-l border-gray-700">(4) = Expected</th>
                <th className="p-4 text-center font-bold text-white">(5) - Actual Counted</th>
                <th className="p-4 text-right font-bold text-orange-300">(6) Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {items.length === 0 ? (
                 <tr><td colSpan={7} className="p-8 text-center text-gray-500">No items found.</td></tr>
              ) : (
                items.map((item) => {
                   const expected = getExpectedStock(item);
                   const variance = getVariance(item);
                   const varianceClass = variance === null ? 'text-gray-600' : variance < 0 ? 'text-red-400' : variance > 0 ? 'text-green-400' : 'text-gray-400';

                   return (
                    <tr key={item.id} className="hover:bg-gray-700/30">
                      <td className="p-4 text-white font-medium">{item.name}</td>
                      <td className="p-4 text-right text-gray-300">{item.opening_stock}</td>
                      <td className="p-4 text-center bg-green-900/10">
                        <div className="flex flex-col items-center gap-1">
                           <span className="text-green-300 text-xs font-bold">({item.db_purchases} rec'd)</span>
                           <input 
                              type="number" 
                              placeholder="+ Add"
                              value={purchases[item.id] || ''}
                              onChange={(e) => handlePurchaseChange(item.id, e.target.value)}
                              className="w-20 p-2 bg-gray-700 rounded border border-gray-600 text-green-400 text-center font-bold focus:ring-1 focus:ring-green-500"
                            />
                        </div>
                      </td>
                      <td className="p-4 text-right text-red-400">{item.total_sales}</td>
                      <td className="p-4 text-right text-blue-300 font-bold border-l border-gray-700 pl-4">{expected}</td>
                      <td className="p-4 text-center bg-gray-900/50">
                        <input 
                          type="number" 
                          placeholder="0"
                          value={counts[item.id] || ''}
                          onChange={(e) => handleCountChange(item.id, e.target.value)}
                          className="w-20 p-2 bg-gray-700 rounded border border-gray-600 text-white text-center font-bold focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                      <td className={`p-4 text-right font-bold ${varianceClass}`}>
                          {variance !== null ? (variance > 0 ? '+' : '') + variance : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #printableArea, #printableArea * { visibility: visible; }
          #printableArea {
            position: absolute; left: 0; top: 0; width: 100%;
            background-color: white !important; color: black !important;
          }
          #printableArea th, #printableArea td { border: 1px solid #000 !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          input { border: none !important; background: transparent !important; text-align: center; }
        }
      `}</style>
    </PermissionGate>
  );
}