 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Shield, User, Briefcase, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchStaff(profile.org_id);
  }, [profile]);

  const fetchStaff = async (orgId: string) => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, created_at, user_id, raw_user_meta_data')
      .eq('org_id', orgId);

    if (error) {
      toast.error('Failed to fetch staff');
    } else {
      // Fetch emails from auth.users is not possible directly from client for security.
      // We will display what we have.
      setStaff(data || []);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string) => {
    if (!newRole) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update role');
    } else {
      toast.success('Role updated!');
      setEditingId(null);
      if (profile?.org_id) fetchStaff(profile.org_id);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Staff Management</h1>
      <p className="text-gray-400 mb-8">Manage team members and their access levels.</p>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="p-4">User ID</th>
              <th className="p-4">Role</th>
              <th className="p-4">Joined</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-gray-700/50">
                <td className="p-4 font-mono text-xs text-gray-300">
                    {member.user_id?.slice(0, 8)}...{member.user_id?.slice(-4)}
                </td>
                <td className="p-4">
                  {editingId === member.user_id ? (
                    <div className="flex gap-2">
                      <select 
                        value={newRole} 
                        onChange={(e) => setNewRole(e.target.value)}
                        className="bg-gray-600 p-1 rounded text-white"
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button onClick={() => handleRoleChange(member.user_id)} className="bg-green-600 px-2 rounded text-xs">Save</button>
                      <button onClick={() => setEditingId(null)} className="bg-gray-600 px-2 rounded text-xs">X</button>
                    </div>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                        member.role === 'admin' ? 'bg-purple-600' : 
                        member.role === 'manager' ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      {member.role || 'staff'}
                    </span>
                  )}
                </td>
                <td className="p-4 text-gray-400">
                    {new Date(member.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                    {editingId !== member.user_id && (
                        <button 
                            onClick={() => { setEditingId(member.user_id); setNewRole(member.role || 'staff'); }} 
                            className="text-gray-400 hover:text-white p-2 rounded hover:bg-gray-600"
                        >
                            <Briefcase size={16}/>
                        </button>
                    )}
                </td>
              </tr>
            ))}
             {staff.length === 0 && (
                <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                        No staff members found. New users who sign up will appear here.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-8 bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4">How to Add Staff</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
            <li>Give the new staff member the signup link (your website URL).</li>
            <li>Ask them to create an account.</li>
            <li>Once they sign up, they will appear in this list.</li>
            <li>You can then assign them a Role (Manager/Staff) using the table above.</li>
        </ol>
      </div>
    </div>
  );
}