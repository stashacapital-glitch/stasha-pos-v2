 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, BedDouble, User } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';

export default function RoomsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  
  const [roomNumber, setRoomNumber] = useState('');
  const [type, setType] = useState('single');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => { if (profile?.org_id) fetchRooms(); }, [profile]);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rooms')
      .select('*, guests(id, full_name)')
      .eq('org_id', profile?.org_id)
      .order('room_number');
    if (error) toast.error('Failed to load rooms');
    setRooms(data || []);
    setLoading(false);
  };

  const openModal = (room?: any) => {
    if (room) {
      setEditingRoom(room);
      setRoomNumber(room.room_number);
      setType(room.type);
      setPrice(room.price_per_night?.toString() || '');
    } else {
      setEditingRoom(null);
      setRoomNumber('');
      setType('single');
      setPrice('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !price) {
      toast.error("Room Number and Price are required");
      return;
    }

    setSubmitting(true);
    const payload = {
      room_number: roomNumber,
      type,
      price_per_night: parseFloat(price),
      org_id: profile?.org_id,
      status: 'vacant'
    };

    let error;
    if (editingRoom) {
      const res = await supabase.from('rooms').update(payload).eq('id', editingRoom.id);
      error = res.error;
    } else {
      const res = await supabase.from('rooms').insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error("Error saving room");
    } else {
      toast.success("Room saved!");
      setShowModal(false);
      fetchRooms();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this room?")) return;
    await supabase.from('rooms').delete().eq('id', id);
    fetchRooms();
    toast.success("Deleted");
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager', 'room_manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-orange-400">Room Management</h1>
          <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
            <Plus size={18} /> Add Room
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className={`p-4 rounded-xl border shadow-sm ${room.status === 'occupied' ? 'bg-purple-900/20 border-purple-700' : 'bg-gray-800 border-gray-700'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <BedDouble className={room.status === 'occupied' ? 'text-purple-400' : 'text-gray-500'} size={20} />
                  <h3 className="text-2xl font-bold text-white">{room.room_number}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(room)} className="text-blue-400 hover:text-blue-300"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(room.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-xs text-gray-400 uppercase mb-2">{room.type} - KES {room.price_per_night?.toLocaleString()}</p>
              <div className={`text-xs font-bold flex items-center gap-1 ${room.status === 'occupied' ? 'text-purple-300' : 'text-gray-500'}`}>
                {room.status === 'occupied' ? <><User size={12}/> {room.guests?.full_name || 'Occupied'}</> : 'Vacant'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingRoom ? 'Edit' : 'Add'} Room</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room Number *</label>
                <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white">
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="suite">Suite</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Price per Night *</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500 text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50">{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}