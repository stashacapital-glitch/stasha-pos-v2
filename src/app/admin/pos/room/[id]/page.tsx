 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Plus, Minus, User, Home, BedDouble, WifiOff, CloudUpload, Printer, Search, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function RoomOrderPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [guest, setGuest] = useState<any>(null); 
  const [activeOrder, setActiveOrder] = useState<any>(null);

  // Guest Search
  const [showGuestSearch, setShowGuestSearch] = useState(false);
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [guestList, setGuestList] = useState<any[]>([]);

  // Staff
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Tax Settings
  const [taxSettings, setTaxSettings] = useState<any>(null);

  const [activeCategory, setActiveCategory] = useState('all');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const supabase = createClient();

  // --- NETWORK LOGIC ---
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => { setIsOnline(true); syncPendingOrders(); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updatePendingCount();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const updatePendingCount = () => setPendingCount(JSON.parse(localStorage.getItem('pending_orders') || '[]').length);
  const syncPendingOrders = async () => { /* omitted */ };

  useEffect(() => { if (profile?.org_id && roomId) fetchData(); }, [profile, roomId]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    setRoom(roomData);

    const { data: menuData } = await supabase.from('menu_items').select('*').eq('org_id', profile?.org_id).eq('is_available', true);
    setMenuItems(menuData || []);

    const { data: allocatedGuest } = await supabase.from('guests').select('*').eq('current_room_id', roomId).maybeSingle();
    if (allocatedGuest) setGuest(allocatedGuest);

    const { data: orderData } = await supabase.from('orders').select('id, guest_id, items, staff_id, staff(id, full_name), guests(id, full_name)').eq('room_id', roomId).in('status', ['pending', 'ready', 'active']).limit(1).maybeSingle();
    
    if (orderData) {
      setActiveOrder(orderData);
      if (orderData.items) setCart(orderData.items);
      if (orderData.guests) setGuest(orderData.guests);
      if (orderData.staff) setSelectedStaff(orderData.staff);
    }

    const { data: staffData } = await supabase.from('staff').select('id, full_name, role').eq('is_active', true);
    if (staffData) setStaff(staffData);

    const { data: profileData } = await supabase.from('profiles').select('tax_rate, service_charge_rate, tax_enabled, service_charge_enabled').eq('id', profile?.id).single();
    if (profileData) setTaxSettings(profileData);

    setLoading(false);
  };

  // --- GUEST SEARCH LOGIC ---
  const searchGuests = async (query: string) => {
    if (!query || !profile?.org_id) { setGuestList([]); return; }
    const { data } = await supabase.from('guests').select('id, full_name, phone, current_room_id').eq('org_id', profile.org_id).or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`).limit(5);
    if (data) setGuestList(data);
  };

  // --- HELPER: ADD ROOM CHARGE ---
  const addRoomChargeToCart = (isOverstay: boolean = false) => {
    if (!room) return;
    const chargeName = isOverstay ? `Overstay Charge (${room.type})` : `Room Charge (${room.type})`;
    // For overstay, we charge full day? Or half? Assuming full day control.
    const price = room.price_per_night; 
    
    setCart(prev => {
        // Prevent duplicate overstay charges for the same logic
        if(isOverstay && prev.some(i => i.name === chargeName)) return prev;
        return [...prev, { id: `room-charge-${Date.now()}`, name: chargeName, price: price, quantity: 1, category: 'room', is_room_charge: true }];
    });
    toast.success(isOverstay ? "Overstay charge added!" : "Room charge added");
  };

  const selectGuest = async (selectedGuest: any) => {
    if (selectedGuest.current_room_id && selectedGuest.current_room_id !== roomId) { toast.error("This guest is already checked into another room!"); return; }
    
    setGuest(selectedGuest); 
    setShowGuestSearch(false); 
    setGuestSearchQuery(''); 
    setGuestList([]);
    
    if (activeOrder?.id) {
       await supabase.from('orders').update({ guest_id: selectedGuest.id }).eq('id', activeOrder.id);
       setActiveOrder((prev: any) => ({ ...prev, guest_id: selectedGuest.id, guests: selectedGuest }));
    }
    
    await supabase.from('rooms').update({ current_guest_id: selectedGuest.id, status: 'occupied' }).eq('id', roomId);
    await supabase.from('guests').update({ current_room_id: roomId }).eq('id', selectedGuest.id);
    
    // AUTO-CHARGE: First Night
    // Only add if cart is empty (new check-in basically)
    if (cart.length === 0) {
        addRoomChargeToCart(false);
    }

    toast.success(`Assigned ${selectedGuest.full_name}`);
  };

  // --- CART LOGIC ---
  const addToCart = (item: any) => {
    if (item.current_stock !== null && item.current_stock <= 0) { toast.error(`${item.name} is out of stock!`); return; }
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string | null, delta: number) => setCart(prev => prev.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  
  // --- CALCULATION WITH TAX ---
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let taxAmount = 0;
    let serviceAmount = 0;

    if (taxSettings?.tax_enabled) taxAmount = subtotal * (taxSettings.tax_rate || 0);
    if (taxSettings?.service_charge_enabled) serviceAmount = subtotal * (taxSettings.service_charge_rate || 0);

    const total = subtotal + taxAmount + serviceAmount;

    return { 
      subtotal: Math.round(subtotal * 100) / 100, 
      taxAmount: Math.round(taxAmount * 100) / 100, 
      serviceAmount: Math.round(serviceAmount * 100) / 100, 
      grandTotal: Math.round(total * 100) / 100 
    };
  };

  const totals = calculateTotals();

  // --- AUTOMATIC OVERSTAY CHECK ---
  useEffect(() => {
    if (guest && room && cart.length > 0) {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Logic: If past 10 AM (10:00)
        if (currentHour >= 10) {
            // Check if we already have an "Overstay Charge" in cart
            const hasOverstay = cart.some(i => i.name.includes('Overstay'));
            // Check if we have a standard Room Charge
            const hasStandardCharge = cart.some(i => i.name.includes('Room Charge') && !i.name.includes('Overstay'));

            // If they are still in room and haven't been charged for overstay
            if (!hasOverstay && hasStandardCharge) {
                // We need to be careful not to spam this. 
                // Only trigger once logic or let user trigger?
                // For "Control Purpose", let's auto-add but warn.
                // Actually, better to check if the guest checked in YESTERDAY.
                // We can't easily check "check-in date" without storing it.
                // Simple Logic: If it's past 10AM and they have a room charge, assume they might be overstaying if they didn't checkout.
                
                // REFINED LOGIC:
                // If current cart has "Room Charge" but NO "Overstay Charge" AND time > 10:00 AM
                // We prompt or auto-add.
                // To avoid infinite loops, we use a ref or check item name.
                
                // Let's just auto-add for now as requested "automatic"
                // But to prevent adding EVERY render, we check specific name.
                if (!hasOverstay) {
                   // addRoomChargeToCart(true); 
                   // ^ This might be annoying if I just checked in at 11 AM.
                   // Better logic: Check if "Room Charge" was added "Yesterday". 
                   // Since we don't have timestamps on cart items easily, let's require manual trigger for now, 
                   // OR check the `created_at` of the active order.
                   
                   if (activeOrder?.created_at) {
                       const orderDate = new Date(activeOrder.created_at).toDateString();
                       const today = now.toDateString();
                       // If order was created on a different day, and it's past 10 AM -> OVERSTAY
                       if (orderDate !== today && currentHour >= 10) {
                           if (!hasOverstay) {
                               toast.error(`Overstay Detected! It is past 10:00 AM.`);
                               addRoomChargeToCart(true);
                           }
                       }
                   }
                }
            }
        }
    }
  }, [guest, room, cart, activeOrder]);

  // --- SUBMIT ORDER ---
  const handleSubmitOrder = async () => {
    if (cart.length === 0) { toast.error('Add items first'); return; }
    if (!guest) { toast.error("Assign a guest to the room before billing."); return; }
    if (!profile) { toast.error("User profile not found."); return; } 
    
    setSubmitting(true);
    
    try {
      if (activeOrder?.id) {
        const { error } = await supabase.from('orders').update({ items: cart, total_price: totals.grandTotal, guest_id: guest?.id, staff_id: selectedStaff?.id }).eq('id', activeOrder.id);
        if (error) throw error;
        await supabase.from('order_items').delete().eq('order_id', activeOrder.id);
        const itemsPayload = cart.map(item => ({ order_id: activeOrder.id, menu_item_id: item.is_room_charge ? null : item.id, quantity: item.quantity, price_at_order: item.price }));
        await supabase.from('order_items').insert(itemsPayload);
        toast.success('Order Updated!');
      } else {
        const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
          org_id: profile.org_id, room_id: roomId, guest_id: guest?.id || null, staff_id: selectedStaff?.id, items: cart, total_price: totals.grandTotal, status: 'pending'
        }).select('id').single();
        if (orderError) throw orderError;
        const itemsPayload = cart.map(item => ({ order_id: newOrder.id, menu_item_id: item.is_room_charge ? null : item.id, quantity: item.quantity, price_at_order: item.price }));
        await supabase.from('order_items').insert(itemsPayload);
        setActiveOrder(newOrder);
        toast.success('Order Sent!');
      }
      await supabase.from('rooms').update({ status: 'occupied' }).eq('id', roomId);
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  // --- HANDLE PAYMENT ---
  const handlePayment = async (method: 'cash' | 'mpesa' | 'card') => {
    if (!guest) { toast.error("Assign a guest first."); return; }
    if (cart.length === 0) { toast.error('Add items first'); return; }
    if (!profile) { toast.error("User profile not found."); return; } 
    
    setSubmitting(true);
    try {
      if (!activeOrder?.id) await handleSubmitOrder(); 
      const { data: currentOrder } = await supabase.from('orders').select('id').eq('room_id', roomId).in('status', ['pending', 'ready']).limit(1).single();
      if (!currentOrder) throw new Error("Order creation failed");

      const { error: payError } = await supabase.from('orders').update({
        status: 'paid', payment_method: method, paid_at: new Date().toISOString(), staff_id: selectedStaff?.id, total_price: totals.grandTotal
      }).eq('id', currentOrder.id);

      if (payError) throw payError;
      
      await supabase.from('rooms').update({ status: 'vacant', current_guest_id: null }).eq('id', roomId);
      await supabase.from('guests').update({ current_room_id: null, last_checkout_at: new Date().toISOString() }).eq('id', guest.id);
      
      toast.success("Payment Successful! Guest Checked Out.");
      router.push('/admin/pos');
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  // Helper
  const formatMoney = (amount: number) => amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const categories = ['soft_drink', 'food', 'beer', 'cigarettes'];
  const filteredItems = activeCategory === 'all' ? menuItems : menuItems.filter(i => i.category === activeCategory);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-900 relative">
      {/* Guest Search Modal */}
      {showGuestSearch && ( <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><div className="bg-gray-800 rounded-lg w-full max-w-sm p-4 shadow-xl border border-gray-700"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-white">Assign Guest</h3><button onClick={() => setShowGuestSearch(false)} className="text-gray-400 hover:text-white"><X size={18} /></button></div><div className="relative mb-2"><Search className="absolute left-3 top-3 text-gray-500" size={16} /><input type="text" placeholder="Search name or phone..." value={guestSearchQuery} onChange={(e) => { setGuestSearchQuery(e.target.value); searchGuests(e.target.value); }} className="w-full p-2 pl-9 bg-gray-700 rounded border border-gray-600 text-white" autoFocus /></div><div className="space-y-1 max-h-60 overflow-y-auto">{guestList.map(g => (<button key={g.id} onClick={() => selectGuest(g)} className="w-full text-left p-3 bg-gray-700 rounded hover:bg-purple-900 border border-transparent hover:border-purple-500 transition"><p className="font-medium text-white">{g.full_name}</p><p className="text-xs text-gray-400">{g.phone || 'No phone'}</p></button>))}</div></div></div> )}

      {/* Banners */}
      {!isOnline && (<div className="bg-red-600 text-white text-center text-sm py-1 flex items-center justify-center gap-2 animate-pulse z-40"><WifiOff size={14} /> Offline</div>)}
      {pendingCount > 0 && isOnline && (<div className="bg-blue-600 text-white text-center text-sm py-1 flex items-center justify-center gap-2 z-40"><CloudUpload size={14} /> {pendingCount} pending</div>)}

      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-700 p-4 bg-gray-900 z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4"><div className="p-2 bg-purple-900 rounded"><Home className="text-purple-400"/></div><div><h1 className="text-xl font-bold text-white">Room {room?.room_number}</h1><p className="text-xs text-gray-400">{room?.type} - KES {room?.price_per_night}/night</p></div></div>
          <div className="text-right flex flex-col items-end gap-2">
             <button onClick={() => setShowGuestSearch(true)} className={`flex items-center gap-2 text-sm px-3 py-1 rounded transition ${guest ? 'bg-green-800 text-green-200 border border-green-600' : 'bg-red-800 text-red-200 border border-red-600 animate-pulse'}`}>{guest ? <><User size={12} /> {guest.full_name}</> : <><AlertCircle size={12} /> Assign Guest</>}</button>
             <p className="text-xl font-bold text-orange-400">KES {formatMoney(totals.grandTotal)}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden min-h-0">
        
        {/* LEFT: Menu */}
        <div className="h-full flex flex-col overflow-hidden bg-gray-800 border-r border-gray-700">
          <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700 p-2 flex gap-2 overflow-x-auto"><button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeCategory === 'all' ? 'bg-orange-500 text-black' : 'bg-gray-700 text-gray-300'}`}>All</button>{categories.map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-black' : 'bg-gray-700 text-gray-300'}`}>{cat.replace('_', ' ')}</button>))}</div>
          <div className="flex-1 overflow-y-auto p-4"><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{filteredItems.map(item => { const isOutOfStock = item.current_stock !== null && item.current_stock <= 0; return (<button key={item.id} onClick={() => !isOutOfStock && addToCart(item)} disabled={isOutOfStock} className={`p-3 rounded text-left transition text-sm ${isOutOfStock ? 'bg-gray-900 opacity-50 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'}`}><p className="font-semibold text-white truncate">{item.name}</p><p className="text-orange-400 font-mono text-xs mt-1">KES {item.price}</p></button>); })}</div></div>
        </div>

        {/* RIGHT: Cart */}
        <div className="h-full flex flex-col overflow-hidden bg-gray-900">
           <div className="p-4 border-b border-gray-700 bg-gray-800 space-y-2">
             <select value={selectedStaff?.id || ''} onChange={(e) => setSelectedStaff(staff.find(s => s.id === e.target.value) || null)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white text-xs"><option value="">Select Waiter (Optional)</option>{staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}</select>
             {/* Manual Button removed as it is now automatic, or keep for extra charges? */}
             <button onClick={() => addRoomChargeToCart(false)} className="w-full py-2 bg-purple-900 text-purple-300 rounded font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-800"><BedDouble size={14}/> Add Extra Room Charge</button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-2">
             {cart.length === 0 ? <div className="flex items-center justify-center h-full text-gray-500 text-sm">Tap items</div> : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                    <div className="flex items-center gap-2">
                       <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 bg-red-600/20 text-red-400 rounded flex items-center justify-center">-</button>
                       <span className="font-bold text-white w-6 text-center">{item.quantity}</span>
                       <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 bg-green-600/20 text-green-400 rounded flex items-center justify-center">+</button>
                       <span className="text-white truncate text-xs ml-1">{item.name}</span>
                    </div>
                    <span className="text-orange-400 text-xs font-mono">KES {formatMoney(item.price * item.quantity)}</span>
                  </div>
                ))
             )}
           </div>

           {/* Footer */}
           <div className="flex-shrink-0 border-t border-gray-700 p-4 bg-gray-800 space-y-2">
             <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>KES {formatMoney(totals.subtotal)}</span></div>
                {taxSettings?.tax_enabled && <div className="flex justify-between text-red-400"><span>VAT ({Number(taxSettings.tax_rate) * 100}%):</span><span>KES {formatMoney(totals.taxAmount)}</span></div>}
                {taxSettings?.service_charge_enabled && <div className="flex justify-between text-blue-400"><span>Service ({Number(taxSettings.service_charge_rate) * 100}%):</span><span>KES {formatMoney(totals.serviceAmount)}</span></div>}
             </div>

             <button onClick={handleSubmitOrder} disabled={submitting || !guest} className="w-full py-3 bg-orange-500 text-black rounded font-bold disabled:opacity-50">
               {submitting ? 'Processing...' : (activeOrder ? 'Update Order' : 'Send to Kitchen')}
             </button>
             {activeOrder && (<Link href={`/admin/print/${activeOrder.id}`} target="_blank" className="block"><button className="w-full py-2 bg-gray-600 text-white rounded font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-500"><Printer size={14} /> Print Bill</button></Link>)}
             <div className="grid grid-cols-3 gap-2">
               <button onClick={() => handlePayment('cash')} disabled={!guest} className="py-2 bg-green-700 rounded text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50">Cash</button>
               <button onClick={() => handlePayment('mpesa')} disabled={!guest} className="py-2 bg-purple-700 rounded text-white text-xs font-bold hover:bg-purple-600 disabled:opacity-50">M-Pesa</button>
               <button onClick={() => handlePayment('card')} disabled={!guest} className="py-2 bg-blue-700 rounded text-white text-xs font-bold hover:bg-blue-600 disabled:opacity-50">Card</button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}