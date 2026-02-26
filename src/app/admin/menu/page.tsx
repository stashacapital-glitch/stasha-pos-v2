 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate'; // 1. Import the Gate
import { Loader2, Plus, Trash2, Edit2, Check, X, Power } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MenuManager() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  
  // Form States
  const [newCategory, setNewCategory] = useState('');
  const [newItem, setNewItem] = useState({ 
    name: '', price: '', category_id: '', stock: '0', lowThreshold: '10', emoji: '🍽️' 
  });

  // Edit State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    const orgId = profile?.org_id;
    
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('org_id', orgId)
      .order('name');
    setCategories(cats || []);

    const { data: items } = await supabase
      .from('menu_items')
      .select('*, categories(name)')
      .eq('org_id', orgId)
      .order('name');
    setMenuItems(items || []);

    setLoading(false);
  };

  // --- Category Actions ---
  const handleAddCategory = async () => {
    if (!newCategory || !profile?.org_id) return;
    
    const { error } = await supabase
      .from('categories')
      .insert({ org_id: profile.org_id, name: newCategory });

    if (error) toast.error('Error: ' + error.message);
    else {
      toast.success('Category added!');
      setNewCategory('');
      fetchData();
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName) return;
    const { error } = await supabase
      .from('categories')
      .update({ name: editingCategoryName })
      .eq('id', id);

    if (error) toast.error('Error updating');
    else {
      toast.success('Category updated');
      setEditingCategoryId(null);
      fetchData();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if(!confirm("Delete this category? Items in this category will become uncategorized.")) return;
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) toast.error('Error deleting');
    else {
      toast.success('Category deleted');
      fetchData();
    }
  };

  // --- Item Actions ---
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category_id) {
      toast.error('Fill Name, Price, and Category');
      return;
    }

    const { error } = await supabase.from('menu_items').insert({
      org_id: profile?.org_id,
      name: newItem.name,
      price_kes: parseInt(newItem.price),
      category_id: newItem.category_id,
      stock_quantity: parseInt(newItem.stock) || 0,
      low_stock_threshold: parseInt(newItem.lowThreshold) || 10,
      emoji: newItem.emoji || '🍽️',
      available: true
    });

    if (error) toast.error('Error: ' + error.message);
    else {
      toast.success('Item added!');
      setNewItem({ name: '', price: '', category_id: '', stock: '0', lowThreshold: '10', emoji: '🍽️' });
      fetchData();
    }
  };

  const toggleAvailability = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ available: !currentState })
      .eq('id', id);
    
    if (error) toast.error('Failed to update');
    else fetchData();
  };

  const deleteItem = async (id: string) => {
    if(!confirm("Delete this item permanently?")) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
        toast.success('Item deleted');
        fetchData();
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    // 2. Wrap the entire page content in PermissionGate
    <PermissionGate 
      allowedRoles={['owner', 'admin']} 
      fallback={
        <div className="p-8 text-center mt-20">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-400">You do not have permission to manage the menu.</p>
        </div>
      }
    >
      <div className="p-8">
        <h1 className="text-3xl font-bold text-orange-400 mb-6">Menu Manager</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Col 1: Categories */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Categories</h2>
            <div className="flex gap-2 mb-4">
              <input 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)} 
                placeholder="New Category" 
                className="flex-1 p-2 bg-gray-700 rounded text-white text-sm"
              />
              <button onClick={handleAddCategory} className="bg-orange-500 p-2 rounded text-black"><Plus size={18}/></button>
            </div>
            <ul className="space-y-2 text-sm">
                {categories.map(c => (
                  <li key={c.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
                    {editingCategoryId === c.id ? (
                      <div className="flex gap-1 flex-1">
                        <input 
                          value={editingCategoryName} 
                          onChange={(e) => setEditingCategoryName(e.target.value)} 
                          className="bg-gray-600 p-1 rounded flex-1"
                        />
                        <button onClick={() => handleUpdateCategory(c.id)} className="text-green-400 p-1"><Check size={16}/></button>
                        <button onClick={() => setEditingCategoryId(null)} className="text-red-400 p-1"><X size={16}/></button>
                      </div>
                    ) : (
                      <>
                        <span>{c.name}</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => { setEditingCategoryId(c.id); setEditingCategoryName(c.name); }} 
                            className="text-gray-400 hover:text-white p-1"
                          >
                            <Edit2 size={14}/>
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(c.id)} 
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
            </ul>
          </div>

          {/* Col 2: Add Item */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Add New Item</h2>
            <div className="space-y-3">
              <select 
                value={newItem.category_id}
                onChange={(e) => setNewItem({...newItem, category_id: e.target.value})}
                className="w-full p-2 bg-gray-700 rounded text-sm"
              >
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input 
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                placeholder="Item Name"
                className="w-full p-2 bg-gray-700 rounded text-sm"
              />
              <div className="flex gap-2">
                  <input 
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    placeholder="Price (KES)"
                    className="flex-1 p-2 bg-gray-700 rounded text-sm"
                  />
                  <input 
                    value={newItem.emoji}
                    onChange={(e) => setNewItem({...newItem, emoji: e.target.value})}
                    className="w-16 p-2 bg-gray-700 rounded text-center text-sm"
                  />
              </div>
               <input 
                type="number"
                value={newItem.stock}
                onChange={(e) => setNewItem({...newItem, stock: e.target.value})}
                placeholder="Opening Stock (Qty)"
                className="w-full p-2 bg-gray-700 rounded text-sm"
              />
               <input 
                type="number"
                value={newItem.lowThreshold}
                onChange={(e) => setNewItem({...newItem, lowThreshold: e.target.value})}
                placeholder="Low Stock Limit (e.g. 10)"
                className="w-full p-2 bg-gray-700 rounded text-sm"
              />
              <button onClick={handleAddItem} className="w-full bg-green-600 p-2 rounded font-bold hover:bg-green-500 text-sm">
                Add Item
              </button>
            </div>
          </div>

          {/* Col 3: Current Menu List */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Current Menu ({menuItems.length})</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {menuItems.map(item => (
                <div key={item.id} className="bg-gray-700 p-3 rounded flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.emoji}</span>
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-gray-400">
                          KES {item.price_kes} | Stock: {item.stock_quantity || 0} (Min: {item.low_stock_threshold || 10})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                     <button 
                      onClick={() => toggleAvailability(item.id, item.available)}
                      title={item.available ? "Item is ON (Visible in POS)" : "Item is OFF (Hidden in POS)"}
                      className={`p-1 rounded text-xs font-bold ${item.available ? 'bg-green-500 text-black' : 'bg-gray-500 text-white'}`}
                     >
                       <Power size={14}/>
                     </button>
                     <button 
                      onClick={() => deleteItem(item.id)} 
                      title="Delete Item"
                      className="p-1 bg-red-600 rounded text-xs hover:bg-red-500"
                     >
                       <Trash2 size={14}/>
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </PermissionGate>
  );
}