 'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { Check } from 'lucide-react';

export default function LandingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase.from('plans').select('*').order('price_kes');
      setPlans(data || []);
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-orange-400 mb-2">Stasha Bar POS</h1>
        <p className="text-gray-400">Select your plan to begin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div key={plan.id} className={`p-6 rounded-lg border ${plan.highlight ? 'border-orange-500 bg-gray-800 scale-105' : 'border-gray-700 bg-gray-800'}`}>
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="text-3xl font-bold text-orange-400 my-4">KES {plan.price_kes}</p>
            <ul className="space-y-2 mb-6 text-sm text-gray-300">
              {plan.features.map((f: string) => <li key={f} className="flex items-center gap-2"><Check size={14} /> {f}</li>)}
            </ul>
            <button className="w-full bg-orange-500 text-black font-bold py-2 rounded hover:bg-orange-400">
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}