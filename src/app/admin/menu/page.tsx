 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MenuManager() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('food'); // Default
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => { if (profile?.org_id) fetchItems(); }, [profile]);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('category', { ascending: true });

    setItems(data || []);
    setLoading(false);
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditing(item);
      setName(item.name);
      setPrice(String(item.price || 0));
      setCategory(item.category || 'food');
    } else {
      setEditing(null); setName(''); setPrice(''); setCategory('food');
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name || !price) { toast.error("Name and Price required"); return; }
    
    const payload = { 
      name, 
      price: Number(price), 
      category, 
      org_id: profile?.org_id,
      is_available: true 
    };

    setSubmitting(true);
    let error;
    if (editing) {
      const res = await supabase.from('menu_items').update(payload).eq('id', editing.id);
      error = res.error;
    } else {
      const res = await supabase.from('menu_items').insert(payload);
      error = res.error;
    }

    if (error) toast.error(error.message);
    else {
      toast.success(`Item ${editing ? 'updated' : 'added'}`);
      setShowModal(false);
      fetchItems();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this item?")) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if(error) toast.error(error.message);
    else {
      toast.success('Deleted');
      fetchItems();
    }
  };

  // Filter items by search
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-orange-400">Menu Manager</h1>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search menu..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded w-full"
            />
          </div>
          <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex gap-2 items-center hover:bg-orange-400">
            <Plus size={18} /> Add Item
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 border-b border-gray-700 text-gray-400 sticky top-0">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-700/50">
                <td className="p-4 font-medium">{item.name}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded font-bold ${
                    item.category === 'food' ? 'bg-orange-900 text-orange-300' :
                    item.category === 'beer' ? 'bg-yellow-900 text-yellow-300' :
                    item.category === 'spirits' || item.category === 'whiskies' || item.category === 'tots' ? 'bg-blue-900 text-blue-300' :
                    item.category === 'wine' ? 'bg-red-900 text-red-300' :
                    'bg-gray-600 text-gray-300'
                  }`}>
                    {item.category?.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 font-mono text-green-400">KES {Number(item.price || 0).toLocaleString()}</td>
                <td className="p-4 text-right">
                  <button onClick={() => openModal(item)} className="text-blue-400 hover:text-blue-300 mr-3"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-6">{editing ? 'Edit Item' : 'Add New Item'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Item Name</label>
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600" 
                  placeholder="e.g. Pilsner"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Price (KES)</label>
                <input 
                  type="number"
                  value={price} 
                  onChange={e => setPrice(e.target.value)} 
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600" 
                  placeholder="e.g. 300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                >
                  <optgroup label="Kitchen">
                    <option value="food">Food</option>
                  </optgroup>
                  <optgroup label="Bar">
                    <option value="beer">Beer</option>
                    <option value="spirits">Spirits</option>
                    <option value="whiskies">Whiskies</option>
                    <option value="wine">Wine</option>
                    <option value="soft_drink">Soft Drink</option>
                    <option value="kegs">Kegs</option>
                    <option value="tots">Tots</option>
                    <option value="cigarettes">Cigarettes</option>
                    <option value="general">General</option>
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  * "Food" goes to Kitchen. All others go to Bar.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-3 bg-gray-600 rounded font-bold hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={submitting}
                  className="flex-1 py-3 bg-orange-500 text-black font-bold rounded hover:bg-orange-400 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}