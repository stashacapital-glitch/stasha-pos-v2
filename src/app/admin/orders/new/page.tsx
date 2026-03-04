 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Minus, Send, User, Search } from 'lucide-react';
import toast from 'react-hot-toast';

type MenuItem = { id: string; name: string; price: number; category: string };
type Guest = { id: string; full_name: string; current_room: number | null };
type Staff = { id: string; full_name: string; role: string };
type CartItem = { menu_item: MenuItem; quantity: number };

export default function NewOrderPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useAuth();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]); // State for Waiters
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null); // Selected Waiter
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [guestSearch, setGuestSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      const [menuRes, guestsRes, staffRes] = await Promise.all([
        supabase.from('menu_items').select('id, name, price, category').eq('available', true).order('name'),
        supabase.from('guests').select('id, full_name, current_room'),
        supabase.from('staff').select('id, full_name, role').eq('is_active', true) // Fetch Active Staff
      ]);

      if (menuRes.data) setMenuItems(menuRes.data);
      if (guestsRes.data) setGuests(guestsRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  // Cart Logic (Add, Update, Total)
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const exists = prev.find(c => c.menu_item.id === item.id);
      if (exists) return prev.map(c => c.menu_item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menu_item: item, quantity: 1 }];
    });
  };
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.menu_item.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };
  const total = cart.reduce((sum, item) => sum + item.menu_item.price * item.quantity, 0);

  // Submit Logic
  const handleSubmit = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    
    setSubmitting(true);
    try {
      // 1. Create Order with Staff ID
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          guest_id: selectedGuest?.id || null,
          total_price: total,
          status: 'pending',
          staff_id: selectedStaff?.id || null // LINK WAITER
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const itemsPayload = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.menu_item.id,
        quantity: item.quantity,
        price_at_order: item.menu_item.price
      }));
      
      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      toast.success('Order Sent!');
      router.push('/admin/kds');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const filteredItems = activeCategory === 'all' ? menuItems : menuItems.filter(i => i.category === activeCategory);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* LEFT: Menu */}
      <div className="w-2/3 p-4 overflow-y-auto">
        <h2 className="text-2xl font-bold text-orange-400 mb-4">Menu</h2>
        {/* Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {['all', 'food', 'drink', 'other'].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1 rounded ${activeCategory === cat ? 'bg-orange-500 text-black' : 'bg-gray-700 text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
        {/* Grid */}
        <div className="grid grid-cols-3 gap-2">
          {filteredItems.map(item => (
            <button key={item.id} onClick={() => addToCart(item)} className="bg-gray-800 p-2 rounded text-left hover:bg-gray-700 border border-gray-700">
              <p className="text-white font-bold text-sm truncate">{item.name}</p>
              <p className="text-orange-400 text-xs">KES {item.price}</p>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: Cart & Selection */}
      <div className="w-1/3 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 space-y-2">
          {/* Staff Selection */}
          <select 
            value={selectedStaff?.id || ''} 
            onChange={(e) => setSelectedStaff(staff.find(s => s.id === e.target.value) || null)}
            className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white text-sm"
          >
            <option value="">Select Waiter (Optional)</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
          </select>

          {/* Guest Selection */}
          <div className="relative">
            <input 
              placeholder="Assign Guest..."
              value={selectedGuest ? selectedGuest.full_name : guestSearch}
              onChange={(e) => { setGuestSearch(e.target.value); if(selectedGuest) setSelectedGuest(null); }}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white text-sm"
            />
            {guestSearch && !selectedGuest && (
              <div className="absolute bg-gray-700 w-full mt-1 rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                {guests.filter(g => g.full_name.toLowerCase().includes(guestSearch.toLowerCase())).map(g => (
                  <div key={g.id} onClick={() => { setSelectedGuest(g); setGuestSearch(''); }} className="p-2 hover:bg-gray-600 cursor-pointer text-sm text-white">{g.full_name}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {cart.length === 0 ? <p className="text-gray-500 text-center">Empty</p> : cart.map(c => (
            <div key={c.menu_item.id} className="flex justify-between items-center bg-gray-700 p-2 rounded text-white text-sm">
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(c.menu_item.id, -1)} className="w-6 h-6 bg-red-600 rounded">-</button>
                <span>{c.quantity}</span>
                <button onClick={() => updateQty(c.menu_item.id, 1)} className="w-6 h-6 bg-green-600 rounded">+</button>
                <span className="truncate w-24">{c.menu_item.name}</span>
              </div>
              <span>KES {c.menu_item.price * c.quantity}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <div className="flex justify-between text-xl font-bold text-white">
            <span>Total</span>
            <span>KES {total}</span>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-orange-500 text-black font-bold rounded flex items-center justify-center gap-2">
            <Send size={18} /> Send to Kitchen
          </button>
        </div>
      </div>
    </div>
  );
}