 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, FileSpreadsheet, PlusCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';
import Link from 'next/link';

export default function StockVariancePage() {
  const { profile } = useAuth();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any[]>([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.org_id) fetchReport();
  }, [profile]);

  const fetchReport = async () => {
    setLoading(true);
    
    // 1. Get all menu items (Ingredients)
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('id, name, current_stock, is_ingredient')
      .eq('org_id', profile?.org_id)
      .eq('is_ingredient', true);

    if (error) {
        toast.error("Failed to load stock");
        setLoading(false);
        return;
    }
    
    setItems(menuItems || []);

    // 2. Calculate for each item
    const reportData = await Promise.all((menuItems || []).map(async (item) => {
        // Get Opening Stock
        const { data: openings } = await supabase
            .from('stock_entries')
            .select('quantity')
            .eq('menu_item_id', item.id)
            .eq('type', 'opening')
            .order('created_at', { ascending: true })
            .limit(1);
        const opening = openings?.[0]?.quantity || 0;

        // Get Total Purchases
        const { data: purchases } = await supabase
            .from('stock_entries')
            .select('quantity')
            .eq('menu_item_id', item.id)
            .eq('type', 'purchase');
        const totalPurchases = purchases?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0;

        return {
            ...item,
            opening,
            purchases: totalPurchases,
            expected: opening + totalPurchases,
            actual: item.current_stock || 0,
            used: (opening + totalPurchases) - (item.current_stock || 0)
        };
    }));

    setReport(reportData);
    setLoading(false);
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedItem || !purchaseQty) return;
    setSubmitting(true);

    await supabase.from('stock_entries').insert({
        org_id: profile?.org_id,
        menu_item_id: selectedItem,
        type: 'purchase',
        quantity: parseFloat(purchaseQty)
    });

    await supabase.rpc('add_stock', { item_id: selectedItem, qty: parseFloat(purchaseQty) });

    toast.success("Stock Updated");
    setShowPurchaseModal(false);
    fetchReport();
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/reports" className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition">
               <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <h1 className="text-3xl font-bold text-orange-400">Stock Variance Report</h1>
          </div>
          <button onClick={() => setShowPurchaseModal(true)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold flex items-center gap-2">
             <PlusCircle size={18} /> Add Purchase
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 border-b border-gray-700">
                    <tr>
                        {/* FIXED: Added text-gray-300 for visibility */}
                        <th className="p-4 text-gray-300 font-bold">Item</th>
                        <th className="p-4 text-right text-gray-300 font-bold">Opening</th>
                        <th className="p-4 text-right text-gray-300 font-bold">Purchases</th>
                        <th className="p-4 text-right text-gray-300 font-bold">Expected (Avail)</th>
                        <th className="p-4 text-right text-gray-300 font-bold">Actual (Sys)</th>
                        <th className="p-4 text-right text-gray-300 font-bold">Used</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {report.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-700/30">
                            <td className="p-4 font-medium text-white">{row.name}</td>
                            <td className="p-4 text-right text-gray-300">{row.opening}</td>
                            <td className="p-4 text-right text-green-400">+{row.purchases}</td>
                            <td className="p-4 text-right text-blue-400">{row.expected}</td>
                            <td className="p-4 text-right text-white font-bold">{row.actual}</td>
                            <td className="p-4 text-right text-orange-400">{row.used}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-white">Add Stock Purchase</h2>
                <form onSubmit={handlePurchase} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Item</label>
                        <select 
                            value={selectedItem} 
                            onChange={(e) => setSelectedItem(e.target.value)} 
                            className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                            <option value="">Select...</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                        <input 
                            type="number" 
                            value={purchaseQty} 
                            onChange={(e) => setPurchaseQty(e.target.value)} 
                            className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                            placeholder="0"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setShowPurchaseModal(false)} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 hover:bg-orange-400 text-black rounded font-bold disabled:opacity-50">
                            {submitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </PermissionGate>
  );
}