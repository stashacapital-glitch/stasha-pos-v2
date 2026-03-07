 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, Package, AlertTriangle, ShoppingCart, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';

export default function StockPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ingredient');
  const [price, setPrice] = useState(''); // Selling Price
  const [costPrice, setCostPrice] = useState(''); // Purchase Cost
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [isIngredient, setIsIngredient] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchItems();
  }, [profile]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('name');

    if (error) toast.error('Failed to load stock');
    setItems(data || []);
    setLoading(false);
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setCategory(item.category || 'ingredient');
      setPrice(item.price?.toString() || '');
      setCostPrice(item.cost_price?.toString() || '');
      setStock(item.current_stock?.toString() || '');
      setMinStock(item.min_stock?.toString() || '10');
      setIsIngredient(item.is_ingredient || false);
    } else {
      setEditingItem(null);
      setName('');
      setCategory('ingredient');
      setPrice('');
      setCostPrice('');
      setStock('');
      setMinStock('10');
      setIsIngredient(false);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error("Name is required"); return; }
    if (!costPrice) { toast.error("Cost Price is required for inventory tracking"); return; }

    setSubmitting(true);
    
    const newStockQty = stock ? parseInt(stock) : 0;
    const oldStockQty = editingItem?.current_stock || 0;
    const unitCost = parseFloat(costPrice);

    const payload = {
      name,
      category,
      price: parseFloat(price) || 0,
      cost_price: unitCost,
      current_stock: newStockQty,
      min_stock: minStock ? parseInt(minStock) : 10,
      is_ingredient: isIngredient,
      org_id: profile?.org_id,
      is_available: true
    };

    try {
      let error;
      if (editingItem) {
        const res = await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
        error = res.error;
      } else {
        const res = await supabase.from('menu_items').insert(payload);
        error = res.error;
      }

      if (error) throw error;

      // --- INTELLIGENT EXPENSE LOGIC ---
      if (newStockQty > oldStockQty) {
        // SCENARIO 1: BUYING STOCK
        const addedQty = newStockQty - oldStockQty;
        const totalPurchaseCost = addedQty * unitCost;

        if (totalPurchaseCost > 0) {
          await supabase.from('expenses').insert({
            org_id: profile?.org_id,
            description: `Stock Purchase: ${name} (${addedQty} units)`,
            amount: totalPurchaseCost,
            category: 'stock'
          });
          toast.success(`Stock Added! Expense recorded: KES ${totalPurchaseCost.toLocaleString()}`);
        }
      } else if (newStockQty < oldStockQty) {
        // SCENARIO 2: WASTAGE / SPILLAGE
        const removedQty = oldStockQty - newStockQty;
        const totalWastageCost = removedQty * unitCost;

        if (totalWastageCost > 0) {
          await supabase.from('expenses').insert({
            org_id: profile?.org_id,
            description: `Stock Wastage/Adjustment: ${name} (${removedQty} units)`,
            amount: totalWastageCost,
            category: 'wastage'
          });
          toast.success(`Stock Decreased. Wastage recorded: KES ${totalWastageCost.toLocaleString()}`);
        }
      } else {
        toast.success("Item details updated (no stock change).");
      }
      // --------------------------------

      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Error saving item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from('menu_items').delete().eq('id', id);
    fetchItems();
    toast.success("Deleted");
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const lowStockItems = items.filter(i => i.current_stock <= i.min_stock);

  return (
    <PermissionGate allowedRoles={['admin', 'manager', 'chef', 'bartender']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-orange-400">Stock Management</h1>
          <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
            <Plus size={18} /> Add Item
          </button>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-lg mb-6 flex items-center gap-3">
            <AlertTriangle className="text-red-500" />
            <span>{lowStockItems.length} items are low on stock!</span>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4">Type</th>
                <th className="p-4">Cost (Buy)</th>
                <th className="p-4">Price (Sell)</th>
                <th className="p-4">In Stock</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-700/50">
                  <td className="p-4 font-bold text-white">{item.name}</td>
                  <td className="p-4 text-gray-300 uppercase text-xs">{item.is_ingredient ? 'Ingredient' : item.category}</td>
                  <td className="p-4 text-gray-300">KES {item.cost_price?.toLocaleString() || 0}</td>
                  <td className="p-4 text-white">KES {item.price?.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`font-bold ${item.current_stock <= item.min_stock ? 'text-red-400' : 'text-green-400'}`}>
                      {item.current_stock}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => openModal(item)} className="text-blue-400 hover:text-blue-300"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit' : 'Add'} Item</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isIngredient" checked={isIngredient} onChange={(e) => setIsIngredient(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <label htmlFor="isIngredient" className="text-sm text-gray-300">Is Raw Ingredient (e.g. Oil, Tomatoes)</label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cost Price (Buy) *</label>
                  <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="Purchase Cost" className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Selling Price</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 if ingredient" className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Quantity in Stock</label>
                    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" />
                 </div>
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Min Stock Alert</label>
                    <input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" />
                 </div>
              </div>

              <div className="bg-blue-900/30 p-3 rounded text-xs text-blue-300 flex items-start gap-2">
                <ShoppingCart size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                   <span className="font-bold">Auto-Accounting Active:</span>
                   <p className="mt-1">If stock increases, a Purchase Expense is recorded. If stock decreases, a Wastage Expense is recorded.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500 text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50">{submitting ? 'Saving...' : 'Save Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}