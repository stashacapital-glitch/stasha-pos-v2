'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Save, Building, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BusinessSettingsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [taxRate, setTaxRate] = useState(16);
  const [serviceRate, setServiceRate] = useState(2);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [serviceEnabled, setServiceEnabled] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.id) fetchSettings();
  }, [profile]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('business_name, business_address, tax_rate, service_charge_rate, tax_enabled, service_charge_enabled')
      .eq('id', profile?.id)
      .single();

    if (data) {
      setBusinessName(data.business_name || '');
      setAddress(data.business_address || '');
      setTaxRate(data.tax_rate ? Number(data.tax_rate) * 100 : 16);
      setServiceRate(data.service_charge_rate ? Number(data.service_charge_rate) * 100 : 2);
      setTaxEnabled(data.tax_enabled || false);
      setServiceEnabled(data.service_charge_enabled || false);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        business_name: businessName,
        business_address: address,
        tax_rate: taxRate / 100, // Convert 16 to 0.16
        service_charge_rate: serviceRate / 100,
        tax_enabled: taxEnabled,
        service_charge_enabled: serviceEnabled
      })
      .eq('id', profile?.id);

    if (error) toast.error('Failed to save settings');
    else toast.success('Settings saved!');
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-orange-400">Business Settings</h1>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-6">
        
        {/* Business Info */}
        <div className="space-y-4 border-b border-gray-700 pb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Building size={18} /> Receipt Details</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Business Name</label>
            <input 
              type="text" 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Stasha Hotel"
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Address / Contacts</label>
            <textarea 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address, Phone, Email..."
              rows={2}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white"
            />
          </div>
        </div>

        {/* Tax & Levies */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Percent size={18} /> Taxes & Levies</h2>
          
          {/* VAT */}
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-white">VAT (Value Added Tax)</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
            {taxEnabled && (
              <div className="flex items-center gap-2">
                <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-20 p-1 bg-gray-800 rounded border border-gray-500 text-white text-center" />
                <span className="text-gray-300">%</span>
              </div>
            )}
          </div>

          {/* Catering Levy */}
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-white">Catering Levy / Service Charge</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={serviceEnabled} onChange={(e) => setServiceEnabled(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
            {serviceEnabled && (
              <div className="flex items-center gap-2">
                <input type="number" value={serviceRate} onChange={(e) => setServiceRate(Number(e.target.value))} className="w-20 p-1 bg-gray-800 rounded border border-gray-500 text-white text-center" />
                <span className="text-gray-300">%</span>
              </div>
            )}
          </div>

        </div>

        <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-orange-500 text-black font-bold rounded hover:bg-orange-400 flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Settings
        </button>
      </div>
    </div>
  );
}