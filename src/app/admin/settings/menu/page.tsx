'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MenuManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);
  const [activeCategory, setActiveCategory] = useState('all');

  // Modal State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchMenu();
  }, [profile]);

  const fetchMenu = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) toast.error('Failed to load menu');
    if (data) {
      setMenuItems(data);
      // Extract unique categories
      const cats = ['all', ...new Set(data.map((i: any) => i.category))];
      setCategories(cats as string[]);
    }
    setLoading(false);
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setPrice(item.price.toString());
      setCategory(item.category);
      setIsAvailable(item.is_available);
    } else {
      setEditingItem(null);
      setName('');
      setPrice('');
      setCategory('food');
      setIsAvailable(true);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) {
      toast.error("Fill all fields");
      return;
    }
    setSubmitting(true);

    try {
      const payload = {
        name,
        price: Number(price),
        category,
        is_available: isAvailable,
        org_id: profile?.org_id
      };

      let error;
      if (editingItem) {
        const res = await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
        error = res.error;
      } else {
        const res = await supabase.from('menu_items').insert(payload);
        error = res.error;
      }

      if (error) throw error;
      toast.success(`Item ${editingItem ? 'updated' : 'added'}`);
      setShowModal(false);
      fetchMenu();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(i => i.category === activeCategory);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-orange-400">Menu Management</h1>
        <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* CATEGORY TABS ON TOP */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition ${activeCategory === cat ? 'bg-orange-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {cat.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* GRID OF ITEMS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            onClick={() => openModal(item)}
            className={`bg-gray-800 p-4 rounded-lg border cursor-pointer transition hover:border-orange-500 ${!item.is_available ? 'opacity-50 border-dashed border-gray-700' : 'border-gray-700'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-white text-sm truncate">{item.name}</h3>
              {!item.is_available && <span className="text-xs bg-red-900 text-red-300 px-1 rounded">OFF</span>}
            </div>
            <p className="text-orange-400 font-mono font-bold">KES {item.price}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">{item.category.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingItem ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Price (KES)</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600">
                  <option value="food">Food</option>
                  <option value="soft_drink">Soft Drink</option>
                  <option value="beer">Beer</option>
                  <option value="cigarettes">Cigarettes</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} id="available" />
                <label htmlFor="available" className="text-sm text-gray-300">Available for sale</label>
              </div>

              <button type="submit" disabled={submitting} className="w-full py-2 bg-orange-500 text-black rounded font-bold flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}