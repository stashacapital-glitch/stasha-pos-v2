 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { organization, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [orgName, setOrgName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setTaxId(organization.tax_id || '');
      setAddress(organization.address || '');
      setLoading(false);
    }
  }, [organization]);

  const handleSave = async () => {
    if (!profile?.org_id) return;
    setSaving(true);

    const { error } = await supabase
      .from('organizations')
      .update({ 
          name: orgName, 
          tax_id: taxId,
          address: address
      })
      .eq('id', profile.org_id);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved!');
      // Refresh context or local state
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-gray-400 mb-8">Manage your business profile.</p>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6">
        
        <div>
          <label className="block text-sm font-bold mb-2">Business Name</label>
          <input 
            type="text" 
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full p-3 bg-gray-700 rounded border border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Tax ID / PIN</label>
          <input 
            type="text" 
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="P051XXXXX"
            className="w-full p-3 bg-gray-700 rounded border border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Address</label>
          <textarea 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Location, City, Country"
            className="w-full p-3 bg-gray-700 rounded border border-gray-600"
            rows={3}
          />
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full bg-orange-500 text-black font-bold py-3 rounded hover:bg-orange-400 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}