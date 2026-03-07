 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Utensils, BedDouble, UserPlus, LogOut } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function POSHubPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [guestSearch, setGuestSearch] = useState('');
  const [foundGuests, setFoundGuests] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const isRoomManager = profile?.role === 'room_manager';
  const canSeeTables = ['admin', 'manager', 'waiter', 'bartender'].includes(profile?.role);
  const canSeeRooms = ['admin', 'manager', 'room_manager'].includes(profile?.role);

  useEffect(() => {
    if (profile?.org_id) {
      fetchData();
      setupRealtime();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);

    if (canSeeTables) {
      const { data, error } = await supabase.from('tables').select('id, table_number, status').eq('org_id', profile?.org_id).order('table_number');
      if (error) console.error("Tables error:", error.message);
      setTables(data || []);
    }

    if (canSeeRooms) {
      // FIX: Explicit relation 'guests!current_guest_id'
      const { data, error } = await supabase
        .from('rooms')
        .select('id, room_number, type, status, price_per_night, current_guest_id, guests!current_guest_id(id, full_name)')
        .eq('org_id', profile?.org_id)
        .order('room_number');
        
      if (error) {
        console.error("Rooms error:", error.message);
        toast.error("Could not fetch rooms: " + error.message);
        setRooms([]);
      } else {
        setRooms(data || []);
      }
    }

    setLoading(false);
  };

  const setupRealtime = () => {
    const channel = supabase.channel('pos-hub-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchData()).on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const handleSearchGuest = async (query: string) => {
    setGuestSearch(query);
    if (query.length < 2) { setFoundGuests([]); return; }
    setSearching(true);
    const { data } = await supabase.from('guests').select('id, full_name, phone').eq('org_id', profile?.org_id).or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`).limit(5);
    setFoundGuests(data || []);
    setSearching(false);
  };

  const handleCheckIn = (room: any) => {
    setSelectedRoom(room);
    setShowGuestModal(true);
  };

  const handleSelectGuest = async (guest: any) => {
    if (!selectedRoom) return;
    
    // CHECK: Ensure room has a price set
    if (!selectedRoom.price_per_night || selectedRoom.price_per_night === 0) {
        toast.error("Room price is not set! Please edit the room details first.");
        setSearching(false);
        return;
    }

    setSearching(true);
    
    // 1. Update Room Status
    await supabase.from('rooms').update({ status: 'occupied', current_guest_id: guest.id }).eq('id', selectedRoom.id);
    
    // 2. Update Guest Record
    await supabase.from('guests').update({ current_room_id: selectedRoom.id }).eq('id', guest.id);
    
    // 3. Create Initial Order with First Night Charge
    const todayStr = new Date().toISOString().split('T')[0];
    const initialItems = [{
        id: 'room-charge',
        name: `Room Charge (${todayStr})`,
        price: selectedRoom.price_per_night,
        quantity: 1,
        date: todayStr,
        category: 'service'
    }];

    const { data: order } = await supabase.from('orders').insert({
        org_id: profile?.org_id, 
        room_id: selectedRoom.id, 
        guest_id: guest.id,
        items: initialItems,
        total_price: selectedRoom.price_per_night, 
        status: 'pending'
      }).select('id').single();

    // 4. Link order to room for easy retrieval
    if (order) await supabase.from('rooms').update({ current_order_id: order.id }).eq('id', selectedRoom.id);

    toast.success(`Checked in ${guest.full_name}. Room Charge added.`);
    setShowGuestModal(false); 
    setSearching(false);
    fetchData();
  };

  const handleCheckOut = async (room: any) => {
    if (!confirm(`Check out ${room.guests?.full_name}? Ensure bill is settled first.`)) return;
    await supabase.from('rooms').update({ status: 'vacant', current_guest_id: null, current_order_id: null }).eq('id', room.id);
    await supabase.from('guests').update({ current_room_id: null, last_checkout_at: new Date().toISOString() }).eq('id', room.current_guest_id);
    toast.success("Checked Out");
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="h-full overflow-y-auto bg-gray-900 p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">{isRoomManager ? 'Front Desk' : 'Order Management'}</h1>
      </div>

      {/* RESTAURANT SECTION */}
      {canSeeTables && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-300 mb-4 flex items-center gap-2"><Utensils size={20} /> Restaurant / Bar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map((t) => (
              <Link key={t.id} href={`/admin/pos/table/${t.id}`} className={`p-4 rounded-xl border transition-all hover:scale-105 ${t.status === 'occupied' ? 'bg-red-900/40 border-red-600' : 'bg-green-900/20 border-green-700'}`}>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{t.table_number}</p>
                  <p className={`text-xs mt-1 font-medium uppercase ${t.status === 'occupied' ? 'text-red-300' : 'text-green-300'}`}>{t.status}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ROOMS SECTION */}
      {canSeeRooms && (
        <div>
          <h2 className="text-xl font-bold text-gray-300 mb-4 flex items-center gap-2"><BedDouble size={20} /> Hotel Rooms</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {rooms.map((r) => (
              <div key={r.id} className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between min-h-[140px] ${r.status === 'occupied' ? 'bg-purple-900/30 border-purple-700' : 'bg-gray-800 border-gray-700'}`}>
                <div className="text-center mb-2">
                  <p className="text-3xl font-bold text-white">{r.room_number}</p>
                  <p className="text-xs text-gray-400">{r.type}</p>
                </div>
                
                {r.status === 'occupied' ? (
                  <div className="space-y-1">
                    <p className="text-xs text-center font-medium text-purple-300 truncate">{r.guests?.full_name}</p>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                       <Link href={`/admin/pos/room/${r.id}`} className="bg-purple-700 text-white p-1 rounded text-center text-[10px] font-bold hover:bg-purple-600">Folio</Link>
                       {/* ONLY Admin/Manager sees OUT (Payment) */}
                       {['admin', 'manager'].includes(profile?.role) && (
                         <button onClick={() => handleCheckOut(r)} className="bg-red-700 text-white p-1 rounded text-center text-[10px] font-bold hover:bg-red-600">Out</button>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                     <p className="text-xs text-center text-gray-500">Vacant</p>
                     <button onClick={() => handleCheckIn(r)} className="w-full bg-green-700 text-white p-1 rounded text-center text-[10px] font-bold hover:bg-green-600 flex items-center justify-center gap-1">
                       <UserPlus size={10}/> Check In
                     </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">Check In: Room {selectedRoom?.room_number}</h2>
            <input placeholder="Search Guest..." value={guestSearch} onChange={(e) => handleSearchGuest(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white mb-4"/>
            {searching && <Loader2 className="animate-spin mx-auto text-orange-400" />}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {foundGuests.map(g => (
                <button key={g.id} onClick={() => handleSelectGuest(g)} className="w-full text-left p-3 bg-gray-700 rounded hover:bg-green-900 border border-gray-600">
                  <p className="font-bold text-white">{g.full_name}</p>
                  <p className="text-xs text-gray-400">{g.phone}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowGuestModal(false)} className="mt-4 w-full py-2 bg-gray-600 rounded text-white text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}