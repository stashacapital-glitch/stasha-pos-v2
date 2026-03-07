'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Trash2, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';

export default function RecipesPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  const [selectedDish, setSelectedDish] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Dishes (Non-ingredients)
    const { data: dishes } = await supabase
      .from('menu_items')
      .select('id, name')
      .eq('org_id', profile?.org_id)
      .eq('is_ingredient', false);
    if (dishes) setMenuItems(dishes);

    // Fetch Ingredients
    const { data: ings } = await supabase
      .from('menu_items')
      .select('id, name, current_stock')
      .eq('org_id', profile?.org_id)
      .eq('is_ingredient', true);
    if (ings) setIngredients(ings);

    // Fetch Existing Recipes
    const { data: recs } = await supabase
      .from('recipes')
      .select('id, quantity, menu_items(name), ingredients:ingredient_id(name)');
    if (recs) setRecipes(recs);

    setLoading(false);
  };

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDish || !selectedIngredient || !quantity) {
      toast.error("Select dish, ingredient and quantity");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('recipes').insert({
      org_id: profile?.org_id,
      menu_item_id: selectedDish,
      ingredient_id: selectedIngredient,
      quantity: parseFloat(quantity)
    });

    if (error) {
      toast.error("Error adding recipe (maybe it already exists?)");
    } else {
      toast.success("Ingredient linked!");
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('recipes').delete().eq('id', id);
    fetchData();
    toast.success("Removed");
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager', 'chef']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-orange-400 mb-6">Recipe Manager</h1>
        <p className="text-gray-400 mb-6">Link ingredients to menu items. When an item is sold, stock is deducted automatically.</p>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8 max-w-xl">
          <h2 className="text-lg font-bold text-white mb-4">Add Ingredient to Dish</h2>
          <form onSubmit={handleAddRecipe} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dish (Menu Item)</label>
              <select value={selectedDish} onChange={(e) => setSelectedDish(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white">
                <option value="">Select Dish</option>
                {menuItems.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ingredient</label>
                <select value={selectedIngredient} onChange={(e) => setSelectedIngredient(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white">
                  <option value="">Select Ingredient</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.current_stock})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Qty Needed</label>
                <input type="number" step="0.1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full py-2 bg-blue-600 text-white rounded font-bold">
              {submitting ? 'Saving...' : 'Link Ingredient'}
            </button>
          </form>
        </div>

        {/* List of Recipes */}
        <div className="space-y-4">
          {menuItems.map(dish => {
            const dishRecipes = recipes.filter(r => r.menu_items?.name === dish.name);
            if (dishRecipes.length === 0) return null;
            return (
              <div key={dish.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-2">{dish.name}</h3>
                <div className="space-y-2">
                  {dishRecipes.map((r: any) => (
                    <div key={r.id} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Link2 size={14} className="text-orange-400" />
                        <span>{r.ingredients?.name || 'Unknown'}</span>
                        <span className="text-gray-500">x{r.quantity}</span>
                      </div>
                      <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PermissionGate>
  );
}