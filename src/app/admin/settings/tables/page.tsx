 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';
import Link from 'next/link';
import { hasFeature } from '@/lib/plans';

export default function TablesPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check if user has permission for tables
    if (profile?.org_id) {
      const canView = hasFeature(profile.plan_type, 'tables');
      if (!canView) {
        setLoading(false);
        return;
      }
      fetchTables();
    }
  }, [profile]);

  const fetchTables = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('table_number', { ascending: true });

    if (error) {
        console.error("Fetch error:", error);
        toast.error("Could not load tables.");
    }
    setTables(data || []);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) { toast.error("Table number required"); return; }
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('tables').insert({
        org_id: profile?.org_id,
        table_number: tableNumber,
        capacity: parseInt(capacity || '4'),
        status: 'available'
      });

      if (error) throw error;
      
      toast.success("Table Added!");
      setShowModal(false);
      setTableNumber('');
      setCapacity('4');
      fetchTables();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Error saving table");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this table?")) return;
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) toast.error("Error deleting");
    else { toast.success("Deleted"); fetchTables(); }
  };

  // Check feature access
  const hasAccess = hasFeature(profile?.plan_type, 'tables');

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  if (!hasAccess) {
    return (
       <div className="p-8 text-center">
          <h1 className="text-2xl text-red-400 mb-4">Feature Locked</h1>
          <p className="text-gray-400">Your current plan does not support Table Management.</p>
          <Link href="/pricing" className="mt-4 inline-block bg-orange-500 text-black px-4 py-2 rounded font-bold">Upgrade Plan</Link>
       </div>
    );
  }

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/settings" className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition">
               <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-orange-400">Table Setup</h1>
                <p className="text-sm text-gray-500">Manage Restaurant Tables</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
            <Plus size={18} /> Add Table
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="p-4">Table #</th>
                <th className="p-4">Capacity</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {tables.length === 0 ? (
                 <tr><td colSpan={4} className="p-8 text-center text-gray-500">No tables found. Click "Add Table" to start.</td></tr>
              ) : (
                tables.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-700/50">
                    <td className="p-4 text-white font-bold">{item.table_number}</td>
                    <td className="p-4 text-gray-300">{item.capacity} Guests</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'available' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">Add New Table</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Table Number / Name</label>
                <input 
                    type="text" 
                    value={tableNumber} 
                    onChange={(e) => setTableNumber(e.target.value)} 
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" 
                    placeholder="e.g. 1 or VIP 1"
                    required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Seating Capacity</label>
                <input 
                    type="number" 
                    value={capacity} 
                    onChange={(e) => setCapacity(e.target.value)} 
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500 text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}