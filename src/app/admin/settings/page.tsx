 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate';
import { Loader2, Save, Building, Receipt, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [orgName, setOrgName] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  const supabase = createClient();

  useEffect(() => {
    // Fix: Stop loading immediately if profile is ready, even if org is missing
    if (profile) {
      if (profile.organization) {
        const org = profile.organization;
        setOrgName(org.name || '');
        setOrgAddress(org.address || '');
        setOrgPhone(org.phone || '');
        setReceiptFooter(org.receipt_footer || 'Thank you!');
      }
      setLoading(false);
    }
  }, [profile]);

  const handleSaveOrganization = async () => {
    if (!profile?.org_id) {
        toast.error("Cannot save: Organization ID is missing in your profile.");
        return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        name: orgName,
        address: orgAddress,
        phone: orgPhone,
        receipt_footer: receiptFooter
      })
      .eq('id', profile.org_id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Settings saved!");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['owner', 'admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-orange-400 mb-6">Settings</h1>

        {/* Warning if Org ID is missing */}
        {!profile?.org_id && (
            <div className="bg-red-900 border border-red-500 p-4 rounded mb-6 text-white">
                <p className="font-bold">Account Setup Incomplete</p>
                <p className="text-sm">Your profile is not linked to a valid Organization. Please run the SQL setup or create an organization.</p>
            </div>
        )}

        <div className="space-y-8">
          
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
              <Building className="text-orange-400" size={24} />
              <h2 className="text-xl font-bold">Organization Details</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Business Name</label>
                <input 
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-gray-700 p-3 rounded border border-gray-600 text-white"
                  placeholder="Stasha Bar"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Address</label>
                <input 
                  type="text"
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  className="w-full bg-gray-700 p-3 rounded border border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                <input 
                  type="text"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  className="w-full bg-gray-700 p-3 rounded border border-gray-600 text-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
             <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
              <User className="text-green-400" size={24} />
              <h2 className="text-xl font-bold">Account Info</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-gray-400">Email</p>
                    <p className="font-mono">{user?.email}</p>
                </div>
                <div>
                    <p className="text-gray-400">Role</p>
                    <p className="uppercase font-bold text-orange-400">{profile?.role}</p>
                </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSaveOrganization}
              disabled={saving || !profile?.org_id}
              className="bg-green-600 text-white font-bold px-8 py-3 rounded-lg flex items-center gap-2 hover:bg-green-500 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </div>
      </div>
    </PermissionGate>
  );
}