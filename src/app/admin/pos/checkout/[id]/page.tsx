 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Trash2, Printer, BedDouble, CreditCard, ShieldAlert, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function RoomCheckoutPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<any>(null);
  const [guest, setGuest] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]); 
  const [items, setItems] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  // --- VOID MODAL STATE ---
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidingItem, setVoidingItem] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidingIndex, setVoidingIndex] = useState<number | null>(null);

  const supabase = createClient();

  // --- ROLE CONTROL ---
  const allowedRoles = ['owner', 'admin', 'manager', 'supervisor', 'receptionist'];
  const hasPermission = profile?.role && allowedRoles.includes(profile.role);
  // --------------------

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);

    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    setRoom(roomData);

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, guests(*)')
      .eq('room_id', roomId)
      .in('status', ['pending', 'ready', 'active']);

    if (ordersData && ordersData.length > 0) {
      setOrders(ordersData);
      
      // ===== FIX IS HERE: Added (order: any) and (item: any) =====
      const allItems = ordersData.flatMap((order: any) => 
        (order.items || []).map((item: any) => ({
            ...item,
            orderId: order.id 
        }))
      );
      // ==========================================================
      
      setItems(allItems);
      if (ordersData[0].guests) setGuest(ordersData[0].guests);
    } else {
      setOrders([]);
      setItems([]);
    }

    setLoading(false);
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addRoomCharge = async () => {
    if (!room) return;
    const newItem = { id: null, name: `Room Charge (${room.type})`, price: room.price_per_night, quantity: 1, category: 'room' };
    setItems(prev => [...prev, newItem]);
    let targetOrderId = orders.length > 0 ? orders[0].id : null;
    if (targetOrderId) {
        const orderToUpdate = orders.find(o => o.id === targetOrderId);
        const updatedItems = [...(orderToUpdate?.items || []), newItem];
        await supabase.from('orders').update({ items: updatedItems, total_price: updatedItems.reduce((s: number, i: any) => s + (i.price * i.quantity), 0) }).eq('id', targetOrderId);
        toast.success("Room charge added");
    } else {
        const { data: newOrder } = await supabase.from('orders').insert({ org_id: profile?.org_id, room_id: roomId, items: [newItem], total_price: newItem.price, status: 'active', guest_id: guest?.id }).select().single();
        if (newOrder) { setOrders([newOrder]); toast.success("New bill created"); }
    }
    fetchData();
  };

  const openVoidModal = (index: number) => {
    setVoidingIndex(index);
    setVoidingItem(items[index]);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const handleVoidConfirm = async () => {
    if (!voidReason.trim()) {
      toast.error("Please enter a reason for voiding this item.");
      return;
    }
    if (voidingIndex === null) return;

    const itemToRemove = items[voidingIndex];
    setItems(prev => prev.filter((_, i) => i !== voidingIndex));
    setShowVoidModal(false);

    console.log(`VOID: Item "${itemToRemove.name}" removed. Reason: ${voidReason}. User: ${profile?.email}`);
    toast.success(`Item Voided: ${voidReason}`);

    if (itemToRemove.orderId) {
      const orderToUpdate = orders.find(o => o.id === itemToRemove.orderId);
      if (orderToUpdate) {
        const updatedItems = (orderToUpdate.items || []).filter((i: any) => 
          (i.id !== null && i.id !== itemToRemove.id) || (i.id === null && i.name !== itemToRemove.name)
        );
        await supabase
          .from('orders')
          .update({ items: updatedItems, total_price: updatedItems.reduce((s: number, i: any) => s + (i.price * i.quantity), 0) })
          .eq('id', orderToUpdate.id);
      }
    }
    fetchData();
  };

  const handlePayment = async (method: 'cash' | 'mpesa' | 'card') => {
    if (orders.length === 0) { toast.error("No active bill found."); return; }
    setProcessing(true);
    try {
      // FIX: Added (order: any) here as well for safety
      const updatePromises = orders.map((order: any) => supabase.from('orders').update({ status: 'paid', payment_method: method, paid_at: new Date().toISOString() }).eq('id', order.id));
      const results = await Promise.all(updatePromises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
      await supabase.from('rooms').update({ status: 'available' }).eq('id', roomId);
      toast.success("Payment Successful!");
      router.push('/admin/pos');
    } catch (err: any) { toast.error(err.message); } finally { setProcessing(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  if (!hasPermission) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg text-center max-w-md border border-red-500">
                <ShieldAlert className="mx-auto text-red-500 mb-4" size={48} />
                <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-gray-400 mb-6">Only Managers or Admins can process checkouts.</p>
                <Link href="/admin/pos" className="px-6 py-2 bg-gray-600 rounded text-white text-sm hover:bg-gray-500">Back to POS</Link>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Checkout: Room {room?.room_number}</h1>
            {guest && <p className="text-sm text-gray-400">Guest: {guest.full_name}</p>}
          </div>
          <Link href="/admin/pos"><button className="text-sm bg-gray-700 px-4 py-2 rounded hover:bg-gray-600">Cancel</button></Link>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-bold">Bill Items ({orders.length} order(s))</h3>
            <button onClick={addRoomCharge} className="text-xs bg-purple-600 px-3 py-1 rounded flex items-center gap-1 hover:bg-purple-500"><BedDouble size={14}/> Add Room Charge</button>
          </div>
          
          <div className="divide-y divide-gray-700">
            {items.length === 0 ? (<div className="p-8 text-center text-gray-500">No items on bill.</div>) : (
              items.map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-700/50">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-400">KES {item.price} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-orange-400">KES {item.price * item.quantity}</span>
                    <button onClick={() => openVoidModal(idx)} className="text-red-500 hover:text-red-400 flex items-center gap-1 text-xs"><Trash2 size={14} /> Void</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">TOTAL</span>
            <span className="text-3xl font-bold text-orange-400">KES {calculateTotal()}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <button onClick={() => handlePayment('cash')} disabled={processing} className="py-4 bg-green-600 rounded-lg font-bold hover:bg-green-500 disabled:opacity-50">Cash</button>
          <button onClick={() => handlePayment('mpesa')} disabled={processing} className="py-4 bg-purple-600 rounded-lg font-bold hover:bg-purple-500 disabled:opacity-50">M-Pesa</button>
          <button onClick={() => handlePayment('card')} disabled={processing} className="py-4 bg-blue-600 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50">Card</button>
        </div>
      </div>

      {showVoidModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" />
              <h2 className="text-lg font-bold text-white">Void Item</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">You are about to remove: <br/><span className="text-white font-bold">{voidingItem?.name}</span></p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Reason for Voiding *</label>
              <select value={voidReason} onChange={(e) => setVoidReason(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600">
                <option value="">Select Reason...</option>
                <option value="Wrong Order">Wrong Order</option>
                <option value="Guest Complaint">Guest Complaint</option>
                <option value="Item Not Available">Item Not Available</option>
                <option value="Staff Error">Staff Error</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowVoidModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
              <button onClick={handleVoidConfirm} className="flex-1 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-500">Confirm Void</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}