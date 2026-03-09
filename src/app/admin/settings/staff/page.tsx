 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, Users, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';

export default function StaffManagementPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('waiter');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.org_id) fetchStaff();
  }, [profile]);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('created_at', { ascending: false });
    
    setStaff(data || []);
    setLoading(false);
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFullName(item.full_name);
      setRole(item.role);
      setEmail(item.email || '');
    } else {
      setEditingId(null);
      setFullName('');
      setRole('waiter');
      setEmail('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Safety Check
    if (!profile?.org_id) {
      toast.error("Organization ID missing. Please log in again.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('staff')
          .update({ full_name: fullName, role })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Staff updated');
      } else {
        // Insert
        const payload = {
          org_id: profile.org_id,
          full_name: fullName,
          role,
          email,
          is_active: true
        };
        
        console.log("Saving payload:", payload); // Debug log
        
        const { error } = await supabase.from('staff').insert(payload);
        
        if (error) {
            console.error("Supabase Insert Error:", error); // Debug log
            throw error;
        }
        toast.success('Staff added');
      }
      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      console.error("Final Catch Error:", err);
      toast.error(err.message || "Unknown database error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this staff member?")) return;
    await supabase.from('staff').delete().eq('id', id);
    fetchStaff();
    toast.success("Deleted");
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-orange-400">Team Management</h1>
          <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
            <Plus size={18} /> Add Staff
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="text-left p-4 text-gray-400">Name</th>
                <th className="text-left p-4 text-gray-400">Role</th>
                <th className="text-left p-4 text-gray-400">Status</th>
                <th className="text-right p-4 text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-700/50">
                  <td className="p-4 text-white font-medium">{s.full_name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        s.role === 'admin' ? 'bg-red-900/50 text-red-300 border border-red-700' : 
                        s.role === 'manager' ? 'bg-blue-900/50 text-blue-300 border border-blue-700' : 
                        'bg-gray-700 text-gray-300'
                    }`}>
                        {s.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${s.is_active ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => openModal(s)} className="text-blue-400 hover:text-blue-300"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Add'} Staff</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white">
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="room_manager">Room Manager</option>
                  <option value="waiter">Waiter</option>
                  <option value="bartender">Bartender</option>
                  <option value="chef">Chef</option>
                </select>
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email (Optional)</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" />
                </div>
              )}
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