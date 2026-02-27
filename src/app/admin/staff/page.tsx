 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate';
import { Loader2, ShieldCheck, UserCog, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchStaff(profile.org_id);
  }, [profile]);

  const fetchStaff = async (orgId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load staff");
    } else {
      setStaff(data || []);
    }
    setLoading(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    // Optimistic UI update
    setStaff(prev => prev.map(s => s.id === userId ? {...s, role: newRole} : s));

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      toast.error("Failed to update role");
      fetchStaff(profile?.org_id); // Revert
    } else {
      toast.success("Role updated!");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['owner', 'admin']}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-orange-400">Staff Management</h1>
            <p className="text-gray-400">Manage employee roles and permissions.</p>
          </div>
          {/* 
             Ideally, an "Invite Staff" button goes here. 
             This requires Supabase Edge Functions to send emails securely. 
             For now, staff can sign up and you assign them roles here.
          */}
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-700 border-b border-gray-600">
              <tr>
                <th className="p-4 font-bold">Name</th>
                <th className="p-4 font-bold">Email</th>
                <th className="p-4 font-bold">Role</th>
                <th className="p-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-750">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {member.full_name?.charAt(0) || 'U'}
                    </div>
                    <span className="font-medium">{member.full_name || 'Unnamed User'}</span>
                  </td>
                  <td className="p-4 text-gray-400">{member.email}</td>
                  <td className="p-4">
                    {member.role === 'owner' ? (
                       <span className="px-3 py-1 bg-orange-900 text-orange-300 rounded text-xs font-bold uppercase">Owner</span>
                    ) : (
                      <select 
                        value={member.role}
                        onChange={(e) => updateRole(member.id, e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded p-2 text-sm capitalize"
                      >
                        <option value="admin">Admin</option>
                        <option value="barman">Barman</option>
                        <option value="waiter">Waiter</option>
                      </select>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                        <button className="text-gray-400 hover:text-white" title="Edit Details">
                            <UserCog size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {staff.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                        No staff members found.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}