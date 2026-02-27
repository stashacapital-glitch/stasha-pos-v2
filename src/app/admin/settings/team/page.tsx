 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeamManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('waiter');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchTeam = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('org_id', profile.org_id);

    if (error) toast.error('Failed to fetch team');
    else setTeam(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, [profile]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role,
          org_id: profile?.org_id
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message);
        setShowModal(false);
        setEmail('');
        fetchTeam(); 
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if(!confirm("Remove this user from your organization?")) return;

    const { error } = await supabase
      .from('profiles')
      .update({ org_id: null, role: null })
      .eq('id', userId);

    if (error) toast.error(error.message);
    else {
      toast.success('User removed');
      fetchTeam();
    }
  };

  // Helper to format role name for display
  const formatRole = (roleName: string) => {
    return roleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Team Management</h1>
          <p className="text-gray-400">Manage your staff and their roles.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400"
        >
          <UserPlus size={18} /> Invite Member
        </button>
      </div>

      {/* Team List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Joined</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {team.map((member) => (
              <tr key={member.id} className="hover:bg-gray-700/50">
                <td className="p-4">{member.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    member.role === 'owner' ? 'bg-purple-900 text-purple-300' :
                    member.role === 'admin' ? 'bg-blue-900 text-blue-300' :
                    member.role === 'barman' ? 'bg-green-900 text-green-300' :
                    member.role === 'kitchen_master' ? 'bg-yellow-900 text-yellow-300' :
                    member.role === 'room_keeper' ? 'bg-teal-900 text-teal-300' :
                    'bg-gray-600 text-gray-300'
                  }`}>
                    {formatRole(member.role)}
                  </span>
                </td>
                <td className="p-4 text-gray-400 text-sm">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  {member.role !== 'owner' && (
                    <button 
                      onClick={() => handleRemove(member.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Invite Team Member</h2>
            <form onSubmit={handleInvite}>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                  placeholder="staff@example.com"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                >
                  <option value="admin">Admin</option>
                  <option value="barman">Barman</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen_master">Kitchen Master</option>
                  <option value="room_keeper">Room Keeper</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-gray-600 rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}