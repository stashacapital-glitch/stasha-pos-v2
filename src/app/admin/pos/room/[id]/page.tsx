 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Loader2, Plus, Minus, User, Home, BedDouble, WifiOff, CloudUpload, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function RoomOrderPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const guestId = searchParams.get('guest_id'); 

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [guest, setGuest] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  // Category State
  const [activeCategory, setActiveCategory] = useState('all');

  // Network & Sync
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const supabase = createClient();

  // --- NETWORK LOGIC ---
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => { setIsOnline(true); toast.success("Online"); syncPendingOrders(); };
    const handleOffline = () => { setIsOnline(false); toast.error("Offline mode active"); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updatePendingCount();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const updatePendingCount = () => {
    const pending = JSON.parse(localStorage.getItem('pending_orders') || '[]');
    setPendingCount(pending.length);
  };

  const syncPendingOrders = async () => {
    const pending = JSON.parse(localStorage.getItem('pending_orders') || '[]');
    if (pending.length === 0) return;
    let count = 0;
    for (const order of pending) {
        const { error } = await supabase.from('orders').insert(order);
        if (!error) count++;
    }
    if (count > 0) { localStorage.removeItem('pending_orders'); updatePendingCount(); toast.success(`${count} synced!`); }
  };
  // ---------------------

  useEffect(() => { if (profile?.org_id && roomId) fetchData(); }, [profile, roomId]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Room Details
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    setRoom(roomData);

    // 2. Guest Details
    if (guestId) { 
      const { data: guestData } = await supabase.from('guests').select('*').eq('id', guestId).single(); 
      setGuest(guestData); 
    }

    // 3. Menu Items
    const { data: menuData } = await supabase.from('menu_items').select('*').eq('org_id', profile?.org_id).eq('is_available', true);
    setMenuItems(menuData || []);

    // 4. Check for Active Order (to enable Print Bill)
    const { data: orderData } = await supabase
      .from('orders')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['pending', 'ready', 'active'])
      .limit(1)
      .maybeSingle();
    
    if (orderData) setActiveOrder(orderData);

    setLoading(false);
  };

  const addToCart = (item: any) => {
    // STOCK CONTROL
    if (item.current_stock !== null && item.current_stock <= 0) { toast.error(`${item.name} is out of stock!`); return; }
    const currentQty = cart.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0);
    if (item.current_stock !== null && (currentQty + 1 > item.current_stock)) { toast.error(`Only ${item.current_stock} left!`); return; }

    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const addRoomCharge = () => {
    if (!room) return;
    const roomItem = { id: null, name: `Room Charge (${room.type})`, price: room.price_per_night, quantity: 1, category: 'room' };
    setCart(prev => [...prev, roomItem]);
    toast.success("Room charge added");
  };

  const updateQuantity = (id: string | null, delta: number) => {
    setCart(prev => prev.map((item) => {
        const isMatch = (id && item.id === id) || (!id && item.id === null);
        if (isMatch) return { ...item, quantity: Math.max(0, item.quantity + delta) };
        return item;
    }).filter(item => item.quantity > 0));
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) { toast.error('Add items first'); return; }
    setSubmitting(true);
    const orderPayload = { org_id: profile.org_id, room_id: roomId, guest_id: guestId, items: cart, total_price: calculateTotal(), status: 'pending' };

    try {
      if (!isOnline) {
        const pending = JSON.parse(localStorage.getItem('pending_orders') || '[]');
        pending.push({ ...orderPayload, id: `local-${Date.now()}`, created_at: new Date().toISOString() });
        localStorage.setItem('pending_orders', JSON.stringify(pending));
        toast.success("Saved locally!"); updatePendingCount(); setCart([]);
      } else {
        const { error } = await supabase.from('orders').insert(orderPayload);
        if (error) throw error;
        await supabase.from('rooms').update({ status: 'occupied' }).eq('id', roomId);
        toast.success('Order Sent!');
        fetchData(); // Refresh to get activeOrder ID
      }
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  const handlePayment = async (method: 'cash' | 'mpesa' | 'card') => {
    if (!isOnline) { toast.error("Cannot process payment offline."); return; }
    if (cart.length === 0) { toast.error('Add items first'); return; }
    
    setSubmitting(true);
    try {
      // Create order first if needed
      let orderId = activeOrder?.id;
      if (!orderId) {
         const { data, error } = await supabase.from('orders').insert({
            org_id: profile.org_id, room_id: roomId, items: cart, total_price: calculateTotal(),
            status: 'pending'
          }).select('id').single();
        if (error) throw error;
        orderId = data.id;
      }

      const { error: payError } = await supabase.from('orders').update({
        status: 'paid', payment_method: method, paid_at: new Date().toISOString()
      }).eq('id', orderId);

      if (payError) throw payError;
      await supabase.from('rooms').update({ status: 'available' }).eq('id', roomId);
      toast.success("Payment Successful!");
      router.push('/admin/pos');
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  // Categories Logic
  const categories = ['soft_drink', 'food', 'beer', 'cigarettes'];
  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(i => i.category === activeCategory);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-900">
      {/* Banners */}
      {!isOnline && (<div className="bg-red-600 text-white text-center text-sm py-1 flex items-center justify-center gap-2 animate-pulse z-50"><WifiOff size={14} /> Offline Mode</div>)}
      {pendingCount > 0 && isOnline && (<div className="bg-blue-600 text-white text-center text-sm py-1 flex items-center justify-center gap-2 z-50"><CloudUpload size={14} /> {pendingCount} pending sync</div>)}

      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-700 p-4 bg-gray-900 z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-purple-900 rounded"><Home className="text-purple-400"/></div>
            <div>
              <h1 className="text-xl font-bold">Room {room?.room_number}</h1>
              <p className="text-xs text-gray-400">{room?.type} - KES {room?.price_per_night}/night</p>
            </div>
          </div>
          <div className="text-right">
             {guest ? <div className="flex items-center gap-2 text-sm text-green-400"><User size={14} /> {guest.full_name}</div> : <div className="text-sm text-gray-500">Walk-in</div>}
             <p className="text-xl font-bold text-orange-400">KES {calculateTotal()}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
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

        {/* RIGHT COLUMN: Cart & Room Charge */}
        <div className="h-full flex flex-col overflow-hidden bg-gray-900">
           
           {/* Room Charge Button */}
           <div className="p-4 border-b border-gray-700 bg-gray-800">
             <button onClick={addRoomCharge} className="w-full py-2 bg-purple-900 text-purple-300 rounded font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-800 transition">
                <BedDouble size={14}/> Add Room Charge (KES {room?.price_per_night})
             </button>
           </div>

           {/* Cart List */}
           <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-2">
             {cart.length === 0 ? <div className="flex items-center justify-center h-full text-gray-500 text-sm">Tap items to add</div> : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                    <div className="flex items-center gap-2">
                       <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 bg-red-600/20 text-red-400 rounded flex items-center justify-center">-</button>
                       <span className="font-bold text-white w-6 text-center">{item.quantity}</span>
                       <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 bg-green-600/20 text-green-400 rounded flex items-center justify-center">+</button>
                       <span className="text-white truncate text-xs ml-1">{item.name}</span>
                    </div>
                    <span className="text-orange-400 text-xs font-mono">KES {item.price * item.quantity}</span>
                  </div>
                ))
             )}
           </div>

           {/* Footer */}
           <div className="flex-shrink-0 border-t border-gray-700 p-4 bg-gray-800 space-y-2">
             <button onClick={handleSubmitOrder} disabled={submitting} className="w-full py-3 bg-orange-500 text-black rounded font-bold">{submitting ? 'Processing...' : 'Send to Kitchen / Bar'}</button>
             
             {/* PRINT BILL BUTTON */}
             {activeOrder && (
                <Link href={`/admin/print/${activeOrder.id}`} target="_blank" className="block">
                    <button className="w-full py-2 bg-gray-600 text-white rounded font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-500">
                        <Printer size={14} /> Print Bill
                    </button>
                </Link>
             )}

             {/* PAYMENT BUTTONS */}
             <div className="grid grid-cols-3 gap-2">
               <button onClick={() => handlePayment('cash')} className="py-2 bg-green-700 rounded text-white text-xs font-bold hover:bg-green-600">Cash</button>
               <button onClick={() => handlePayment('mpesa')} className="py-2 bg-purple-700 rounded text-white text-xs font-bold hover:bg-purple-600">M-Pesa</button>
               <button onClick={() => handlePayment('card')} className="py-2 bg-blue-700 rounded text-white text-xs font-bold hover:bg-blue-600">Card</button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}