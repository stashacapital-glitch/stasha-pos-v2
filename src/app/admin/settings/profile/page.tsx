 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Save, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';

export default function BusinessProfilePage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [serviceCharge, setServiceCharge] = useState('0');
  const [taxEnabled, setTaxEnabled] = useState(false);

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || '');
      setAddress(profile.address || '');
      setPhone(profile.phone || '');
      // FIX: Handle undefined with default 0
      setTaxRate(((profile.tax_rate || 0) * 100).toFixed(0));
      setServiceCharge(((profile.service_charge_rate || 0) * 100).toFixed(0));
      setTaxEnabled(profile.tax_enabled || false);
      setLoading(false);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const updates = {
      business_name: businessName,
      address,
      phone,
      tax_rate: parseFloat(taxRate) / 100,
      service_charge_rate: parseFloat(serviceCharge) / 100,
      tax_enabled: taxEnabled
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile?.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Business details updated!");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400 text-center">Admin Only</div>}>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Building className="text-orange-400" size={28} />
          <h1 className="text-3xl font-bold text-white">Business Profile</h1>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Business Name</label>
              <input 
                type="text" 
                value={businessName} 
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                placeholder="My Restaurant"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                    <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                    <input 
                    type="text" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                    />
                </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-bold text-white mb-4">Tax Settings</h3>
                <div className="flex items-center gap-2 mb-4">
                    <input 
                    id="taxEnabled" 
                    type="checkbox" 
                    checked={taxEnabled} 
                    onChange={(e) => setTaxEnabled(e.target.checked)} 
                    className="w-4 h-4 accent-orange-500"
                    />
                    <label htmlFor="taxEnabled" className="text-sm text-gray-300">Enable VAT/Sales Tax</label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">VAT Rate (%)</label>
                        <input 
                        type="number" 
                        value={taxRate} 
                        onChange={(e) => setTaxRate(e.target.value)}
                        disabled={!taxEnabled}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Service Charge (%)</label>
                        <input 
                        type="number" 
                        value={serviceCharge} 
                        onChange={(e) => setServiceCharge(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                        />
                    </div>
                </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg transition flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </PermissionGate>
  );
}