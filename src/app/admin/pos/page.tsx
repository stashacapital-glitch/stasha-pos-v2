 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Utensils, BedDouble, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default function POSLandingPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  // State for Dropdowns - Default to open
  const [showRestaurant, setShowRestaurant] = useState(true);
  const [showHotel, setShowHotel] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: tableData } = await supabase
      .from('tables')
      .select('id, table_number, status')
      .eq('org_id', profile?.org_id)
      .order('table_number');

    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, room_number, status, type')
      .eq('org_id', profile?.org_id)
      .order('room_number');

    setTables(tableData || []);
    setRooms(roomData || []);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  const activeTables = tables.filter(t => t.status === 'occupied').length;
  const activeRooms = rooms.filter(r => r.status === 'occupied').length;

  return (
    <div className="p-6 md:p-8 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-8">Point of Sale</h1>

      {/* --- RESTAURANT DROPDOWN --- */}
      <div className="mb-4 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Header Button */}
        <button 
          onClick={() => setShowRestaurant(!showRestaurant)}
          className="w-full flex justify-between items-center p-4 hover:bg-gray-700/50 transition focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <Utensils size={20} className="text-orange-400" />
            <span className="font-bold text-white text-lg">Restaurant Area</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">{activeTables} Active</span>
            {showRestaurant ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </div>
        </button>

        {/* Collapsible Content */}
        {showRestaurant && (
          <div className="p-4 border-t border-gray-700 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {tables.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center">No tables found.</p>
            ) : (
              tables.map(table => (
                <Link href={`/admin/pos/table/${table.id}`} key={table.id} passHref>
                  <div className={`p-4 rounded-lg border transition-colors flex flex-col items-center justify-center h-28 cursor-pointer
                    ${table.status === 'occupied' 
                      ? 'bg-red-900/30 border-red-700 hover:bg-red-900/50' 
                      : 'bg-gray-900 border-gray-700 hover:bg-gray-700'}
                  `}>
                    <span className={`text-2xl font-bold ${table.status === 'occupied' ? 'text-red-400' : 'text-white'}`}>
                      {table.table_number}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 capitalize">{table.status}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- HOTEL DROPDOWN --- */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Header Button */}
        <button 
          onClick={() => setShowHotel(!showHotel)}
          className="w-full flex justify-between items-center p-4 hover:bg-gray-700/50 transition focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <BedDouble size={20} className="text-purple-400" />
            <span className="font-bold text-white text-lg">Hotel Rooms</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">{activeRooms} Occupied</span>
            {showHotel ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </div>
        </button>

        {/* Collapsible Content */}
        {showHotel && (
          <div className="p-4 border-t border-gray-700 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {rooms.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center">No rooms found.</p>
            ) : (
              rooms.map(room => (
                <Link href={`/admin/pos/room/${room.id}`} key={room.id} passHref>
                  <div className={`p-4 rounded-lg border transition-colors flex flex-col items-center justify-center h-28 cursor-pointer
                    ${room.status === 'occupied' 
                      ? 'bg-red-900/30 border-red-700 hover:bg-red-900/50' 
                      : 'bg-gray-900 border-gray-700 hover:bg-gray-700'}
                  `}>
                    <span className={`text-2xl font-bold ${room.status === 'occupied' ? 'text-red-400' : 'text-white'}`}>
                      {room.room_number}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 capitalize">{room.type}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}