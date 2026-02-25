 'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShoppingCart, Send, CreditCard, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TableOrderPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.id as string;
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [existingOrder, setExistingOrder] = useState<any | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchData(profile.org_id);
    }
  }, [profile]);

  const fetchData = async (orgId: string) => {
    setLoading(true);
    
    // Fetch Menu
    const { data: items } = await supabase
      .from('menu_items')
      .select('*, categories(name)')
      .eq('org_id', orgId)
      .eq('available', true);
    setMenuItems(items || []);

    // Check for existing open order
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'open')
      .single();

    if (order) {
      setExistingOrder(order);
      setCart(order.items || []);
    } else {
      setExistingOrder(null);
      setCart([]);
    }

    setLoading(false);
  };

  const addToCart = (item: any) => {
    const exists = cart.find(c => c.id === item.id);
    if (exists) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    const exists = cart.find(c => c.id === itemId);
    if (exists && exists.quantity > 1) {
      setCart(cart.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c));
    } else {
      setCart(cart.filter(c => c.id !== itemId));
    }
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price_kes * item.quantity), 0);

  const saveOrder = async () => {
    if (!profile?.org_id || cart.length === 0) return;

    const payload = {
      org_id: profile.org_id,
      table_id: tableId,
      items: cart,
      total_price: calculateTotal(),
      status: 'open'
    };

    let error;
    if (existingOrder) {
      // Update
      const res = await supabase
        .from('orders')
        .update({ items: cart, total_price: calculateTotal() })
        .eq('id', existingOrder.id);
      error = res.error;
    } else {
      // Create
      const res = await supabase.from('orders').insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error('Failed: ' + error.message);
    } else {
      toast.success('Order Saved!');
      fetchData(profile.org_id); // Refresh to get existingOrder ID
    }
  };

  const closeBill = async () => {
    if (!existingOrder) return;
    
    if (!confirm('Mark this bill as paid and close?')) return;

    const { error } = await supabase
      .from('orders')
      .update({ status: 'closed' })
      .eq('id', existingOrder.id);

    if (error) {
      toast.error('Failed to close bill');
    } else {
      toast.success('Bill Paid! Table is now open.');
      router.push('/admin/pos');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-900 text-white">
      
      {/* Left: Menu */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Menu</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="bg-gray-800 p-3 rounded text-left hover:bg-gray-700 border border-gray-700"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-orange-400 text-xs">KES {item.price_kes}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart & Payment */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold flex items-center gap-2">
            <ShoppingCart size={18} /> Current Order
          </h2>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {cart.map(item => (
            <div key={item.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
              <div>
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-xs text-gray-400">KES {item.price_kes} x {item.quantity}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => removeFromCart(item.id)} className="bg-red-500 w-6 h-6 rounded text-xs">-</button>
                <button onClick={() => addToCart(item)} className="bg-green-500 w-6 h-6 rounded text-xs">+</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <p className="text-gray-500 text-center mt-10">No items</p>}
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-700 space-y-2">
          <div className="flex justify-between mb-2">
            <span>Total:</span>
            <span className="text-orange-400 font-bold text-xl">KES {calculateTotal()}</span>
          </div>

          {/* Save Order Button */}
          <button 
            onClick={saveOrder} 
            className="w-full bg-blue-600 text-white font-bold py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-500"
          >
            <Send size={18} /> {existingOrder ? 'Update Order' : 'Send to Kitchen'}
          </button>

          {/* Payment Button (Only shows if order exists) */}
          {existingOrder && (
            <button 
              onClick={closeBill}
              className="w-full bg-green-600 text-white font-bold py-2 rounded flex items-center justify-center gap-2 hover:bg-green-500"
            >
              <CreditCard size={18} /> Close Bill (Payment)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}