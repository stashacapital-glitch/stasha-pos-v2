 'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShoppingCart, Send } from 'lucide-react';
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
    
    // Fetch Menu Items
    const { data: items } = await supabase
      .from('menu_items')
      .select('*, categories(name)')
      .eq('org_id', orgId)
      .eq('available', true);
    setMenuItems(items || []);

    // Check for existing open order for this table
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'pending') // Check for pending orders (active in kitchen)
      .single();

    if (order) {
      setExistingOrder(order);
      setCart(order.items || []);
    } else {
        // Also check for 'open' orders (created but not sent to kitchen yet)
        const { data: openOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('table_id', tableId)
        .eq('status', 'open')
        .single();
        
        if (openOrder) {
            setExistingOrder(openOrder);
            setCart(openOrder.items || []);
        }
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
    if (!profile?.org_id || cart.length === 0) {
        toast.error("Add items to cart first.");
        return;
    }

    const payload = {
      org_id: profile.org_id,
      table_id: tableId,
      items: cart,
      total_price: calculateTotal(),
      status: 'pending' // Default status: Sent to Kitchen
    };

    let error;
    if (existingOrder) {
      // Update existing order
      const res = await supabase
        .from('orders')
        .update({ items: cart, total_price: calculateTotal() })
        .eq('id', existingOrder.id);
      error = res.error;
    } else {
      // Create new order
      const res = await supabase.from('orders').insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error('Failed: ' + error.message);
    } else {
      toast.success('Order Sent to Kitchen!');
      router.push('/admin/pos');
    }
  };

  // Function to print bill (placeholder for future)
  const printBill = () => {
      toast("Printing not implemented yet");
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-900 text-white">
      
      {/* Left: Menu */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-orange-400">Menu</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="bg-gray-800 p-3 rounded text-left hover:bg-gray-700 border border-gray-700 active:scale-95 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-orange-400 text-xs font-mono">KES {item.price_kes}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold flex items-center gap-2 text-lg">
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
                <button onClick={() => removeFromCart(item.id)} className="bg-red-500 w-6 h-6 rounded text-xs font-bold">-</button>
                <span className="px-2">{item.quantity}</span>
                <button onClick={() => addToCart(item)} className="bg-green-500 w-6 h-6 rounded text-xs font-bold">+</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <p className="text-gray-500 text-center mt-10">Tap items to add</p>}
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-700">
          <div className="flex justify-between mb-4 text-lg">
            <span>Total:</span>
            <span className="text-orange-400 font-bold text-xl">KES {calculateTotal()}</span>
          </div>
          
          <button 
            onClick={saveOrder} 
            disabled={cart.length === 0}
            className="w-full bg-orange-500 text-black font-bold py-3 rounded flex items-center justify-center gap-2 hover:bg-orange-400 disabled:opacity-50"
          >
            <Send size={18} /> Send to Kitchen
          </button>
        </div>
      </div>
    </div>
  );
}