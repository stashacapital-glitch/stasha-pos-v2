 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Minus, Send, Printer, User, Home, BedDouble, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function RoomOrderPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [guest, setGuest] = useState<any>(null); 
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const [staff, setStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [taxSettings, setTaxSettings] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const canPay = ['admin', 'manager'].includes(profile?.role);
  const canBill = ['admin', 'manager', 'room_manager'].includes(profile?.role);
  const canPrint = ['admin', 'manager', 'room_manager', 'bartender'].includes(profile?.role);

  useEffect(() => {
    if (profile?.org_id && roomId) fetchData();
  }, [profile, roomId]);

  const fetchData = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    setRoom(roomData);

    const { data: menuData } = await supabase.from('menu_items').select('*').eq('org_id', profile?.org_id).eq('is_available', true);
    setMenuItems(menuData || []);

    const { data: allocatedGuest } = await supabase.from('guests').select('*').eq('current_room_id', roomId).maybeSingle();
    if (allocatedGuest) setGuest(allocatedGuest);

    const { data: orderData } = await supabase
      .from('orders')
      .select('id, guest_id, items, created_at, staff_id, staff(id, full_name), guests(id, full_name)')
      .eq('room_id', roomId)
      .in('status', ['pending', 'ready', 'active'])
      .limit(1)
      .maybeSingle();
    
    if (orderData) {
      setActiveOrder(orderData);
      setCart(orderData.items || []);
      if (orderData.guests) setGuest(orderData.guests);
    }

    const { data: staffData } = await supabase.from('staff').select('id, full_name, role').eq('is_active', true);
    if (staffData) setStaff(staffData);

    const { data: profileData } = await supabase.from('profiles').select('tax_rate, service_charge_rate, tax_enabled, service_charge_enabled').eq('id', profile?.id).single();
    if (profileData) setTaxSettings(profileData);

    setLoading(false);
  };

  // --- SMART DAILY BILLING LOGIC ---
  useEffect(() => {
    if (activeOrder && room) {
      checkAndAddDailyCharge();
    }
  }, [activeOrder, room]);

  const checkAndAddDailyCharge = async () => {
    if (!room || !activeOrder || !guest) return;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < 10) return; // Don't charge before 10 AM

    const roomCharges = activeOrder.items?.filter((i: any) => i.id === 'room-charge') || [];
    const todayStr = now.toISOString().split('T')[0];
    const chargedToday = roomCharges.some((i: any) => i.date === todayStr);

    if (!chargedToday) {
      const newCharge = {
        id: 'room-charge',
        name: `Room Charge (${todayStr})`,
        price: room.price_per_night,
        quantity: 1,
        date: todayStr,
        category: 'service'
      };

      const updatedCart = [...cart, newCharge];
      
      await supabase.from('orders').update({ 
        items: updatedCart, 
        total_price: updatedCart.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) 
      }).eq('id', activeOrder.id);

      setCart(updatedCart);
      toast.success("Daily room charge added automatically.");
    }
  };

  const addToCart = (item: any) => {
    if (item.current_stock !== null && item.current_stock <= 0) { toast.error(`${item.name} is out of stock!`); return; }
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string | null, delta: number) => {
    setCart(prev => prev.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  };
  
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let taxAmount = 0;
    let serviceAmount = 0;
    if (taxSettings?.tax_enabled) taxAmount = subtotal * (taxSettings.tax_rate || 0);
    if (taxSettings?.service_charge_enabled) serviceAmount = subtotal * (taxSettings.service_charge_rate || 0);
    const total = subtotal + taxAmount + serviceAmount;
    return { subtotal: Math.round(subtotal * 100) / 100, taxAmount: Math.round(taxAmount * 100) / 100, serviceAmount: Math.round(serviceAmount * 100) / 100, grandTotal: Math.round(total * 100) / 100 };
  };

  const totals = calculateTotals();

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Add items first'); return; }
    if (!guest) { toast.error("No guest in room."); return; }
    setSubmitting(true);
    try {
      const payload = { org_id: profile.org_id, room_id: roomId, guest_id: guest?.id, items: cart, total_price: totals.grandTotal, status: 'pending', staff_id: selectedStaff?.id };
      if (activeOrder?.id) {
        await supabase.from('orders').update({ items: cart, total_price: totals.grandTotal }).eq('id', activeOrder.id);
        toast.success('Folio Updated!');
      } else {
        await supabase.from('orders').insert(payload);
        toast.success('Charges Added!');
      }
      fetchData();
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  const handlePayment = async (method: 'cash' | 'mpesa' | 'card') => {
    if (!activeOrder) { toast.error("No active bill"); return; }
    setSubmitting(true);
    try {
      await supabase.from('orders').update({ status: 'paid', payment_method: method, paid_at: new Date().toISOString() }).eq('id', activeOrder.id);
      await supabase.from('rooms').update({ status: 'vacant', current_guest_id: null, current_order_id: null }).eq('id', roomId);
      if (guest?.id) await supabase.from('guests').update({ current_room_id: null, last_checkout_at: new Date().toISOString() }).eq('id', guest.id);

      // --- AUTO DEDUCT STOCK ---
      const orderItems = activeOrder.items || [];
      for (const item of orderItems) {
        const { data: recipeLinks } = await supabase.from('recipes').select('ingredient_id, quantity').eq('menu_item_id', item.id);
        if (recipeLinks && recipeLinks.length > 0) {
          for (const link of recipeLinks) {
            const qtyToDeduct = link.quantity * item.quantity;
            await supabase.rpc('deduct_stock', { item_id: link.ingredient_id, qty: qtyToDeduct });
          }
        }
      }
      // -------------------------

      toast.success("Payment Successful! Guest Checked Out.");
      router.push('/admin/pos');
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  const formatMoney = (amount: number) => amount.toLocaleString('en-KE', { minimumFractionDigits: 2 });

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const categories = ['soft_drink', 'food', 'beer', 'service'];
  const filteredItems = activeCategory === 'all' ? menuItems : menuItems.filter(i => i.category === activeCategory);

  return (
    <div className="h-screen flex flex-col bg-gray-900 relative">
      <div className="bg-gray-900 border-b border-gray-700 p-4 flex-shrink-0">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="p-2 bg-purple-900 rounded"><Home className="text-purple-400"/></div>
               <div>
                  <h1 className="text-xl font-bold text-white">Room {room?.room_number}</h1>
                  <p className="text-xs text-gray-400">{room?.type} - KES {room?.price_per_night}/night</p>
               </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
               <span className={`flex items-center gap-2 text-sm px-3 py-1 rounded ${guest ? 'bg-green-800 text-green-200 border border-green-600' : 'bg-red-800 text-red-200 border border-red-600'}`}>
                  {guest ? <><User size={12} /> {guest.full_name}</> : 'Vacant'}
               </span>
               <p className="text-xl font-bold text-orange-400">KES {formatMoney(totals.grandTotal)}</p>
            </div>
         </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 overflow-hidden min-h-0">
        
        <div className="md:col-span-2 space-y-4 overflow-y-auto">
            {canBill && (
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-3 gap-3">
                   <button onClick={() => addToCart({ id: 'laundry', name: 'Laundry Service', price: 500, quantity: 1, category: 'service' })} className="bg-gray-700 p-3 rounded text-white text-xs font-bold hover:bg-gray-600">+ Laundry</button>
                   <button onClick={() => addToCart({ id: 'extra-bed', name: 'Extra Bed', price: 1000, quantity: 1, category: 'service' })} className="bg-gray-700 p-3 rounded text-white text-xs font-bold hover:bg-gray-600">+ Extra Bed</button>
                   <button onClick={() => addToCart({ id: 'room-charge', name: `Room Charge (Manual)`, price: room?.price_per_night, quantity: 1, category: 'service' })} className="bg-gray-700 p-3 rounded text-white text-xs font-bold hover:bg-gray-600">+ Room Charge</button>
                </div>
              </div>
            )}

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

        <div className="bg-gray-800 rounded-xl border border-gray-700 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <h3 className="text-lg font-bold text-white">Billing Summary</h3>
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
                   <span className="text-orange-400 font-mono">KES {formatMoney(item.price * item.quantity)}</span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-700 p-4 space-y-1 text-sm text-gray-300 flex-shrink-0 bg-gray-800">
             <div className="flex justify-between"><span>Subtotal:</span><span>KES {formatMoney(totals.subtotal)}</span></div>
             <div className="flex justify-between"><span>Tax:</span><span>KES {formatMoney(totals.taxAmount)}</span></div>
             <div className="flex justify-between font-bold text-white text-base pt-2 border-t border-gray-600 mt-2">
                <span>Total</span>
                <span>KES {formatMoney(totals.grandTotal)}</span>
             </div>
          </div>

          <div className="p-4 border-t border-gray-700 space-y-3 flex-shrink-0 bg-gray-800 rounded-b-xl">
             {canBill && (
                <button onClick={handleSubmit} disabled={submitting || cart.length === 0} className="w-full py-3 bg-orange-500 text-black rounded font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                   <Plus size={16} /> Update Bill
                </button>
             )}
             
             {canPrint && activeOrder && (
               <Link href={`/admin/print/${activeOrder.id}`} target="_blank" className="block">
                 <button className="w-full py-2 bg-gray-600 text-white rounded font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-500 mb-2">
                    <Printer size={14} /> Print Bill
                 </button>
               </Link>
             )}
             
             {canPay && (
                <div className="grid grid-cols-3 gap-2">
                   <button onClick={() => handlePayment('cash')} disabled={!activeOrder} className="py-2 bg-green-700 rounded text-white text-xs font-bold disabled:opacity-50">Cash</button>
                   <button onClick={() => handlePayment('mpesa')} disabled={!activeOrder} className="py-2 bg-purple-700 rounded text-white text-xs font-bold disabled:opacity-50">M-Pesa</button>
                   <button onClick={() => handlePayment('card')} disabled={!activeOrder} className="py-2 bg-blue-700 rounded text-white text-xs font-bold disabled:opacity-50">Card</button>
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}