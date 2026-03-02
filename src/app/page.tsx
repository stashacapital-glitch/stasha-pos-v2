 'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase';
import { Check, Zap, Building, Store, Cigarette } from 'lucide-react';

export default function LandingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
      } else {
        setPlans(data || []);
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <p>Loading Plans...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-orange-400 mb-3">Stasha POS</h1>
        <p className="text-gray-400 text-lg">Professional Hotel & Bar Management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`relative p-6 rounded-xl border flex flex-col transition-transform duration-300 ${
              plan.is_popular 
                ? 'border-orange-500 bg-gray-800 scale-105 shadow-xl shadow-orange-500/20 z-10' 
                : 'border-gray-700 bg-gray-800 hover:border-gray-500'
            }`}
          >
            {/* Popular Badge */}
            {plan.is_popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Zap size={12}/> MOST POPULAR
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className="text-gray-400 text-xs mt-1">{plan.description}</p>
            </div>

            <div className="my-4">
              {plan.price > 0 ? (
                <>
                  <span className="text-3xl font-bold text-white">KES {plan.price.toLocaleString()}</span>
                  <span className="text-gray-500 text-sm">/mo</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold text-white">{plan.interval === 'contact' ? 'Custom' : 'Free'}</span>
                  {plan.interval === 'contact' && <span className="text-gray-500 text-sm block text-xs">Contact Sales</span>}
              </>
              )}
            </div>

            <ul className="space-y-2 mb-6 flex-grow text-sm text-gray-300">
              {plan.features?.map((feature: string) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link href="/login" className="w-full">
              <button 
                className={`w-full py-2 rounded font-bold text-sm transition ${
                  plan.is_popular
                    ? 'bg-orange-500 text-black hover:bg-orange-400 shadow-lg shadow-orange-500/30'
                    : 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                }`}
              >
                Get Started
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}