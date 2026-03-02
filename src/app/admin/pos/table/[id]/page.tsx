 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Plus, Minus, Printer, WifiOff, CloudUpload } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function TableOrderPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tableId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  
  // Category State
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Network & Sync State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const supabase = createClient();

  // --- NETWORK & SYNC LOGIC ---
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Syncing pending orders...");
      syncPendingOrders();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You are offline. Orders will be saved locally.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = () => {
    const pending = JSON.parse(localStorage.getItem('pending_orders') || '[]');
    setPendingCount(pending.length);
  };

  const syncPendingOrders = async () => {
    const pending = JSON.parse(localStorage.getItem('pending_orders') || '[]');
    if (pending.length === 0) return;

    let successCount = 0;
    for (const order of pending) {
      try {
        const { error } = await supabase.from('orders').insert(order);
        if (!error) successCount++;
      } catch (e) { console.error("Sync error", e); }
    }

    if (successCount > 0) {
      localStorage.removeItem('pending_orders');
      updatePendingCount();
      toast.success(`${successCount} order(s) synced!`);
    }
  };
  // ----------------------------

  useEffect(() => {
    if (profile?.org_id) {
      fetchMenuItems();
      checkActiveOrder();
    }
  }, [profile]);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('org_id', profile?.org_id)
      .eq('is_available', true)
      .order('category', { ascending: true });

    if (error) toast.error('Failed to load menu');
    else setMenuItems(data || []);
    setLoading(false);
  };

  const checkActiveOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', tableId)
      .in('status', ['pending', 'ready'])
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setActiveOrder(data);
      setCart(data.items || []);
    }
  };

  const addToCart = (item: any) => {
    // 1. STOCK CONTROL
    if (item.current_stock !== null && item.current_stock <= 0) {
      toast.error(`${item.name} is out of stock!`);
      return;
    }

    const currentQty = cart.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0);
    if (item.current_stock !== null && (currentQty + 1 > item.current_stock)) {
      toast.error(`Only ${item.current_stock} left in stock!`);
      return;
    }

    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) { toast.error('Add items to cart first'); return; }

    setSubmitting(true);
    const orderPayload = {
      org_id: profile?.org_id,
      table_id: tableId,
      items: cart,
      total_price: calculateTotal(),
      status: 'pending'
    };

    try {
      if (!isOnline) {
        // OFFLINE MODE
        const pending = JSON.parse(localStorage.getItem('pending_orders') || '[]');
        pending.push({ ...orderPayload, id: `local-${Date.now()}`, created_at: new Date().toISOString() });
        localStorage.setItem('pending_orders', JSON.stringify(pending));
        
        toast.success("Order saved locally! Will sync when online.");
        updatePendingCount();
        setCart([]);
        setActiveOrder(null); // Reset view
      } else {
        // ONLINE MODE
        if (activeOrder) {
          const { error } = await supabase
            .from('orders')
            .update({ items: cart, total_price: calculateTotal() })
            .eq('id', activeOrder.id);
          if (error) throw error;
          toast.success('Order Updated!');
        } else {
          const { error } = await supabase.from('orders').insert(orderPayload);
          if (error) throw error;
          toast.success('Order Sent!');
        }
        router.push('/admin/pos');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (method: 'cash' | 'mpesa' | 'card') => {
    if (!isOnline) {
      toast.error("Cannot process payment offline.");
      return;
    }
    // ... (Existing payment logic remains same)
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  // Categories Logic
  const categories = ['soft_drink', 'food', 'beer', 'cigarettes'];
  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(i => i.category === activeCategory);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-900">
      
      {/* OFFLINE BANNER */}
      {!isOnline && (
        <div className="bg-red-600 text-white text-center text-sm py-1 flex items-center justify-center gap-2 animate-pulse z-50">
          <WifiOff size={14} /> You are Offline. Orders will be saved locally.
        </div>
      )}
      {pendingCount > 0 && isOnline && (
        <div className="bg-blue-600 text-white text-center text-sm py-1 flex items-center justify-center gap-2 z-50">
          <CloudUpload size={14} /> {pendingCount} order(s) pending sync.
        </div>
      )}

      {/* HEADERS */}
      <div className="flex-shrink-0 grid grid-cols-2 border-b border-gray-700 bg-gray-900 z-20">
        <div className="p-4 border-r border-gray-700"><h1 className="text-xl font-bold text-white">Table Order</h1></div>
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Current Order</h1>
          <div className="text-right">
            <p className="text-xl font-bold text-orange-400">KES {calculateTotal()}</p>
            <p className="text-xs text-gray-400">{cart.length} items</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: Menu */}
        <div className="h-full flex flex-col overflow-hidden bg-gray-800 border-r border-gray-700">
          
          {/* CATEGORY TABS */}
          <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700 p-2 flex gap-2 overflow-x-auto">
            <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition ${activeCategory === 'all' ? 'bg-orange-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition ${activeCategory === cat ? 'bg-orange-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{cat.replace('_', ' ')}</button>
            ))}
          </div>

          {/* MENU LIST */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredItems.map(item => {
                 const isOutOfStock = item.current_stock !== null && item.current_stock <= 0;
                 return (
                   <button key={item.id} onClick={() => !isOutOfStock && addToCart(item)} disabled={isOutOfStock} className={`p-3 rounded text-left transition text-sm shadow-sm ${isOutOfStock ? 'bg-gray-900 opacity-50 cursor-not-allowed border border-dashed border-gray-700' : 'bg-gray-700 hover:bg-gray-600 active:scale-95'}`}>
                     <p className="font-semibold text-white truncate">{item.name}</p>
                     <p className="text-orange-400 font-mono text-xs mt-1">KES {item.price}</p>
                     {item.current_stock !== null && item.current_stock <= 5 && !isOutOfStock && (<p className="text-red-400 text-[10px] mt-1">{item.current_stock} left</p>)}
                     {isOutOfStock && (<p className="text-red-500 text-[10px] mt-1 font-bold">OUT OF STOCK</p>)}
                   </button>
                 );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="h-full flex flex-col overflow-hidden bg-gray-900">
           <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-2">
             {cart.length === 0 ? (<div className="flex items-center justify-center h-full text-gray-500"><p className="text-center text-sm">Tap items on the left to add</p></div>) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                       <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 bg-red-600/20 text-red-400 rounded font-bold flex items-center justify-center hover:bg-red-600 hover:text-white transition"><Minus size={14} /></button>
                          <span className="font-bold text-white w-6 text-center text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 bg-green-600/20 text-green-400 rounded font-bold flex items-center justify-center hover:bg-green-600 hover:text-white transition"><Plus size={14} /></button>
                       </div>
                       <span className="text-white truncate text-sm">{item.name}</span>
                    </div>
                    <div className="text-right pl-2">
                       <span className="text-orange-400 font-mono text-sm font-semibold">KES {item.price * item.quantity}</span>
                    </div>
                  </div>
                ))
             )}
           </div>

           {/* FOOTER */}
           <div className="flex-shrink-0 border-t border-gray-700 p-4 bg-gray-800 space-y-2 shadow-lg">
             <div className="grid grid-cols-2 gap-2">
                <button onClick={handleSubmitOrder} disabled={submitting} className="py-3 bg-orange-500 text-black rounded-lg font-bold text-base disabled:opacity-50 hover:bg-orange-400 transition">{submitting ? 'Processing...' : 'Send to Kitchen'}</button>
                {activeOrder && (<Link href={`/admin/print/${activeOrder.id}`} target="_blank" className="block"><button className="w-full py-3 bg-gray-600 text-white rounded-lg font-bold text-base hover:bg-gray-500 transition flex items-center justify-center gap-2"><Printer size={16} /> Print Bill</button></Link>)}
             </div>
             <div className="grid grid-cols-3 gap-2">
               <button onClick={() => handlePayment('cash')} className="py-2.5 bg-green-700 rounded text-white text-sm font-bold hover:bg-green-600 transition">Cash</button>
               <button onClick={() => handlePayment('mpesa')} className="py-2.5 bg-purple-700 rounded text-white text-sm font-bold hover:bg-purple-600 transition">M-Pesa</button>
               <button onClick={() => handlePayment('card')} className="py-2.5 bg-blue-700 rounded text-white text-sm font-bold hover:bg-blue-600 transition">Card</button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}