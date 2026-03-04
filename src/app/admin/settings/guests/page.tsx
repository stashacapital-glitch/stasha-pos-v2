  'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, Home, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GuestsManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchGuests = async () => {
    if (!profile?.org_id) return;
    
    // Using explicit foreign key hint to avoid ambiguity
    const { data: guestsData, error } = await supabase
      .from('guests')
      .select('id, full_name, phone, email, id_number, current_room_id, last_checkout_at, org_id, created_at, rooms!guests_current_room_id_fkey(id, room_number)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Database Error:", JSON.stringify(error, null, 2));
        toast.error(`Error loading guests: ${error.message}`);
        setLoading(false);
        return;
    }
    
    setGuests(guestsData || []);
    setLoading(false);
  };

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('id, room_number, status').order('room_number');
    if (data) setRooms(data);
  };

  useEffect(() => { 
    if (profile?.org_id) {
      fetchGuests();
      fetchRooms();

      const channel = supabase
        .channel('guests-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, () => fetchGuests())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const resetForm = () => {
    setName(''); setPhone(''); setEmail(''); setIdNumber(''); setEditingGuest(null); setSelectedRoomId(null);
  };

  const openModal = (guest?: any) => {
    fetchRooms(); 

    if (guest) {
      setEditingGuest(guest);
      setName(guest.full_name);
      setPhone(guest.phone);
      setEmail(guest.email);
      setIdNumber(guest.id_number);
      setSelectedRoomId(guest.current_room_id || null);
    } else { resetForm(); }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) {
      toast.error("Missing Organization ID");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: name,
        phone,
        email,
        id_number: idNumber,
        org_id: profile.org_id,
        current_room_id: selectedRoomId
      };

      let error;
      let guestId = editingGuest?.id;

      if (editingGuest) {
        const res = await supabase.from('guests').update(payload).eq('id', editingGuest.id);
        error = res.error;
      } else {
        const res = await supabase.from('guests').insert(payload).select('id').single();
        if (res.data) guestId = res.data.id;
        error = res.error;
      }

      if (error) throw error;

      if (editingGuest?.current_room_id && editingGuest.current_room_id !== selectedRoomId) {
        await supabase.from('rooms').update({ status: 'vacant', current_guest_id: null }).eq('id', editingGuest.current_room_id);
      }

      if (selectedRoomId) {
        await supabase.from('rooms').update({ 
          status: 'occupied', 
          current_guest_id: guestId 
        }).eq('id', selectedRoomId);
      }

      toast.success(`Guest ${editingGuest ? 'updated' : 'added'}!`);
      setShowModal(false);
      fetchRooms(); 
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, roomId: string | null) => {
    if (!confirm("Delete this guest?")) return;
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      if (roomId) {
        await supabase.from('rooms').update({ status: 'vacant', current_guest_id: null }).eq('id', roomId);
      }
      toast.success('Guest deleted'); 
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Guest Management</h1>
          <p className="text-gray-400">Manage guests and assign rooms.</p>
        </div>
        <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
          <Plus size={18} /> Add Guest
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Email</th>
              <th className="p-4">ID #</th>
              <th className="p-4">Status / Room</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {guests.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No guests found.</td></tr>
            ) : (
              guests.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-700/50">
                  <td className="p-4 font-bold text-white">{guest.full_name}</td>
                  <td className="p-4 text-gray-200">{guest.phone || '-'}</td>
                  <td className="p-4 text-gray-300">{guest.email || '-'}</td>
                  <td className="p-4 text-gray-300">{guest.id_number || '-'}</td>
                  
                  <td className="p-4">
                    {guest.rooms ? (
                      <span className="px-3 py-1 bg-purple-900 text-purple-200 rounded text-xs font-bold flex items-center gap-2 w-fit shadow-sm border border-purple-700">
                        <Home size={14}/> Room {guest.rooms.room_number}
                      </span>
                    ) : guest.last_checkout_at ? (
                      <div className="flex flex-col bg-gray-700 p-2 rounded">
                        <span className="flex items-center gap-2 text-red-400 text-xs font-bold">
                          <LogOut size={12}/> Checked Out
                        </span>
                        <span className="text-gray-400 text-[10px] mt-1">
                          {new Date(guest.last_checkout_at).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Walk-in</span>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => openModal(guest)} className="text-blue-400 hover:text-blue-300"><Pencil size={18} /></button>
                      <button onClick={() => handleDelete(guest.id, guest.current_room_id)} className="text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingGuest ? 'Edit Guest' : 'Add New Guest'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" type="tel" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" type="email" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">ID / Passport #</label>
                <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Assign Room (Optional)</label>
                <select 
                  value={selectedRoomId || ''} 
                  onChange={(e) => setSelectedRoomId(e.target.value || null)}
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white"
                >
                  <option value="">No Room Assigned</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id} disabled={room.status === 'occupied' && room.id !== editingGuest?.current_room_id}>
                      Room {room.room_number} {room.status === 'occupied' && room.id !== editingGuest?.current_room_id ? '(Occupied)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500 text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50 hover:bg-orange-400">
                  {submitting ? 'Saving...' : 'Save Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}