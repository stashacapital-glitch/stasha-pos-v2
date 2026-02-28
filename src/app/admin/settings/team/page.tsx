 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, UserPlus, Trash2, Edit, Share2, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeamManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any[]>([]);
  
  // Form States
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('waiter');
  const [password, setPassword] = useState(''); 
  const [submitting, setSubmitting] = useState(false);

  // Success Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  // Edit States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const supabase = createClient();

  const fetchTeam = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at, full_name')
      .eq('org_id', profile.org_id);

    if (error) toast.error('Failed to fetch team');
    else setTeam(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTeam(); }, [profile]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role || !password) {
        toast.error("Please fill all fields."); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, org_id: profile?.org_id, full_name: name, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message);
        setShowModal(false);
        fetchTeam();
        
        // Open Success Modal with details
        setCreatedUser(data.user || { email, password, full_name: name, role });
        setShowSuccessModal(true);
        
        // Reset form
        setName(''); setEmail(''); setPassword('');
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!createdUser) return;
    const text = `Login Details for StashaPOS:\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleWhatsAppShare = () => {
    if (!createdUser) return;
    const msg = `Hello ${createdUser.full_name}, your StashaPOS account is ready!\n\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}\n\nLogin here: https://your-domain.com/login`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const openEditModal = (member: any) => {
    setEditUserId(member.id); setEditName(member.full_name || ''); setShowEditModal(true);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: editName }).eq('id', editUserId);
      if (error) throw error;
      toast.success('Name updated!'); setShowEditModal(false); fetchTeam();
    } catch (err: any) { toast.error(err.message); } 
    finally { setSubmitting(false); }
  };

  const handleRemove = async (userId: string) => {
    if(!confirm("Remove this user?")) return;
    const { error } = await supabase.from('profiles').update({ org_id: null, role: null }).eq('id', userId);
    if (error) toast.error(error.message); else { toast.success('User removed'); fetchTeam(); }
  };

  const formatRole = (roleName: string) => roleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Team Management</h1>
          <p className="text-gray-400">Create staff accounts manually.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
          <UserPlus size={18} /> Create User
        </button>
      </div>

      {/* Team List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {team.map((member) => (
              <tr key={member.id} className="hover:bg-gray-700/50">
                <td className="p-4 font-medium">{member.full_name || <span className="text-gray-500 italic">No name</span>}</td>
                <td className="p-4">{member.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    member.role === 'owner' ? 'bg-purple-900 text-purple-300' :
                    member.role === 'admin' ? 'bg-blue-900 text-blue-300' :
                    member.role === 'kitchen_master' ? 'bg-yellow-900 text-yellow-300' :
                    member.role === 'room_keeper' ? 'bg-teal-900 text-teal-300' :
                    'bg-gray-600 text-gray-300'
                  }`}>{formatRole(member.role)}</span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEditModal(member)} className="text-blue-500 hover:text-blue-400"><Edit size={18} /></button>
                    {member.role !== 'owner' && <button onClick={() => handleRemove(member.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Create Team Member</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600">
                  <option value="admin">Admin</option>
                  <option value="barman">Barman</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen_master">Kitchen Master</option>
                  <option value="room_keeper">Room Keeper</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL - THIS IS THE KEY PART */}
      {showSuccessModal && createdUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-green-500 relative">
            <div className="text-center mb-6">
              <CheckCircle className="mx-auto text-green-500 mb-2" size={48} />
              <h2 className="text-xl font-bold">User Created Successfully!</h2>
              <p className="text-gray-400 text-sm">Share these details with your staff member.</p>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg mb-6 space-y-2 font-mono text-sm">
              <p><strong className="text-gray-400">Name:</strong> {createdUser.full_name}</p>
              <p><strong className="text-gray-400">Email:</strong> {createdUser.email}</p>
              <p><strong className="text-gray-400">Password:</strong> {createdUser.password}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={handleWhatsAppShare} className="w-full py-3 bg-green-600 rounded font-bold flex items-center justify-center gap-2 hover:bg-green-500">
                <Share2 size={18} /> Share via WhatsApp
              </button>
              <button onClick={handleCopy} className="w-full py-3 bg-blue-600 rounded font-bold flex items-center justify-center gap-2 hover:bg-blue-500">
                <Copy size={18} /> Copy to Clipboard
              </button>
              <button onClick={() => setShowSuccessModal(false)} className="w-full py-2 text-gray-400 hover:text-white mt-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Edit Name</h2>
            <form onSubmit={handleUpdateName}>
              <div className="mb-4">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 bg-gray-600 rounded">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}