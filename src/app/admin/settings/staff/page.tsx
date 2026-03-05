 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, UserCheck, UserX, KeyRound, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); // For linking user accounts
  
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [role, setRole] = useState('waiter');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState(''); 
  const [userId, setUserId] = useState(''); // For linking auth_id
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchStaff();
      fetchUsers(); // Fetch available users to link
    }
  }, [profile]);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('full_name');

    if (error) toast.error('Failed to load staff');
    setStaff(data || []);
    setLoading(false);
  };

  // Fetch all users (profiles) to populate the dropdown
  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('org_id', profile?.org_id);
    
    if (data) setUsers(data);
  };

  const openModal = (s?: any) => {
    if (s) {
      setEditingStaff(s);
      setName(s.full_name);
      setRole(s.role);
      setPhone(s.phone || '');
      setPin(s.pin_code || '');
      setUserId(s.auth_id || '');
    } else {
      setEditingStaff(null);
      setName('');
      setRole('waiter');
      setPhone('');
      setPin('');
      setUserId('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin && pin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }

    setSubmitting(true);

    const payload = { 
      full_name: name, 
      role, 
      phone, 
      org_id: profile?.org_id,
      pin_code: pin || null,
      auth_id: userId || null // Link the user account
    };

    let error;
    if (editingStaff) {
      const res = await supabase.from('staff').update(payload).eq('id', editingStaff.id);
      error = res.error;
    } else {
      const res = await supabase.from('staff').insert(payload);
      error = res.error;
    }

    if (error) toast.error('Error saving staff');
    else {
      toast.success(`Staff ${editingStaff ? 'updated' : 'added'}`);
      setShowModal(false);
      fetchStaff();
    }
    setSubmitting(false);
  };

  const toggleActive = async (s: any) => {
    const { error } = await supabase.from('staff').update({ is_active: !s.is_active }).eq('id', s.id);
    if (!error) fetchStaff();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this staff member?")) return;
    await supabase.from('staff').delete().eq('id', id);
    fetchStaff();
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-orange-400">Team Management</h1>
        <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
          <Plus size={18} /> Add Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map(s => (
          <div key={s.id} className={`p-4 bg-gray-800 rounded-lg border ${s.is_active ? 'border-gray-700' : 'border-red-900 opacity-50'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  {s.full_name}
                  {s.pin_code && <KeyRound size={14} className="text-green-400" />}
                  {s.auth_id && <LinkIcon size={14} className="text-blue-400" title="Linked Account" />}
                </h3>
                <p className="text-xs text-gray-400 uppercase">{s.role}</p>
                <p className="text-sm text-gray-500 mt-1">{s.phone || 'No phone'}</p>
                {/* Show Shift Status */}
                <div className="mt-2 text-xs">
                   {s.is_on_shift ? 
                     <span className="px-2 py-0.5 bg-green-900 text-green-300 rounded">On Shift</span> : 
                     <span className="px-2 py-0.5 bg-gray-700 text-gray-400 rounded">Off Shift</span>
                   }
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(s)} className="text-blue-400 hover:text-blue-300"><Pencil size={16} /></button>
                <button onClick={() => toggleActive(s)} className={s.is_active ? "text-green-400 hover:text-green-300" : "text-red-400 hover:text-red-300"}>
                  {s.is_active ? <UserCheck size={16} /> : <UserX size={16} />}
                </button>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingStaff ? 'Edit' : 'Add'} Staff</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white">
                  <option value="waiter">Waiter</option>
                  <option value="chef">Chef</option>
                  <option value="bartender">Bartender</option>
                  <option value="room_manager">Room Manager</option>
                  <option value="manager">General Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" type="tel" />
              </div>

              {/* Link User Account */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Link User Account (Login)</label>
                <select 
                  value={userId} 
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white"
                >
                  <option value="">No Account Linked</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.full_name || 'No Name'})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Links this profile to a login account for Shift Tracking.</p>
              </div>

              {/* PIN INPUT */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">PIN Code (4+ digits)</label>
                <input 
                  type="password" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 1234"
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white tracking-widest"
                />
                <p className="text-xs text-gray-500 mt-1">Required for POS login/authorization.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}