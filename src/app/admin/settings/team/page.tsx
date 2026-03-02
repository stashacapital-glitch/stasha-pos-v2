 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, ShieldCheck, UserCog, Trash2, Edit, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createStaffUser } from './actions'; 

export default function TeamManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchTeam();
  }, [profile]);

  const fetchTeam = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('created_at', { ascending: false });

    if (error) toast.error('Failed to load team');
    else setTeam(data || []);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setSubmitting(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) toast.error("Failed to update role");
    else {
      toast.success("Role updated!");
      setEditingId(null);
      fetchTeam();
    }
    setSubmitting(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Remove this user from your team?")) return;
    const { error } = await supabase
      .from('profiles')
      .update({ org_id: null, role: 'staff' })
      .eq('id', userId);

    if (error) toast.error(error.message);
    else {
      toast.success("User removed");
      fetchTeam();
    }
  };

  // Handle Add Staff Form Submit
  const handleAddStaff = async (formData: FormData) => {
    setAddLoading(true);
    const result = await createStaffUser(formData);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Staff account created!");
      setShowAddModal(false);
      fetchTeam(); 
    }
    setAddLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Team Management</h1>
          <p className="text-gray-400">Manage staff roles and permissions.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-black rounded font-bold hover:bg-orange-400"
        >
          <UserPlus size={18}/> Add Staff
        </button>
      </div>

      {/* Team List Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {team.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No team members found.</td></tr>
            ) : (
              team.map((member) => (
                <tr key={member.id} className="hover:bg-gray-700/50">
                  <td className="p-4 font-medium flex items-center gap-2">
                    {member.role === 'owner' ? <ShieldCheck size={16} className="text-yellow-500"/> : <UserCog size={16} className="text-gray-400"/>}
                    {member.full_name || 'Unnamed'}
                  </td>
                  <td className="p-4 text-sm text-gray-400">{member.email}</td>
                  <td className="p-4">
                    {editingId === member.id ? (
                      <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="bg-gray-700 p-1 rounded border border-gray-600 text-sm">
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="kitchen_master">Kitchen Master</option>
                        <option value="barman">Barman</option>
                        <option value="receptionist">Receptionist</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-bold ${member.role === 'owner' ? 'bg-yellow-900 text-yellow-300' : member.role === 'manager' ? 'bg-purple-900 text-purple-300' : 'bg-gray-600 text-gray-300'}`}>
                        {member.role?.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {member.role !== 'owner' && (
                      <div className="flex gap-2 justify-end">
                        {editingId === member.id ? (
                          <>
                            <button onClick={() => handleRoleChange(member.id, newRole)} disabled={submitting} className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-500">Save</button>
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-600 text-white rounded text-xs font-bold hover:bg-gray-500">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(member.id); setNewRole(member.role); }} className="text-blue-500 hover:text-blue-400"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(member.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD STAFF MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={18} /></button>
            <h2 className="text-xl font-bold mb-4">Add New Staff</h2>
            <form action={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input name="fullName" type="text" required className="w-full p-3 bg-gray-700 rounded border border-gray-600" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input name="email" type="email" required className="w-full p-3 bg-gray-700 rounded border border-gray-600" placeholder="staff@example.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input name="password" type="password" required className="w-full p-3 bg-gray-700 rounded border border-gray-600" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select name="role" className="w-full p-3 bg-gray-700 rounded border border-gray-600">
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="kitchen_master">Kitchen Master</option>
                  <option value="barman">Barman</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>
              <button type="submit" disabled={addLoading} className="w-full py-3 bg-orange-500 text-black rounded font-bold hover:bg-orange-400 disabled:opacity-50">
                {addLoading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}