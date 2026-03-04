'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Calendar, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

type Reservation = {
  id: string;
  check_in_date: string;
  status: string;
  guests: { id: string; full_name: string } | null;
  rooms: { id: string; room_number: number } | null;
};

export default function ReservationsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [guestId, setGuestId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [guests, setGuests] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Reservations
    const { data: resData } = await supabase
      .from('reservations')
      .select('id, check_in_date, status, guests(id, full_name), rooms(id, room_number)')
      .eq('org_id', profile?.org_id)
      .order('check_in_date', { ascending: true });
    
    // 2. Fetch Guests & Rooms for Dropdowns
    const { data: guestData } = await supabase.from('guests').select('id, full_name');
    const { data: roomData } = await supabase.from('rooms').select('id, room_number, status');

    setReservations(resData || []);
    setGuests(guestData || []);
    setRooms(roomData || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId || !roomId || !checkIn) {
      toast.error("Fill all fields");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from('reservations').insert({
      org_id: profile?.org_id,
      guest_id: guestId,
      room_id: roomId,
      check_in_date: checkIn,
      status: 'confirmed'
    });

    if (error) {
      toast.error("Failed to create reservation");
    } else {
      toast.success("Reservation Created");
      setShowModal(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleCheckIn = async (res: Reservation) => {
    // Convert Reservation to actual Check-In
    if (!res.guests || !res.rooms) return;

    // 1. Update Guest
    await supabase.from('guests').update({ current_room_id: res.rooms.id }).eq('id', res.guests.id);
    
    // 2. Update Room
    await supabase.from('rooms').update({ status: 'occupied', current_guest_id: res.guests.id }).eq('id', res.rooms.id);
    
    // 3. Update Reservation Status
    await supabase.from('reservations').update({ status: 'checked_in' }).eq('id', res.id);

    toast.success(`Checked In ${res.guests.full_name} to Room ${res.rooms.room_number}`);
    fetchData();
  };

  const handleCancel = async (id: string) => {
    if(!confirm("Cancel this reservation?")) return;
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
    toast.success("Reservation cancelled");
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-orange-400">Reservations</h1>
        <button onClick={() => setShowModal(true)} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
          <Plus size={18} /> New Reservation
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {reservations.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No upcoming reservations.</div>
        ) : (
          reservations.map(res => (
            <div key={res.id} className={`bg-gray-800 p-4 rounded-lg border flex justify-between items-center ${res.status === 'cancelled' ? 'opacity-50 border-dashed border-gray-700' : 'border-gray-700'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${new Date(res.check_in_date) < new Date(today) ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="font-bold text-white">{res.guests?.full_name || 'Unknown Guest'}</p>
                  <p className="text-sm text-gray-400">
                    Room {res.rooms?.room_number || 'N/A'} • {new Date(res.check_in_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {res.status === 'confirmed' && (
                  <>
                    <button onClick={() => handleCheckIn(res)} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-green-500">
                      <CheckCircle size={14}/> Check In
                    </button>
                    <button onClick={() => handleCancel(res.id)} className="bg-gray-600 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-500">
                      Cancel
                    </button>
                  </>
                )}
                {res.status === 'checked_in' && <span className="text-green-400 text-xs font-bold bg-green-900/50 px-2 py-1 rounded">Checked In</span>}
                {res.status === 'cancelled' && <span className="text-red-400 text-xs font-bold bg-red-900/50 px-2 py-1 rounded">Cancelled</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">New Reservation</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Guest</label>
                <select value={guestId} onChange={(e) => setGuestId(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required>
                  <option value="">Select Guest</option>
                  {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room</label>
                <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required>
                  <option value="">Select Room</option>
                  {rooms.filter(r => r.status === 'vacant').map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Check-in Date</label>
                <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}