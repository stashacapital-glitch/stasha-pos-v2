 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Minus, Send, Printer, User, Home, BedDouble, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function TableOrderPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const tableId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Guest Search (Post to Room)
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [foundGuests, setFoundGuests] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // FIX: Added fallback empty string to role checks
  const canPay = ['admin', 'manager'].includes(profile?.role || '');
  const canBill = ['admin', 'manager', 'waiter', 'bartender'].includes(profile?.role || '');
  const canPostToRoom = ['admin', 'manager', 'waiter', 'bartender'].includes(profile?.role || '');

  useEffect(() => {
    if (profile?.org_id && tableId) fetchData();
  }, [profile, tableId]);

  const fetchData = async () => {
    setLoading(true);
    const menuRes = await supabase.from('menu_items').select('*').eq('org_id', profile?.org_id).eq('is_available', true);
    setMenuItems(menuRes.data || []);

    const orderRes = await supabase
      .from('orders')
      .select('id, guest_id, items, status, total_price, guests(id, full_name)')
      .eq('table_id', tableId)
      .in('status', ['pending', 'preparing', 'ready'])
      .maybeSingle();

    if (orderRes.data) {
      setActiveOrder(orderRes.data);
      setCart(orderRes.data.items || []);
    } else {
      setActiveOrder(null);
      setCart([]);
    }
    setLoading(false);
  };

  const addToCart = (item: any) => {
    if (item.current_stock !== null && item.current_stock <= 0) {
      toast.error(`${item.name} is out of stock!`);
      return;
    }
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // --- SUBMIT ORDER (WAITER) ---
  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (!profile) { toast.error("User not loaded"); return; }
    
    setSubmitting(true);
    try {
      const payload = {
        org_id: profile.org_id,
        table_id: tableId,
        items: cart,
        total_price: total,
        status: 'pending'
      };

      if (activeOrder) {
        await supabase.from('orders').update({ items: cart, total_price: total }).eq('id', activeOrder.id);
        toast.success('Order Updated!');
      } else {
        const { data } = await supabase.from('orders').insert(payload).select('id').single();
        if (data) {
            await supabase.from('tables').update({ status: 'occupied', current_order_id: data.id }).eq('id', tableId);
        }
        toast.success('Order Sent!');
      }
      router.push('/admin/pos');
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  // --- PAYMENT (MANAGER) ---
  const handlePayment = async (method: 'cash' | 'mpesa' | 'card') => {
    if (!activeOrder) { toast.error("No active bill"); return; }
    if (!profile) { toast.error("User not loaded"); return; }
    
    setSubmitting(true);
    try {
      await supabase.from('orders').update({ 
        status: 'paid', 
        payment_method: method, 
        paid_at: new Date().toISOString() 
      }).eq('id', activeOrder.id);

      await supabase.from('tables').update({ status: 'vacant', current_order_id: null }).eq('id', tableId);

      // --- AUTO DEDUCT STOCK ---
      for (const item of activeOrder.items || []) {
        const { data: recipeLinks } = await supabase.from('recipes').select('ingredient_id, quantity').eq('menu_item_id', item.id);
        if (recipeLinks && recipeLinks.length > 0) {
          for (const link of recipeLinks) {
            const qtyToDeduct = link.quantity * item.quantity;
            await supabase.rpc('deduct_stock', { item_id: link.ingredient_id, qty: qtyToDeduct });
          }
        }
      }
      // -------------------------

      toast.success("Payment Successful!");
      router.push('/admin/pos');
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  // --- POST TO ROOM (WAITER) ---
  const handleSearchGuest = async (query: string) => {
    setGuestSearch(query);
    if (query.length < 2) { setFoundGuests([]); return; }
    setSearching(true);
    const { data } = await supabase.from('guests').select('id, full_name, phone, current_room_id, rooms(id, room_number)').eq('org_id', profile?.org_id).or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`).limit(5);
    setFoundGuests(data || []);
    setSearching(false);
  };

  const handleSelectGuest = async (guest: any) => {
    if (!activeOrder) { toast.error("Save order first"); return; }
    if (!guest.current_room_id) { toast.error("Guest is not checked in to a room."); return; }

    setSubmitting(true);
    try {
      // 1. Update Order: Assign to Guest/Room
      await supabase.from('orders').update({
        guest_id: guest.id,
        room_id: guest.current_room_id
      }).eq('id', activeOrder.id);

      // 2. Free up the Table
      await supabase.from('tables').update({ status: 'vacant', current_order_id: null }).eq('id', tableId);

      toast.success(`Posted to Room ${guest.rooms?.room_number}`);
      setShowGuestModal(false);
      router.push('/admin/pos');
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const categories = ['soft_drink', 'food', 'beer'];
  const filteredItems = activeCategory === 'all' ? menuItems : menuItems.filter(i => i.category === activeCategory);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex-shrink-0">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="p-2 bg-orange-900 rounded"><Home className="text-orange-400"/></div>
               <div>
                  <h1 className="text-xl font-bold text-white">Table {tableId}</h1>
               </div>
            </div>
            <p className="text-xl font-bold text-orange-400">KES {total.toLocaleString()}</p>
         </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 overflow-hidden min-h-0">
        
        {/* Left: Menu */}
        <div className="md:col-span-2 space-y-4 overflow-y-auto">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded text-sm whitespace-nowrap ${activeCategory === 'all' ? 'bg-orange-500 text-black' : 'bg-gray-700 text-white'}`}>All</button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded text-sm whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-black' : 'bg-gray-700 text-white'}`}>{cat.replace('_', ' ')}</button>
              ))}
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {filteredItems.map(item => (
                <button key={item.id} onClick={() => addToCart(item)} className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-orange-500 text-left">
                  <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                  <p className="text-orange-400 text-xs mt-1">KES {item.price}</p>
                </button>
              ))}
            </div>
        </div>

        {/* Right: Cart */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <h3 className="text-lg font-bold text-white">Current Order</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {cart.length === 0 ? <p className="text-gray-500 text-center text-sm">Empty</p> : (
              cart.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 bg-red-600/20 text-red-400 rounded flex items-center justify-center text-xs">-</button>
                      <span className="font-bold text-white w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 bg-green-600/20 text-green-400 rounded flex items-center justify-center text-xs">+</button>
                      <span className="text-white truncate text-xs ml-1">{item.name}</span>
                   </div>
                   <span className="text-orange-400 font-mono">KES {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-700 space-y-3 flex-shrink-0 bg-gray-800 rounded-b-xl">
             {canBill && (
                <button onClick={handleSubmit} disabled={submitting || cart.length === 0} className="w-full py-3 bg-orange-500 text-black rounded font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                   <Plus size={16} /> Update Order
                </button>
             )}
             
             {activeOrder && (
               <Link href={`/admin/print/${activeOrder.id}`} target="_blank" className="block">
                 <button className="w-full py-2 bg-gray-600 text-white rounded font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-500 mb-2">
                    <Printer size={14} /> Print Bill
                 </button>
               </Link>
             )}

             {/* POST TO ROOM (Waiter/Manager) */}
             {canPostToRoom && activeOrder && (
                <button 
                  onClick={() => setShowGuestModal(true)} 
                  className="w-full py-2 bg-purple-900 border border-purple-600 text-purple-200 rounded text-xs font-bold flex items-center justify-center gap-2"
                >
                  <BedDouble size={14}/> Post to Room
                </button>
             )}
             
             {/* PAYMENT (Admin/Manager) */}
             {canPay && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                   <button onClick={() => handlePayment('cash')} disabled={!activeOrder} className="py-2 bg-green-700 rounded text-white text-xs font-bold disabled:opacity-50">Cash</button>
                   <button onClick={() => handlePayment('mpesa')} disabled={!activeOrder} className="py-2 bg-purple-700 rounded text-white text-xs font-bold disabled:opacity-50">M-Pesa</button>
                   <button onClick={() => handlePayment('card')} disabled={!activeOrder} className="py-2 bg-blue-700 rounded text-white text-xs font-bold disabled:opacity-50">Card</button>
                </div>
             )}
           </div>
        </div>
      </div>

      {/* POST TO ROOM MODAL */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">Post to Room</h2>
            <input placeholder="Search Guest Name..." value={guestSearch} onChange={(e) => handleSearchGuest(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white mb-4"/>
            {searching && <Loader2 className="animate-spin mx-auto text-orange-400" />}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {foundGuests.map(g => (
                <button key={g.id} onClick={() => handleSelectGuest(g)} disabled={submitting} className="w-full text-left p-3 bg-gray-700 rounded hover:bg-purple-900 border border-gray-600 disabled:opacity-50">
                  <p className="font-bold text-white">{g.full_name}</p>
                  <p className="text-xs text-gray-400">{g.phone} | Room: {g.rooms?.room_number || 'N/A'}</p>
                </button>
              ))}
              {guestSearch.length > 2 && foundGuests.length === 0 && !searching && (
                 <p className="text-center text-gray-500 text-sm py-4">No checked-in guests found.</p>
              )}
            </div>
            <button onClick={() => setShowGuestModal(false)} className="mt-4 w-full py-2 bg-gray-600 rounded text-white text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}