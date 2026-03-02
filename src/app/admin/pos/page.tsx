 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Utensils, DoorOpen, X, Users, CheckCircle, CloudUpload, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function POSDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  // View State
  const [activeView, setActiveView] = useState<'tables' | 'rooms'>('tables');

  // Guest Modal State
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Order & Sync State
  const [activeOrders, setActiveOrders] = useState<any[]>([]); 
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchData(profile.org_id);
      checkPendingSync();
    }
  }, [profile]);

  const fetchData = async (orgId: string) => {
    setLoading(true);
    
    const { data: tablesData } = await supabase.from('tables').select('*').eq('org_id', orgId).order('table_number');
    const { data: roomsData } = await supabase.from('rooms').select('*').eq('org_id', orgId).order('room_number');
    const { data: ordersData } = await supabase.from('orders').select('id, table_id, room_id, status, total_price').eq('org_id', orgId).in('status', ['pending', 'ready', 'active']);
    
    setActiveOrders(ordersData || []);

    const tablesWithBills = (tablesData || []).map(table => {
      const order = (ordersData || []).find((o: any) => o.table_id === table.id);
      return { ...table, currentBill: order?.total_price || 0, orderStatus: order?.status || null, orderId: order?.id || null };
    });

    const roomsWithStatus = (roomsData || []).map(room => {
      const order = (ordersData || []).find((o: any) => o.room_id === room.id);
      return { ...room, currentBill: order?.total_price || 0, status: order ? 'occupied' : room.status, orderId: order?.id || null };
    });

    setTables(tablesWithBills);
    setRooms(roomsWithStatus);
    setLoading(false);
  };

  const checkPendingSync = () => {
    const pending = JSON.parse(localStorage.getItem('pending_orders') || '[]');
    setPendingSyncCount(pending.length);
  };

  const handleMarkServed = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ status: 'served' }).eq('id', orderId);
    if (error) toast.error("Failed to update status");
    else { toast.success("Marked as Served!"); fetchData(profile?.org_id); }
  };

  const handleSyncNow = async () => {
    toast("Syncing...");
    const pending = JSON.parse(localStorage.getItem('pending_orders') || '[]');
    let count = 0;
    for (const order of pending) {
        const { error } = await supabase.from('orders').insert(order);
        if (!error) count++;
    }
    if (count > 0) { localStorage.removeItem('pending_orders'); toast.success(`${count} synced!`); fetchData(profile?.org_id); }
    checkPendingSync();
  };

  const openBookRoomModal = async (room: any) => {
    setSelectedRoom(room);
    const { data } = await supabase.from('guests').select('*').eq('org_id', profile?.org_id).order('full_name');
    setGuests(data || []);
    setShowGuestModal(true);
  };

  const handleSelectGuest = (guestId: string) => {
    window.location.href = `/admin/pos/room/${selectedRoom.id}?guest_id=${guestId}`;
  };

  const handleWalkIn = () => {
    window.location.href = `/admin/pos/room/${selectedRoom.id}`;
  };

  const filteredGuests = guests.filter(g => g.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || g.phone?.includes(searchTerm));

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">POS</h1>
          <p className="text-gray-400">Select a table or room.</p>
        </div>
        
        {/* Pending Sync Banner */}
        {pendingSyncCount > 0 && (
          <button onClick={handleSyncNow} className="flex items-center gap-2 bg-blue-900 px-4 py-2 rounded border border-blue-500 text-blue-300 text-sm hover:bg-blue-800">
            <CloudUpload size={14} /> {pendingSyncCount} Pending Sync
          </button>
        )}
      </div>

      {/* DROPDOWN SELECTOR */}
      <div className="mb-6 relative">
        <select 
          value={activeView}
          onChange={(e) => setActiveView(e.target.value as 'tables' | 'rooms')}
          className="w-full md:w-64 bg-gray-800 border border-gray-600 text-white rounded-lg p-3 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="tables">Restaurant Tables</option>
          <option value="rooms">Hotel Rooms</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
      </div>

      {/* CONTENT AREA */}
      
      {/* TABLES VIEW */}
      {activeView === 'tables' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div key={table.id} className={`p-4 rounded-lg border h-44 flex flex-col justify-between ${table.currentBill > 0 ? 'bg-red-900/20 border-red-500' : 'bg-gray-800 border-gray-700'}`}>
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-bold">{table.table_number}</h3>
                <span className={`text-xs px-2 py-1 rounded font-bold ${table.currentBill > 0 ? (table.orderStatus === 'ready' ? 'bg-yellow-500 text-black' : 'bg-red-600') : 'bg-gray-600'}`}>
                  {table.currentBill > 0 ? (table.orderStatus === 'ready' ? 'READY' : 'OCCUPIED') : 'OPEN'}
                </span>
              </div>
              
              <p className="text-xl font-mono text-orange-400">KES {table.currentBill?.toLocaleString() || 0}</p>

              {table.orderStatus === 'ready' && table.orderId ? (
                 <button onClick={() => handleMarkServed(table.orderId)} className="w-full py-2 bg-green-600 rounded font-bold text-sm hover:bg-green-500 flex items-center justify-center gap-1">
                   <CheckCircle size={14}/> Mark Served
                 </button>
              ) : (
                <Link href={`/admin/pos/table/${table.id}`} className="block">
                  <button className="w-full py-2 bg-gray-600 rounded font-bold text-sm hover:bg-gray-500">
                    {table.currentBill > 0 ? 'MANAGE' : 'OPEN'}
                  </button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ROOMS VIEW */}
      {activeView === 'rooms' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className={`p-4 rounded-lg border h-44 flex flex-col justify-between ${room.status === 'occupied' ? 'bg-red-900/20 border-red-500' : 'bg-gray-800 border-gray-700'}`}>
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-bold">{room.room_number}</h3>
                <span className={`text-xs px-2 py-1 rounded font-bold ${room.status === 'available' ? 'bg-green-600' : 'bg-red-600'}`}>
                  {room.status?.toUpperCase()}
                </span>
              </div>
              
              <div className="text-xs text-gray-400 mb-1">{room.type} - KES {room.price_per_night}/night</div>
              <p className="text-xl font-mono text-orange-400 mb-2">KES {room.currentBill?.toLocaleString() || 0}</p>

              {room.status === 'available' ? (
                <button onClick={() => openBookRoomModal(room)} className="w-full py-2 bg-green-600 rounded font-bold text-sm hover:bg-green-500">
                  BOOK ROOM
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/admin/pos/room/${room.id}`} className="block">
                    <button className="w-full py-2 bg-blue-600 rounded font-bold text-xs hover:bg-blue-500">ADD ITEMS</button>
                  </Link>
                  <Link href={`/admin/pos/checkout/${room.id}`} className="block">
                    <button className="w-full py-2 bg-orange-500 text-black rounded font-bold text-xs hover:bg-orange-400">CHECKOUT</button>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GUEST MODAL */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 relative">
            <button onClick={() => setShowGuestModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={18} /></button>
            <h2 className="text-xl font-bold mb-4">Check In: Room {selectedRoom?.room_number}</h2>
            <input type="text" placeholder="Search Guest..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 mb-4" />
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              {filteredGuests.length === 0 ? <p className="text-center text-gray-500 py-4">No guests found.</p> : (
                filteredGuests.map(guest => (
                  <button key={guest.id} onClick={() => handleSelectGuest(guest.id)} className="w-full p-3 bg-gray-700 rounded text-left hover:bg-gray-600 flex justify-between items-center">
                    <span>{guest.full_name}</span>
                    <span className="text-xs text-gray-400">{guest.phone}</span>
                  </button>
                ))
              )}
            </div>
            <button onClick={handleWalkIn} className="w-full py-3 bg-orange-500 text-black rounded font-bold hover:bg-orange-400">
              Walk-in Guest
            </button>
          </div>
        </div>
      )}

    </div>
  );
}