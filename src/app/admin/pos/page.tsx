 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function POSDashboard() {
  const { profile } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchTables(profile.org_id);
    }
  }, [profile]);

  const fetchTables = async (orgId: string) => {
    setLoading(true);
    
    const { data: tablesData } = await supabase
      .from('tables')
      .select('*')
      .eq('org_id', orgId)
      .order('table_number', { ascending: true });

    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, table_id, total_price, status')
      .eq('org_id', orgId)
      .in('status', ['pending', 'ready']);

    const tablesWithStatus = (tablesData || []).map((table, index) => {
      const activeOrder = (ordersData || []).find(o => o.table_id === table.id);
      
      // SMART DISPLAY NAME: Handle both Numbers and Text safely
      let displayName = `Table ${index + 1}`;
      
      if (table.table_number) {
        if (typeof table.table_number === 'number') {
          // It is a number (e.g., 1, 2, 3)
          displayName = table.table_number;
        } else if (typeof table.table_number === 'string') {
          // It is text
          if (!table.table_number.includes('-')) {
            // It is not a UUID
            displayName = table.table_number;
          }
        }
      }

      return {
        ...table,
        displayName: displayName,
        currentBill: activeOrder?.total_price || 0,
        status: activeOrder ? 'occupied' : 'open',
        hasReadyFood: activeOrder?.status === 'ready'
      };
    });

    setTables(tablesWithStatus);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Tables</h1>
      <p className="text-gray-400 mb-8">Select a table to take an order or process payment.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {tables.map((table) => (
          <div 
            key={table.id} 
            className={`p-6 rounded-xl border flex flex-col justify-between h-52 transition transform hover:scale-105 ${
              table.hasReadyFood 
                ? 'bg-green-900/30 border-green-500 animate-pulse' 
                : table.status === 'occupied' 
                    ? 'bg-red-900/20 border-red-500' 
                    : 'bg-gray-800 border-gray-700 hover:border-orange-500'
            }`}
          >
            <div>
              <h3 className="text-3xl font-bold">{table.displayName}</h3>
              
              <span className={`text-xs mt-2 inline-block px-2 py-1 rounded ${
                  table.hasReadyFood 
                      ? 'bg-green-500 text-black font-bold' 
                      : table.status === 'occupied' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-500 text-white'
              }`}>
                  {table.hasReadyFood ? 'READY!' : table.status === 'occupied' ? 'OCCUPIED' : 'OPEN'}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-lg font-mono text-orange-400 mb-2">
                KES {table.currentBill.toLocaleString()}
              </p>
              
              <div className="flex gap-2">
                {table.status === 'occupied' && (
                  <Link href={`/admin/pos/pay/${table.id}`} className="flex-1">
                    <button className="w-full bg-green-600 text-white text-xs py-2 rounded font-bold hover:bg-green-500 transition">
                      PAY BILL
                    </button>
                  </Link>
                )}

                <Link href={`/admin/pos/table/${table.id}`} className="flex-1">
                  <button className={`w-full text-xs py-2 rounded transition ${
                    table.status === 'occupied' 
                      ? 'bg-gray-600 text-white hover:bg-gray-500' 
                      : 'bg-orange-500 text-black font-bold hover:bg-orange-400'
                  }`}>
                    {table.status === 'occupied' ? 'ADD MORE' : 'NEW ORDER'}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}