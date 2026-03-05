 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, Home, LogOut, Search, LogIn } from 'lucide-react';
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

  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  const fetchGuests = async () => {
    if (!profile?.org_id) return;
    
    const { data: guestsData, error } = await supabase
      .from('guests')
      .select('id, full_name, phone, email, id_number, current_room_id, last_checkout_at, check_in_at, org_id, created_at, rooms!current_room_id(id, room_number)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        toast.error(`Error: ${error.message}`);
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
    }
  }, [profile]);

  const filteredGuests = guests.filter(g => 
    g.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.phone?.includes(searchQuery)
  );

  // Helper to format dates nicely
  const formatDate = (dateString: string | null) => {
    if (!dateString) return <span className="text-gray-600">-</span>;
    const date = new Date(dateString);
    return (
      <div className="flex flex-col">
        <span className="font-mono text-xs">{date.toLocaleDateString()}</span>
        <span className="text-[10px] text-gray-400">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    );
  };

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
    if (!profile?.org_id) return;
    setSubmitting(true);

    try {
      // Prepare payload
      const payload: any = {
        full_name: name, phone, email, id_number: idNumber,
        org_id: profile.org_id, current_room_id: selectedRoomId
      };

      // LOGIC: If assigning a room AND it's a new assignment, set Check-In Time
      if (selectedRoomId && selectedRoomId !== editingGuest?.current_room_id) {
        payload.check_in_at = new Date().toISOString();
      }
      
      // LOGIC: If removing room (checking out), set Check-Out Time (handled by POS usually, but here too for manual)
      if (!selectedRoomId && editingGuest?.current_room_id) {
         payload.last_checkout_at = new Date().toISOString();
      }

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

      // Update Room Status
      if (editingGuest?.current_room_id && editingGuest.current_room_id !== selectedRoomId) {
        await supabase.from('rooms').update({ status: 'vacant', current_guest_id: null }).eq('id', editingGuest.current_room_id);
      }

      if (selectedRoomId) {
        await supabase.from('rooms').update({ status: 'occupied', current_guest_id: guestId }).eq('id', selectedRoomId);
      }

      toast.success(`Guest ${editingGuest ? 'updated' : 'added'}!`);
      setShowModal(false);
      fetchRooms(); 
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, roomId: string | null) => {
    if (!confirm("Delete this guest?")) return;
    await supabase.from('guests').delete().eq('id', id);
    if (roomId) {
      await supabase.from('rooms').update({ status: 'vacant', current_guest_id: null }).eq('id', roomId);
    }
    toast.success('Guest deleted'); 
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="h-screen flex flex-col bg-gray-900 relative">
      
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700 p-4 shadow-sm flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-orange-400 whitespace-nowrap">Guest Management</h1>
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 pl-10 bg-gray-800 rounded border border-gray-700 text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto p-4 pb-24">
        {/* Wider min-width to accommodate new columns */}
        <div className="min-w-[1000px] bg-gray-800 rounded-lg border border-gray-700">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-gray-400 border-b border-gray-700 sticky top-0 z-10">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Status / Room</th>
                <th className="p-4 w-32">Check In</th>
                <th className="p-4 w-32">Check Out</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredGuests.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No guests found.</td></tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-700/50">
                    <td className="p-4">
                        <div className="font-bold text-white">{guest.full_name}</div>
                        <div className="text-xs text-gray-400">{guest.email || 'No email'}</div>
                    </td>
                    <td className="p-4 text-gray-300">{guest.phone || '-'}</td>
                    
                    <td className="p-4">
                      {guest.rooms ? (
                        <span className="px-3 py-1 bg-purple-900 text-purple-200 rounded text-xs font-bold flex items-center gap-2 w-fit">
                          <Home size={14}/> Room {guest.rooms.room_number}
                        </span>
                      ) : guest.last_checkout_at ? (
                        <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-xs font-bold flex items-center gap-2 w-fit">
                          <LogOut size={12}/> Checked Out
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs italic">Walk-in</span>
                      )}
                    </td>

                    {/* Check In Column */}
                    <td className="p-4 text-green-400 font-mono text-xs">
                       {guest.check_in_at ? formatDate(guest.check_in_at) : (guest.rooms ? <span className="text-gray-600">N/A</span> : '-')}
                    </td>

                    {/* Check Out Column */}
                    <td className="p-4 text-red-400 font-mono text-xs">
                       {formatDate(guest.last_checkout_at)}
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
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => openModal()} 
        className="fixed bottom-6 right-6 z-50 bg-orange-500 text-black p-4 rounded-full shadow-lg hover:bg-orange-400 transition-transform hover:scale-110"
      >
        <Plus size={24} />
      </button>

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
                <label className="block text-sm text-gray-400 mb-1">Assign Room</label>
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
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}