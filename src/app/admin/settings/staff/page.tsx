 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, UserCheck, UserX, KeyRound, Link as LinkIcon, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); // Existing users to link
  
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [role, setRole] = useState('waiter');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState(''); 
  const [submitting, setSubmitting] = useState(false);

  // Fields for Linking OR Creating
  const [linkUserId, setLinkUserId] = useState(''); // If selecting existing
  const [staffEmail, setStaffEmail] = useState(''); // If creating new
  const [staffPassword, setStaffPassword] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchStaff();
      fetchUsers();
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

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('org_id', profile?.org_id);
    if (data) setUsers(data);
  };

  const openModal = (s?: any) => {
    fetchUsers(); // Refresh list of linkable users
    if (s) {
      setEditingStaff(s);
      setName(s.full_name);
      setRole(s.role);
      setPhone(s.phone || '');
      setPin(s.pin_code || '');
      setLinkUserId(s.auth_id || '');
      setStaffEmail('');
      setStaffPassword('');
    } else {
      setEditingStaff(null);
      setName('');
      setRole('waiter');
      setPhone('');
      setPin('');
      setLinkUserId('');
      setStaffEmail('');
      setStaffPassword('');
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

    try {
      let authId = editingStaff?.auth_id;

      // --- LOGIC: LINK OR CREATE ---
      
      // CASE A: Linking an EXISTING user (Dropdown selected)
      if (!editingStaff && linkUserId) {
        authId = linkUserId;
        toast.success("Linking existing account...");
      } 
      // CASE B: Creating a NEW user (Email/Password filled)
      else if (!editingStaff && staffEmail && staffPassword) {
        if (staffPassword.length < 6) throw new Error("Password must be 6+ characters");
        
        // CRITICAL FIX: Pass org_id in metadata so the trigger works!
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: staffEmail,
          password: staffPassword,
          options: {
            data: {
              org_id: profile?.org_id, // <--- Links new user to YOUR business
              role: role,
              full_name: name
            }
          }
        });

        if (authError) {
            if (authError.message.includes("already registered")) {
                throw new Error("This email is already registered. Select it from the 'Link User' dropdown or delete it from Authentication.");
            }
            throw new Error(authError.message);
        }
        if (!authData.user) throw new Error("Failed to create login account");
        
        authId = authData.user.id;
        toast.success("Login created!");
      }
      // CASE C: Editing existing staff (No changes to auth)
      else if (editingStaff) {
         // Just update profile
      } 
      // ERROR: Nothing selected
      else {
        throw new Error("Please select a user to link OR enter email/password to create a new one.");
      }

      // --- SAVE STAFF PROFILE ---
      const payload = { 
        full_name: name, 
        role, 
        phone, 
        org_id: profile?.org_id,
        pin_code: pin || null,
        auth_id: authId 
      };

      let error;
      if (editingStaff) {
        const res = await supabase.from('staff').update(payload).eq('id', editingStaff.id);
        error = res.error;
      } else {
        const res = await supabase.from('staff').insert(payload);
        error = res.error;
      }

      if (error) throw error;

      toast.success(`Staff ${editingStaff ? 'updated' : 'added'}!`);
      setShowModal(false);
      fetchStaff();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (s: any) => {
    const { error } = await supabase.from('staff').update({ is_active: !s.is_active }).eq('id', s.id);
    if (!error) fetchStaff();
    else toast.error("Failed to update status");
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
                </h3>
                <p className="text-xs text-gray-400 uppercase">{s.role}</p>
                <p className="text-sm text-gray-500 mt-1">{s.phone || 'No phone'}</p>
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
          <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">{editingStaff ? 'Edit' : 'Add New'} Staff</h2>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
              
              {/* OPTION 1: LINK EXISTING USER */}
              {!editingStaff && (
                <div className="space-y-3 border-b border-gray-700 pb-4">
                  <h3 className="text-md font-bold text-purple-400 flex items-center gap-2"><LinkIcon size={16}/> Option A: Link Existing User</h3>
                  <select 
                    value={linkUserId}
                    onChange={(e) => { setLinkUserId(e.target.value); setStaffEmail(''); setStaffPassword(''); }} 
                    className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white"
                  >
                    <option value="">Select User (if exists)</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.email} ({u.full_name || 'No Name'})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* OPTION 2: CREATE NEW USER */}
              {!editingStaff && !linkUserId && (
                <div className="space-y-3 border-b border-gray-700 pb-4 mb-4">
                  <h3 className="text-md font-bold text-orange-400 flex items-center gap-2"><Mail size={16}/> Option B: Create New Login</h3>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={staffEmail} 
                      onChange={(e) => setStaffEmail(e.target.value)} 
                      className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" 
                      placeholder="new.staff@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Password</label>
                    <input 
                      type="password" 
                      value={staffPassword} 
                      onChange={(e) => setStaffPassword(e.target.value)} 
                      className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" 
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>
              )}

              {/* PROFILE DETAILS */}
              <h3 className="text-md font-bold text-gray-300">Profile Details</h3>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white">
                  <option value="waiter">Waiter</option>
                  <option value="chef">Chef</option>
                  <option value="bartender">Bartender</option>
                  <option value="room_manager">Room Manager</option>
                  <option value="manager">General Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white" type="tel" />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">PIN Code (4+ digits)</label>
                <input 
                  type="password" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 1234"
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white tracking-widest"
                />
                <p className="text-xs text-gray-500 mt-1">Used for quick POS login.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-gray-700 flex-shrink-0 bg-gray-800 rounded-b-lg">
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-600 rounded hover:bg-gray-500 text-white font-medium">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-orange-500 text-black font-bold rounded disabled:opacity-50 hover:bg-orange-400">
                  {submitting ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}