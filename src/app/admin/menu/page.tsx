 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Plus, Trash2, Edit2, Check, X, Power } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MenuManager() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryKitchen, setNewCategoryKitchen] = useState(true); // Default true for new cats
  const [newItem, setNewItem] = useState({ 
    name: '', price: '', category_id: '', stock: '0', lowThreshold: '10', emoji: '🍽️', isKitchenItem: true 
  });

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryKitchen, setEditingCategoryKitchen] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    const orgId = profile?.org_id;
    
    const { data: cats } = await supabase.from('categories').select('*').eq('org_id', orgId).order('name');
    setCategories(cats || []);

    const { data: items } = await supabase.from('menu_items').select('*, categories(name)').eq('org_id', orgId).order('name');
    setMenuItems(items || []);

    setLoading(false);
  };

  // --- Category Actions ---
  const handleAddCategory = async () => {
    if (!newCategory || !profile?.org_id) return;
    const { error } = await supabase.from('categories').insert({ 
      org_id: profile.org_id, 
      name: newCategory,
      is_kitchen: newCategoryKitchen 
    });
    if (error) toast.error('Error: ' + error.message);
    else { toast.success('Category added!'); setNewCategory(''); setNewCategoryKitchen(true); fetchData(); }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName) return;
    const { error } = await supabase.from('categories').update({ 
      name: editingCategoryName,
      is_kitchen: editingCategoryKitchen 
    }).eq('id', id);
    if (error) toast.error('Error updating');
    else { toast.success('Category updated'); setEditingCategoryId(null); fetchData(); }
  };

  const handleDeleteCategory = async (id: string) => {
    if(!confirm("Delete this category?")) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) toast.error('Error deleting');
    else { toast.success('Category deleted'); fetchData(); }
  };

  // --- Item Actions ---
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category_id) {
      toast.error('Fill Name, Price, and Category');
      return;
    }

    // LOGIC: Determine is_kitchen_item based on selected category
    const selectedCategory = categories.find(c => c.id === newItem.category_id);
    const finalIsKitchen = selectedCategory?.is_kitchen ?? true;

    const openingStock = parseInt(newItem.stock) || 0;

    const { data: insertedItem, error } = await supabase
      .from('menu_items')
      .insert({
        org_id: profile?.org_id,
        name: newItem.name,
        price_kes: parseInt(newItem.price),
        category_id: newItem.category_id,
        stock_quantity: openingStock,
        low_stock_threshold: parseInt(newItem.lowThreshold) || 10,
        emoji: newItem.emoji || '🍽️',
        available: true,
        is_kitchen_item: finalIsKitchen // Set based on category
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Error: ' + error.message);
      return;
    }

    if (insertedItem && openingStock > 0) {
        await supabase.from('stock_transactions').insert({
          org_id: profile?.org_id,
          menu_item_id: insertedItem.id,
          quantity: openingStock,
          transaction_type: 'purchase',
          note: 'Initial Stock Entry'
        });
    }

    toast.success('Item added!');
    setNewItem({ name: '', price: '', category_id: '', stock: '0', lowThreshold: '10', emoji: '🍽️', isKitchenItem: true });
    fetchData();
  };

  const toggleAvailability = async (id: string, currentState: boolean) => {
    const { error } = await supabase.from('menu_items').update({ available: !currentState }).eq('id', id);
    if (error) toast.error('Failed to update');
    else fetchData();
  };

  const deleteItem = async (id: string) => {
    if(!confirm("Delete this item?")) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Item deleted'); fetchData(); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-orange-400 mb-6">Menu Manager</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Categories */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Categories</h2>
          
          {/* Add New Category */}
          <div className="mb-4 space-y-2">
            <input 
              value={newCategory} 
              onChange={(e) => setNewCategory(e.target.value)} 
              placeholder="New Category (e.g. Beverages)" 
              className="w-full p-2 bg-gray-700 rounded text-white text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input 
                type="checkbox" 
                checked={newCategoryKitchen} 
                onChange={(e) => setNewCategoryKitchen(e.target.checked)} 
                className="w-4 h-4 accent-orange-500"
              />
              Sends to Kitchen?
            </label>
            <button onClick={handleAddCategory} className="w-full bg-orange-500 p-2 rounded text-black text-sm font-bold"><Plus size={18} className="inline mr-2"/>Add Category</button>
          </div>

          <ul className="space-y-2 text-sm">
              {categories.map(c => (
                <li key={c.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
                  {editingCategoryId === c.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <input 
                        value={editingCategoryName} 
                        onChange={(e) => setEditingCategoryName(e.target.value)} 
                        className="bg-gray-600 p-1 rounded w-full"
                      />
                      <label className="flex items-center gap-1 text-xs">
                         <input 
                           type="checkbox" 
                           checked={editingCategoryKitchen} 
                           onChange={(e) => setEditingCategoryKitchen(e.target.checked)} 
                           className="w-3 h-3"
                         />
                         Kitchen?
                       </label>
                      <div className="flex gap-1">
                        <button onClick={() => handleUpdateCategory(c.id)} className="text-green-400 p-1 flex-1 border border-green-400 rounded text-xs">Save</button>
                        <button onClick={() => setEditingCategoryId(null)} className="text-gray-400 p-1 flex-1 border border-gray-600 rounded text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span>{c.name}</span>
                        <span className={`ml-2 text-xs px-1 rounded ${c.is_kitchen ? 'bg-blue-900 text-blue-300' : 'bg-pink-900 text-pink-300'}`}>
                          {c.is_kitchen ? 'Kitchen' : 'Bar'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { 
                          setEditingCategoryId(c.id); 
                          setEditingCategoryName(c.name);
                          setEditingCategoryKitchen(c.is_kitchen ?? true);
                        }} className="text-gray-400 hover:text-white p-1"><Edit2 size={14}/></button>
                        <button onClick={() => handleDeleteCategory(c.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14}/></button>
                      </div>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>

        {/* Add Item */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Add New Item</h2>
          <div className="space-y-3">
            <select 
              value={newItem.category_id}
              onChange={(e) => {
                const catId = e.target.value;
                const cat = categories.find(c => c.id === catId);
                setNewItem({...newItem, category_id: catId, isKitchenItem: cat?.is_kitchen ?? true});
              }}
              className="w-full p-2 bg-gray-700 rounded text-sm"
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.is_kitchen ? 'Kitchen' : 'Bar'})</option>)}
            </select>
            <input 
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              placeholder="Item Name"
              className="w-full p-2 bg-gray-700 rounded text-sm"
            />
            
            <div className="flex gap-2">
                <input type="number" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} placeholder="Price" className="flex-1 p-2 bg-gray-700 rounded text-sm" />
                <input value={newItem.emoji} onChange={(e) => setNewItem({...newItem, emoji: e.target.value})} className="w-16 p-2 bg-gray-700 rounded text-center text-sm" />
            </div>

             <div className="flex gap-2">
                <input type="number" value={newItem.stock} onChange={(e) => setNewItem({...newItem, stock: e.target.value})} placeholder="Stock" className="flex-1 p-2 bg-gray-700 rounded text-sm" />
                <input type="number" value={newItem.lowThreshold} onChange={(e) => setNewItem({...newItem, lowThreshold: e.target.value})} placeholder="Low Limit" className="flex-1 p-2 bg-gray-700 rounded text-sm" />
             </div>

            <div className="bg-gray-700 p-2 rounded text-xs text-gray-400">
                This item will be sent to: <span className="font-bold text-white">{newItem.isKitchenItem ? 'Kitchen' : 'Bar'}</span>
                <br/>
                <span className="text-gray-500">(Inherited from category)</span>
            </div>

            <button onClick={handleAddItem} className="w-full bg-green-600 p-2 rounded font-bold hover:bg-green-500 text-sm mt-2">
              Add Item
            </button>
          </div>
        </div>

        {/* Menu List */}
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
                        KES {item.price_kes} | Stock: {item.stock_quantity || 0} | 
                        <span className={item.is_kitchen_item ? 'text-blue-400 ml-1' : 'text-pink-400 ml-1'}>
                            {item.is_kitchen_item ? 'Kitchen' : 'Bar'}
                        </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                   <button onClick={() => toggleAvailability(item.id, item.available)} className={`p-1 rounded text-xs font-bold ${item.available ? 'bg-green-500 text-black' : 'bg-gray-500 text-white'}`}>
                     <Power size={14}/>
                   </button>
                   <button onClick={() => deleteItem(item.id)} className="p-1 bg-red-600 rounded text-xs hover:bg-red-500"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}