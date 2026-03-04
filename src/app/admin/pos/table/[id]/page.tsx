 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Plus, Minus, Printer, UserCheck } from 'lucide-react';
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
  const [table, setTable] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  
  // Staff
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Tax Settings
  const [taxSettings, setTaxSettings] = useState<any>(null);

  const [activeCategory, setActiveCategory] = useState('all');
  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id && tableId) fetchData();
  }, [profile, tableId]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: tableData } = await supabase.from('tables').select('*').eq('id', tableId).single();
    setTable(tableData);

    const { data: menuData } = await supabase.from('menu_items').select('*').eq('org_id', profile?.org_id).eq('is_available', true);
    setMenuItems(menuData || []);

    const { data: staffData } = await supabase.from('staff').select('id, full_name').eq('is_active', true);
    setStaff(staffData || []);

    const { data: orderData } = await supabase.from('orders').select('id, items, staff_id, staff(id, full_name)').eq('table_id', tableId).in('status', ['pending', 'ready']).limit(1).maybeSingle();
    
    if (orderData) {
      setActiveOrder(orderData);
      setCart(orderData.items || []);
      if (orderData.staff) setSelectedStaff(orderData.staff);
    }

    // FETCH TAX SETTINGS
    const { data: profileData } = await supabase.from('profiles').select('tax_rate, service_charge_rate, tax_enabled, service_charge_enabled').eq('id', profile?.id).single();
    if (profileData) setTaxSettings(profileData);

    setLoading(false);
  };

  const addToCart = (item: any) => {
    if (item.current_stock !== null && item.current_stock <= 0) { toast.error(`${item.name} is out of stock!`); return; }
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  };

  // --- CALCULATION WITH TAX ---
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let taxAmount = 0;
    let serviceAmount = 0;

    if (taxSettings?.tax_enabled) taxAmount = subtotal * (taxSettings.tax_rate || 0);
    if (taxSettings?.service_charge_enabled) serviceAmount = subtotal * (taxSettings.service_charge_rate || 0);

    return { subtotal, taxAmount, serviceAmount, grandTotal: subtotal + taxAmount + serviceAmount };
  };

  const totals = calculateTotals();

  const handleSubmitOrder = async () => {
    if (cart.length === 0) { toast.error('Add items to cart first'); return; }
    setSubmitting(true);
    
    try {
      if (activeOrder?.id) {
        const { error } = await supabase.from('orders').update({ items: cart, total_price: totals.grandTotal, staff_id: selectedStaff?.id }).eq('id', activeOrder.id);
        if (error) throw error;
        toast.success('Order Updated!');
      } else {
        const { error } = await supabase.from('orders').insert({
          org_id: profile?.org_id, table_id: tableId, items: cart, total_price: totals.grandTotal, status: 'pending', staff_id: selectedStaff?.id
        });
        if (error) throw error;
        await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId);
        toast.success('Order Sent!');
      }
      fetchData();
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  const handlePayment = async (method: 'cash' | 'mpesa' | 'card') => {
    if (cart.length === 0) { toast.error('Add items first'); return; }
    setSubmitting(true);
    try {
      if (!activeOrder?.id) await handleSubmitOrder(); 

      const { data: currentOrder } = await supabase.from('orders').select('id').eq('table_id', tableId).in('status', ['pending', 'ready']).limit(1).single();
      if (!currentOrder) throw new Error("Order creation failed");

      // SAVE GRAND TOTAL
      const { error: payError } = await supabase.from('orders').update({
        status: 'paid', payment_method: method, paid_at: new Date().toISOString(), staff_id: selectedStaff?.id, total_price: totals.grandTotal
      }).eq('id', currentOrder.id);

      if (payError) throw payError;
      
      await supabase.from('tables').update({ status: 'vacant' }).eq('id', tableId);
      
      toast.success("Payment Successful!");
      router.push('/admin/pos');
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const categories = ['soft_drink', 'food', 'beer', 'cigarettes'];
  const filteredItems = activeCategory === 'all' ? menuItems : menuItems.filter(i => i.category === activeCategory);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-700 p-4 bg-gray-900 z-20">
        <div className="flex justify-between items-center">
          <div><h1 className="text-xl font-bold text-white">Table {table?.table_number}</h1><p className="text-xs text-gray-400">Restaurant</p></div>
          <div className="text-right">
             <select value={selectedStaff?.id || ''} onChange={(e) => setSelectedStaff(staff.find(s => s.id === e.target.value) || null)} className="p-2 bg-gray-700 rounded border border-gray-600 text-white text-xs"><option value="">Select Waiter</option>{staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
             <p className="text-xl font-bold text-orange-400 mt-1">KES {totals.grandTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden min-h-0">
        
        {/* LEFT: Menu */}
        <div className="h-full flex flex-col overflow-hidden bg-gray-800 border-r border-gray-700">
          <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700 p-2 flex gap-2 overflow-x-auto">
            <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition ${activeCategory === 'all' ? 'bg-orange-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition ${activeCategory === cat ? 'bg-orange-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{cat.replace('_', ' ')}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredItems.map(item => {
                 const isOutOfStock = item.current_stock !== null && item.current_stock <= 0;
                 return (
                   <button key={item.id} onClick={() => !isOutOfStock && addToCart(item)} disabled={isOutOfStock} className={`p-3 rounded text-left transition text-sm shadow-sm ${isOutOfStock ? 'bg-gray-900 opacity-50 cursor-not-allowed border-dashed border border-gray-700' : 'bg-gray-700 hover:bg-gray-600 active:scale-95'}`}>
                     <p className="font-semibold text-white truncate">{item.name}</p>
                     <p className="text-orange-400 font-mono text-xs mt-1">KES {item.price}</p>
                   </button>
                 );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Cart */}
        <div className="h-full flex flex-col overflow-hidden bg-gray-900">
           <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-2">
             {cart.length === 0 ? (<div className="flex items-center justify-center h-full text-gray-500 text-sm">Tap items to add</div>) : (
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
                    <span className="text-orange-400 font-mono text-sm font-semibold">KES {item.price * item.quantity}</span>
                  </div>
                ))
             )}
           </div>

           {/* Footer */}
           <div className="flex-shrink-0 border-t border-gray-700 p-4 bg-gray-800 space-y-2 shadow-lg">
             {/* Totals Breakdown */}
             <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>KES {totals.subtotal.toLocaleString()}</span></div>
                {taxSettings?.tax_enabled && <div className="flex justify-between text-red-400"><span>VAT ({Number(taxSettings.tax_rate) * 100}%):</span><span>KES {totals.taxAmount.toLocaleString()}</span></div>}
                {taxSettings?.service_charge_enabled && <div className="flex justify-between text-blue-400"><span>Service ({Number(taxSettings.service_charge_rate) * 100}%):</span><span>KES {totals.serviceAmount.toLocaleString()}</span></div>}
             </div>

             <button onClick={handleSubmitOrder} disabled={submitting} className="w-full py-3 bg-orange-500 text-black rounded-lg font-bold text-base disabled:opacity-50 hover:bg-orange-400 transition">{submitting ? 'Processing...' : 'Send to Kitchen'}</button>
             {activeOrder && (<Link href={`/admin/print/${activeOrder.id}`} target="_blank" className="block"><button className="w-full py-2 bg-gray-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-500 transition"><Printer size={16} /> Print Bill</button></Link>)}
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