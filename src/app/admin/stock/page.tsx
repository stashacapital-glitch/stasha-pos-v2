'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Package, Plus, AlertTriangle, History } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Restock Modal State
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockNote, setRestockNote] = useState('restock');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Menu Items with Stock
    const { data: menuData, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, category, current_stock, price')
      .eq('org_id', profile?.org_id)
      .order('name');

    if (menuError) toast.error('Failed to load stock');
    setItems(menuData || []);

    // 2. Fetch Recent Transactions
    const { data: txData } = await supabase
      .from('stock_transactions')
      .select('*, menu_items(name)')
      .eq('org_id', profile?.org_id)
      .order('created_at', { ascending: false })
      .limit(10);

    setTransactions(txData || []);
    setLoading(false);
  };

  const openRestockModal = (item: any) => {
    setSelectedItem(item);
    setRestockQty('');
    setRestockNote('restock');
    setShowRestockModal(true);
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockQty || !selectedItem) return;
    
    const qty = Number(restockQty);
    if (qty <= 0) {
      toast.error("Quantity must be positive");
      return;
    }

    setSubmitting(true);

    // 1. Update Stock Count in Menu Item
    const newStock = (selectedItem.current_stock || 0) + qty;
    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ current_stock: newStock })
      .eq('id', selectedItem.id);

    if (updateError) {
      toast.error("Failed to update stock");
      setSubmitting(false);
      return;
    }

    // 2. Record Transaction
    const { error: txError } = await supabase
      .from('stock_transactions')
      .insert({
        org_id: profile?.org_id,
        menu_item_id: selectedItem.id,
        quantity: qty, // Positive for restock
        transaction_type: 'restock',
        note: restockNote
      });

    if (txError) console.error("Transaction log failed", txError);

    toast.success(`Restocked ${restockQty} units of ${selectedItem.name}`);
    setShowRestockModal(false);
    fetchData(); // Refresh data
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  // Filter for Low Stock
  const lowStockItems = items.filter(i => i.current_stock !== null && i.current_stock <= 5 && i.current_stock >= 0);
  const outOfStockItems = items.filter(i => i.current_stock !== null && i.current_stock <= 0);

  return (
    <div className="p-6 md:p-8 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Stock Manager</h1>
          <p className="text-gray-400">Manage inventory and restock items</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`px-4 py-2 rounded font-bold flex items-center gap-2 transition ${showHistory ? 'bg-orange-500 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
        >
          <History size={18} /> {showHistory ? 'View Stock' : 'View History'}
        </button>
      </div>

      {/* ALERTS */}
      {outOfStockItems.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="text-red-400 mt-1" size={20} />
          <div>
            <h3 className="font-bold text-red-400">Out of Stock!</h3>
            <p className="text-sm text-red-300">
              {outOfStockItems.map(i => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {lowStockItems.length > 0 && outOfStockItems.length === 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="text-yellow-400 mt-1" size={20} />
          <div>
            <h3 className="font-bold text-yellow-400">Low Stock Warning</h3>
            <p className="text-sm text-yellow-300">
              {lowStockItems.map(i => `${i.name} (${i.current_stock})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {showHistory ? (
        // HISTORY VIEW
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Item</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Quantity</th>
                <th className="p-4">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-700/50">
                  <td className="p-4 text-sm text-gray-400">{new Date(tx.created_at).toLocaleString()}</td>
                  <td className="p-4 text-sm text-white">{tx.menu_items?.name || 'Unknown'}</td>
                  <td className="p-4 text-sm capitalize">
                    <span className={`px-2 py-1 rounded text-xs ${
                      tx.transaction_type === 'restock' ? 'bg-green-800 text-green-300' :
                      tx.transaction_type === 'sale' ? 'bg-blue-800 text-blue-300' :
                      'bg-red-800 text-red-300'
                    }`}>
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className={`p-4 text-sm text-right font-mono font-bold ${tx.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{tx.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // STOCK GRID VIEW
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className={`bg-gray-800 p-4 rounded-lg border flex flex-col justify-between transition hover:border-gray-600 ${
              item.current_stock !== null && item.current_stock <= 0 ? 'border-red-700 bg-red-900/10' :
              item.current_stock !== null && item.current_stock <= 5 ? 'border-yellow-700' : 
              'border-gray-700'
            }`}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-sm truncate">{item.name}</h3>
                  <Package size={16} className="text-gray-500" />
                </div>
                <p className="text-xs text-gray-400 capitalize mb-3">{item.category}</p>
                
                <div className="mb-4">
                  <p className="text-2xl font-bold font-mono text-white">
                    {item.current_stock !== null ? item.current_stock : '∞'}
                  </p>
                  <p className="text-xs text-gray-500">units in stock</p>
                </div>
              </div>

              <button 
                onClick={() => openRestockModal(item)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Plus size={12} /> Restock
              </button>
            </div>
          ))}
        </div>
      )}

      {/* RESTOCK MODAL */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-2">Restock Item</h2>
            <p className="text-white font-medium mb-1">{selectedItem.name}</p>
            <p className="text-xs text-gray-400 mb-4">Current Stock: {selectedItem.current_stock || 0}</p>
            
            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Quantity to Add</label>
                <input 
                  type="number" 
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                  placeholder="e.g. 10"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Note (Optional)</label>
                <input 
                  type="text" 
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                  placeholder="e.g. Supplier delivery"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRestockModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50">
                  {submitting ? 'Processing...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}