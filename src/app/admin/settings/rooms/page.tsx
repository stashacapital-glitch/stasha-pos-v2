 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Pencil, Trash2, Users, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GuestsManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchGuests = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) toast.error('Failed to fetch guests');
    else setGuests(data || []);
    setLoading(false);
  };

  useEffect(() => { 
    if (profile?.org_id) {
        fetchGuests(); 
    } else {
        setLoading(false);
    }
  }, [profile]);

  const resetForm = () => {
    setName(''); setPhone(''); setEmail(''); setIdNumber(''); setEditingGuest(null);
  };

  const openModal = (guest?: any) => {
    if (guest) {
      setEditingGuest(guest);
      setName(guest.full_name);
      setPhone(guest.phone);
      setEmail(guest.email);
      setIdNumber(guest.id_number);
    } else { resetForm(); }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // SAFETY CHECK: Prevent the RLS error
    if (!profile?.org_id) {
      toast.error("Your account is missing an Organization ID. Please Log Out and Log Back in.");
      console.error("Missing org_id in profile:", profile);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: name,
        phone,
        email,
        id_number: idNumber,
        org_id: profile.org_id // <--- THIS IS THE KEY
      };

      console.log("Submitting Guest Payload:", payload);

      let error;
      if (editingGuest) {
        const res = await supabase.from('guests').update(payload).eq('id', editingGuest.id);
        error = res.error;
      } else {
        const res = await supabase.from('guests').insert(payload);
        error = res.error;
      }

      if (error) throw error;

      toast.success(`Guest ${editingGuest ? 'updated' : 'added'}!`);
      setShowModal(false);
      fetchGuests();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this guest?")) return;
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Guest deleted'); fetchGuests(); }
  };

  // --- RENDER ---
  
  // 1. If loading
  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  // 2. If profile is loaded but org_id is MISSING (Causes the error)
  if (!profile?.org_id) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-900/20 border border-red-500 p-8 rounded-lg inline-block">
          <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-xl font-bold text-red-400 mb-2">Account Configuration Error</h2>
          <p className="text-gray-400 mb-4">Your user profile is not linked to an organization.</p>
          <p className="text-sm text-gray-500 mb-6">
            This happens if the database trigger failed during signup. <br/>
            Please log out and log back in to refresh your session.
          </p>
          <button 
            onClick={async () => { 
                await supabase.auth.signOut(); 
                window.location.href = '/login'; 
            }}
            className="bg-orange-500 text-black px-6 py-2 rounded font-bold hover:bg-orange-400"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  // 3. Normal Render
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Guest Management</h1>
          <p className="text-gray-400">Manage hotel guests and customers.</p>
        </div>
        <button onClick={() => openModal()} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
          <Plus size={18} /> Add Guest
        </button>
      </div>

      {/* Guests List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Email</th>
              <th className="p-4">ID #</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {guests.length === 0 ? (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                        No guests found. Click "Add Guest" to start.
                    </td>
                </tr>
            ) : (
                guests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-700/50">
                    <td className="p-4 font-medium">{guest.full_name}</td>
                    <td className="p-4">{guest.phone || '-'}</td>
                    <td className="p-4">{guest.email || '-'}</td>
                    <td className="p-4">{guest.id_number || '-'}</td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openModal(guest)} className="text-blue-500 hover:text-blue-400"><Pencil size={18} /></button>
                        <button onClick={() => handleDelete(guest.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingGuest ? 'Edit Guest' : 'Add New Guest'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600" type="tel" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600" type="email" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">ID / Passport #</label>
                <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="w-full p-3 bg-gray-700 rounded border border-gray-600" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50 hover:bg-orange-400">
                  {submitting ? 'Saving...' : 'Save Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}