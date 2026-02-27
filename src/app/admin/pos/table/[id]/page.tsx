 'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Plus, Minus, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();

  const tableId = (params && params.id) ? String(params.id) : '';
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [tableDisplayName, setTableDisplayName] = useState('N/A');
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchData(profile.org_id);
    } else if (!profile) setLoading(false);
  }, [profile]);

  const fetchData = async (orgId: string) => {
    try {
      setLoading(true);

      // 1. Fetch Table Number
      const { data: tableData } = await supabase
        .from('tables')
        .select('table_number')
        .eq('id', tableId)
        .single();
      
      if (tableData) setTableDisplayName(tableData.table_number || 'N/A');

      // 2. Fetch Menu
      const { data: cats } = await supabase.from('categories').select('*').eq('org_id', orgId).order('name');
      if (cats && cats.length > 0) setActiveCategory(cats[0].id);
      setCategories(cats || []);

      const { data: items } = await supabase.from('menu_items').select('*').eq('org_id', orgId).eq('available', true).order('name');
      setMenuItems(items || []);

      // 3. Check for existing active order (Bill Accumulation)
      const { data: activeOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('org_id', orgId)
        .eq('table_id', tableId)
        .in('status', ['pending', 'ready'])
        .limit(1)
        .maybeSingle();

      if (activeOrder) {
        setCart(activeOrder.items || []);
        setExistingOrderId(activeOrder.id);
      }

    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price_kes: item.price_kes, 
        emoji: item.emoji, 
        quantity: 1,
        is_kitchen_item: item.is_kitchen_item 
      }];
    });
    toast.success(`Added`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.id !== itemId);
    });
  };

  const getTotal = () => cart.reduce((sum, item) => sum + (item.price_kes * item.quantity), 0);

  const handleSubmit = async () => {
    if (cart.length === 0 || !profile?.org_id) return;
    setSending(true);

    try {
      // Identify what types of items are in the cart
      const hasKitchenItems = cart.some(item => item.is_kitchen_item === true);
      const hasBarItems = cart.some(item => item.is_kitchen_item === false);

      if (existingOrderId) {
        // UPDATE EXISTING ORDER
        const updates: any = { 
          items: cart, 
          total_price: getTotal()
        };

        // FIX: If we added Kitchen items, reset Kitchen Status to Pending
        if (hasKitchenItems) updates.kitchen_status = 'pending';
        
        // FIX: If we added Bar items, reset Bar Status to Pending
        if (hasBarItems) updates.bar_status = 'pending';

        const { error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', existingOrderId);
        
        if (error) throw error;
        toast.success('Order Updated!');

      } else {
        // CREATE NEW ORDER
        const { error } = await supabase
          .from('orders')
          .insert({
            org_id: profile.org_id,
            table_id: tableId,
            items: cart,
            total_price: getTotal(),
            status: 'pending',
            kitchen_status: hasKitchenItems ? 'pending' : 'ready', 
            bar_status: hasBarItems ? 'pending' : 'ready'
          });
        
        if (error) throw error;
        toast.success('Order Sent!');
      }
      
      router.push('/admin/pos');
    } catch (err) {
      console.error(err);
      toast.error("Error saving order");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><Loader2 className="animate-spin text-orange-400" /></div>;

  const filteredItems = menuItems.filter(i => i.category_id === activeCategory);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-900 text-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <h1 className="text-xl font-bold">Table {tableDisplayName}</h1>
        </div>
        <div className="flex gap-2 p-3 overflow-x-auto bg-gray-800 border-b border-gray-700">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${activeCategory === cat.id ? 'bg-orange-500 text-black font-bold' : 'bg-gray-700 text-gray-300'}`}>
              {cat.name}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <button key={item.id} onClick={() => addToCart(item)} className="bg-gray-800 p-4 rounded-lg flex flex-col items-center justify-center aspect-square hover:bg-gray-700 border border-gray-700">
                <span className="text-4xl mb-2">{item.emoji}</span>
                <span className="text-sm font-bold text-center truncate w-full">{item.name}</span>
                <span className="text-sm text-orange-400 mt-1">KES {item.price_kes}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-96 bg-gray-800 border-t md:border-t-0 md:border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-orange-400">Current Order</h3>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-red-400 text-xs"><Trash2 size={14}/></button>}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm">
              <span>{item.emoji} {item.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => removeFromCart(item.id)} className="bg-gray-600 w-6 h-6 rounded flex justify-center items-center"><Minus size={12}/></button>
                <span className="w-4 text-center">{item.quantity}</span>
                <button onClick={() => addToCart(menuItems.find(i => i.id === item.id))} className="bg-orange-500 w-6 h-6 rounded flex justify-center items-center text-black"><Plus size={12}/></button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-700 bg-gray-900 space-y-3">
          <div className="flex justify-between text-xl font-bold">
            <span>Total:</span>
            <span className="text-orange-400">KES {getTotal().toLocaleString()}</span>
          </div>
          <button onClick={handleSubmit} disabled={sending || cart.length === 0} className="w-full bg-green-600 py-3 rounded font-bold hover:bg-green-500 disabled:opacity-50">
            {sending ? 'Saving...' : (existingOrderId ? 'Update Order' : 'Send to Kitchen')}
          </button>
        </div>
      </div>
    </div>
  );
}