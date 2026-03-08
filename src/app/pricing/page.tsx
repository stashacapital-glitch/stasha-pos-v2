 'use client';

import { useState } from 'react';
import { Check, X, Zap, Star, ArrowRight, Users, BedDouble, ChefHat, FileText, Wifi } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {

  // Define the keys allowed in our values object
  type FeatureKey = 'pos' | 'users' | 'stock' | 'autoDeduct' | 'offline' | 'tables' | 'kds' | 'rooms' | 'payroll' | 'tax' | 'multiBranch';

  // Feature definitions for comparison
  const allFeatures: { name: string; key: FeatureKey }[] = [
    { name: 'POS (Order Taking)', key: 'pos' },
    { name: 'User Accounts', key: 'users' },
    { name: 'Stock Management', key: 'stock' },
    { name: 'Auto-Deduct Stock', key: 'autoDeduct' },
    { name: 'Offline Mode', key: 'offline' },
    { name: 'Table Management', key: 'tables' },
    { name: 'Kitchen Display (KDS)', key: 'kds' },
    { name: 'Hotel Rooms Module', key: 'rooms' },
    { name: 'Payroll (PAYE/NSSF)', key: 'payroll' },
    { name: 'Tax Reports (VAT)', key: 'tax' },
    { name: 'Multi-Branch', key: 'multiBranch' },
  ];

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '2,500',
      description: 'Essential tools for small cafes.',
      highlight: false,
      values: {
        pos: true, users: '3 Users', stock: true, autoDeduct: true, offline: true,
        tables: false, kds: false, rooms: false, payroll: false, tax: false, multiBranch: false,
      },
    },
    {
      id: 'standard',
      name: 'Standard',
      price: '5,500',
      description: 'Waiter service & table management.',
      highlight: false,
      values: {
        pos: true, users: '5 Users', stock: true, autoDeduct: true, offline: true,
        tables: '5 Tables', kds: false, rooms: false, payroll: false, tax: false, multiBranch: false,
      },
    },
    {
      id: 'regular',
      name: 'Regular',
      price: '9,500',
      description: 'Kitchen operations streamlined.',
      highlight: true,
      values: {
        pos: true, users: '10 Users', stock: true, autoDeduct: true, offline: true,
        tables: 'Unlimited', kds: true, rooms: false, payroll: false, tax: false, multiBranch: false,
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'Custom',
      description: 'Full hotel & enterprise suite.',
      highlight: false,
      values: {
        pos: true, users: 'Unlimited', stock: true, autoDeduct: true, offline: true,
        tables: 'Unlimited', kds: true, rooms: true, payroll: true, tax: true, multiBranch: true,
      },
    },
  ];

  const renderValue = (value: boolean | string) => {
    if (value === true) return <Check className="text-green-400 mx-auto" size={18} />;
    if (value === false) return <X className="text-gray-600 mx-auto" size={18} />;
    return <span className="text-xs text-gray-300 font-medium block text-center">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white py-16 px-4">
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-500">
          Choose Your Plan
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Start small, scale infinitely. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Comparison Table View for Desktop */}
      <div className="hidden lg:block overflow-x-auto pb-8">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              <th className="w-1/4 p-4 text-left bg-gray-900 rounded-tl-xl border-b border-gray-800">
                <span className="text-lg font-bold text-gray-400">Features</span>
              </th>
              {plans.map((plan) => (
                <th key={plan.id} className={`w-1/5 p-4 text-center border-b ${plan.highlight ? 'bg-gray-800 border-orange-500 border-t-2 border-l border-r' : 'bg-gray-900 border-gray-800'}`}>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                  <div className="mt-2 mb-4">
                    {plan.price === 'Custom' 
                      ? <span className="text-2xl font-bold text-white">Custom</span>
                      : <><span className="text-2xl font-bold text-white">KES {plan.price}</span><span className="text-gray-400 text-xs">/mo</span></>
                    }
                  </div>
                  <Link 
                    href={plan.id === 'pro' ? 'mailto:sales@stasha.co.ke' : '/login'}
                    className={`inline-block px-6 py-2 rounded-lg font-bold text-sm ${
                      plan.highlight ? 'bg-orange-500 text-black hover:bg-orange-600' : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {plan.id === 'pro' ? 'Contact Sales' : 'Get Started'}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900">
            {allFeatures.map((feature, idx) => (
              <tr key={feature.key} className={`${idx === allFeatures.length - 1 ? 'border-b-0' : 'border-b border-gray-800'} hover:bg-gray-800/50`}>
                <td className="p-4 text-sm text-gray-300 font-medium">{feature.name}</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-${feature.key}`} className="p-4">
                    {renderValue(plan.values[feature.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card View for Mobile */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`relative rounded-2xl p-[1px] ${plan.highlight ? 'border-2 border-orange-500 shadow-lg shadow-orange-500/20' : 'border border-gray-800'}`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-orange-500 text-black text-xs font-bold rounded-full flex items-center gap-1">
                <Star size={10} /> MOST POPULAR
              </div>
            )}
            <div className="h-full bg-gray-900 rounded-2xl p-6 flex flex-col">
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className="text-gray-400 text-sm mt-1 mb-4">{plan.description}</p>
              <div className="mb-6">
                {plan.price === 'Custom' 
                  ? <span className="text-3xl font-bold text-white">Custom</span>
                  : <><span className="text-3xl font-bold text-white">KES {plan.price}</span><span className="text-gray-400">/mo</span></>
                }
              </div>
              
              <ul className="space-y-2 mb-6 flex-1">
                {allFeatures.map((f) => (
                  <li key={f.key} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{f.name}</span>
                    <span>{renderValue(plan.values[f.key])}</span>
                  </li>
                ))}
              </ul>

              <Link 
                href={plan.id === 'pro' ? 'mailto:sales@stasha.co.ke' : '/login'}
                className={`w-full py-2 rounded-lg font-bold text-center text-sm ${
                  plan.highlight ? 'bg-orange-500 text-black hover:bg-orange-600' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {plan.id === 'pro' ? 'Contact Sales' : 'Get Started'}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center text-gray-500 text-sm max-w-2xl mx-auto">
        <p>All prices exclude VAT (16%). Plans auto-renew monthly. Cancel anytime.</p>
      </div>
    </div>
  );
}