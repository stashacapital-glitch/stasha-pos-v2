 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, Package, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';
import Link from 'next/link';

export default function StockPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('food');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.org_id) fetchItems();
  }, [profile]);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('created_at', { ascending: false });
    
    setItems(data || []);
    setLoading(false);
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setName(item.name);
      setPrice(item.price.toString());
      setCategory(item.category || 'food');
      setStock(item.current_stock?.toString() || '0');
      setMinStock(item.min_stock?.toString() || '10');
    } else {
      setEditingId(null);
      setName('');
      setPrice('');
      setCategory('food');
      setStock('');
      setMinStock('10');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) { toast.error("Name and Price required"); return; }
    setSubmitting(true);

    try {
      const payload = {
        name,
        price: parseFloat(price),
        category,
        current_stock: parseFloat(stock || '0'),
        min_stock: parseInt(minStock || '10'),
        is_ingredient: true 
      };

      if (editingId) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Item updated');
      } else {
        const { error } = await supabase.from('menu_items').insert({ ...payload, org_id: profile?.org_id, is_available: true });
        if (error) throw error;
        toast.success('Item added');
      }
      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message);
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

  return (
    <PermissionGate allowedRoles={['admin', 'manager', 'chef', 'bartender']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition">
               <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <h1 className="text-3xl font-bold text-orange-400">Stock Management</h1>
          </div>
          <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
            <Plus size={18} /> Add Item
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="p-4">Item Name</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Stock</th>
                <th className="p-4 text-right">Min Stock</th>
                <th className="p-4 text-right">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-700/50">
                  <td className="p-4 text-white font-medium">{item.name}</td>
                  <td className="p-4 text-gray-300 text-sm">{item.category}</td>
                  <td className="p-4 text-right text-green-400 font-mono">KES {item.price}</td>
                  <td className="p-4 text-right text-white font-bold">{item.current_stock}</td>
                  <td className="p-4 text-right text-gray-400">{item.min_stock}</td>
                  <td className="p-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                        item.current_stock <= 0 ? 'bg-red-900 text-red-200' : 
                        item.current_stock <= item.min_stock ? 'bg-yellow-900 text-yellow-200' : 
                        'bg-green-900 text-green-200'
                    }`}>
                        {item.current_stock <= 0 ? 'Out' : item.current_stock <= item.min_stock ? 'Low' : 'OK'}
                    </span>
                  </td>
                  <td className="p-4 text-right flex gap-3 justify-end">
                    <button onClick={() => openModal(item)} className="text-blue-400 hover:text-blue-300"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
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
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">{editingId ? 'Edit' : 'Add'} Item</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white">
                    <option value="ingredient">Ingredient</option>
                    <option value="food">Food</option>
                    <option value="beer">Beer</option>
                    <option value="soft_drink">Soft Drink</option>
                    <option value="spirit">Spirit</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Current Stock</label>
                  <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Min Stock Alert</label>
                  <input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500 text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50">
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