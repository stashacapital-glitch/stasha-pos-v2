 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Bed, User, CheckCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

type Room = {
  id: string;
  room_number: number;
  status: 'vacant' | 'occupied' | 'cleaning';
  current_guest_id: string | null;
  guests: { full_name: string } | null;
};

export default function RoomsManagementPage() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchRooms();
      
      const channel = supabase
        .channel('rooms-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchRooms())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else if (profile && !profile.org_id) {
        toast.error("Your account has no Organization ID assigned.");
        setLoading(false);
    }
  }, [profile]);

  const fetchRooms = async () => {
    setLoading(true);
    
    if (!profile?.org_id) {
        setLoading(false);
        return;
    }

    // FIX: Added "!current_guest_id" to specify which link to use for the guest name
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        id,
        room_number,
        status,
        current_guest_id,
        guests!current_guest_id ( full_name )
      `)
      .eq('org_id', profile.org_id) 
      .order('room_number', { ascending: true });

    if (error) {
      toast.error('Failed to load rooms: ' + error.message);
      console.error("Database Error:", error);
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (roomId: string, newStatus: string) => {
    const { error } = await supabase
      .from('rooms')
      .update({ status: newStatus })
      .eq('id', roomId);

    if (error) toast.error('Failed to update status');
    else toast.success('Room status updated');
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const occupied = rooms.filter(r => r.status === 'occupied').length;
  const vacant = rooms.filter(r => r.status === 'vacant').length;
  const cleaning = rooms.filter(r => r.status === 'cleaning').length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-orange-400">Room Management</h1>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Vacant ({vacant})</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Occupied ({occupied})</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Cleaning ({cleaning})</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {rooms.map((room) => (
          <div 
            key={room.id} 
            className={`p-4 rounded-lg border shadow-sm flex flex-col items-center text-center transition-colors
              ${room.status === 'vacant' ? 'bg-green-900/30 border-green-700 hover:bg-green-900/50' : ''}
              ${room.status === 'occupied' ? 'bg-red-900/30 border-red-700 hover:bg-red-900/50' : ''}
              ${room.status === 'cleaning' ? 'bg-yellow-900/30 border-yellow-700 hover:bg-yellow-900/50' : ''}
            `}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 mb-2 border border-gray-600">
              <Bed size={20} className={`
                ${room.status === 'vacant' ? 'text-green-400' : ''}
                ${room.status === 'occupied' ? 'text-red-400' : ''}
                ${room.status === 'cleaning' ? 'text-yellow-400' : ''}
              `} />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">{room.room_number}</h3>
            
            {room.status === 'occupied' && room.guests && (
              <p className="text-xs text-gray-400 mb-2 truncate w-full">
                <User size={10} className="inline mr-1" />{room.guests.full_name}
              </p>
            )}

            <div className="mt-auto pt-2 w-full space-y-1">
              
              {room.status === 'vacant' && (
                <Link href={`/admin/pos/room/${room.id}`} className="block w-full">
                  <button className="w-full text-xs py-1.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 transition">
                    Check In
                  </button>
                </Link>
              )}

              {room.status === 'occupied' && (
                 <Link href={`/admin/pos/room/${room.id}`} className="block w-full">
                    <button className="w-full text-xs py-1.5 bg-orange-600 text-white rounded font-bold hover:bg-orange-500 transition flex items-center justify-center gap-1">
                       <Eye size={12}/> View Bill
                    </button>
                 </Link>
              )}

              {room.status === 'cleaning' && (
                <button 
                  onClick={() => updateStatus(room.id, 'vacant')} 
                  className="w-full text-xs py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/40"
                >
                  <CheckCircle size={10} className="inline mr-1" /> Done
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}