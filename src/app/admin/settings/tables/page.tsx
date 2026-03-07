'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';

export default function TablesManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchTables();
  }, [profile]);

  const fetchTables = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('table_number');
    
    if (error) toast.error('Failed to load tables');
    setTables(data || []);
    setLoading(false);
  };

  const openModal = (table?: any) => {
    if (table) {
      setEditingTable(table);
      setTableNumber(table.table_number);
      setCapacity(table.capacity?.toString() || '4');
    } else {
      setEditingTable(null);
      setTableNumber('');
      setCapacity('4');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) {
      toast.error("Table number is required");
      return;
    }

    setSubmitting(true);
    const payload = {
      table_number: tableNumber,
      capacity: parseInt(capacity) || 4,
      org_id: profile?.org_id,
      status: 'vacant'
    };

    let error;
    if (editingTable) {
      const res = await supabase.from('tables').update(payload).eq('id', editingTable.id);
      error = res.error;
    } else {
      const res = await supabase.from('tables').insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error("Error saving table");
    } else {
      toast.success("Table saved!");
      setShowModal(false);
      fetchTables();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this table?")) return;
    await supabase.from('tables').delete().eq('id', id);
    fetchTables();
    toast.success("Deleted");
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-orange-400">Table Setup</h1>
          <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
            <Plus size={18} /> Add Table
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table) => (
            <div key={table.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-2">
                <button onClick={() => openModal(table)} className="text-blue-400 hover:text-blue-300"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(table.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
              </div>
              <p className="text-4xl font-bold text-white mb-2">{table.table_number}</p>
              <p className="text-xs text-gray-400">Seats: {table.capacity}</p>
              <span className={`mt-2 text-[10px] px-2 py-0.5 rounded ${table.status === 'occupied' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                {table.status}
              </span>
            </div>
          ))}
        </div>
        
        {tables.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No tables found. Click "Add Table" to create your restaurant layout.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">{editingTable ? 'Edit' : 'Add'} Table</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Table Number / Name *</label>
                <input 
                  type="text" 
                  value={tableNumber} 
                  onChange={(e) => setTableNumber(e.target.value)} 
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" 
                  placeholder="e.g. 1 or VIP"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Seating Capacity</label>
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
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}