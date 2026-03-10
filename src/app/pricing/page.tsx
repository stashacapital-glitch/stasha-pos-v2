 'use client';

import { Check, X, Star, ArrowLeft, Zap, Building, ChefHat, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';

export default function PricingPage() {

  const plans = [
    {
      id: 'basic',
      icon: UtensilsCrossed,
      name: PLANS.basic.name,
      price: PLANS.basic.price,
      description: 'Best for small cafés & takeaways starting their digital journey.',
      highlight: false,
      included: [
        'Quick Sale / Fast Checkout',
        'Automatic Stock Management',
        'Offline Mode',
        '3 User Accounts',
        'Product & Category Management',
        'Sales History & Basic Reports',
      ],
      notIncluded: [
        'Table Management',
        'Kitchen Display System (KDS)',
        'Rooms Module',
      ],
    },
    {
      id: 'standard',
      icon: ChefHat,
      name: PLANS.standard.name,
      price: PLANS.standard.price,
      description: 'Ideal for busy bars & medium-sized restaurants ready to scale.',
      highlight: false,
      included: [
        'Quick Sale Enabled',
        'Table Management',
        '5 Tables Included',
        'Stock & Offline Management',
        '5 User Accounts',
      ],
      notIncluded: [
        'Kitchen Display (Add-on)',
        'Rooms Module (Add-on)',
      ],
    },
    {
      id: 'regular',
      icon: Zap,
      name: PLANS.regular.name,
      price: PLANS.regular.price,
      description: 'Streamline your kitchen and scale operations seamlessly.',
      highlight: true, // MOST POPULAR
      included: [
        'Quick Sale & Table Mgmt',
        'Unlimited Tables',
        'Kitchen Display (KDS)',
        'Rooms Module',
        'Payroll & Tax Management',
        'AI Forecasting',
      ],
      notIncluded: [],
    },
    {
      id: 'pro',
      icon: Building,
      name: PLANS.pro.name,
      price: PLANS.pro.price,
      description: 'The ultimate solution for hotels, multi-branch restaurants.',
      highlight: false,
      included: [
        'Unlimited Users & Branches',
        'Hotel Rooms Module',
        'Advanced Analytics & AI',
        'Priority Support & SLA',
        'Full Custom Setup',
      ],
      notIncluded: [],
    },
  ];

  const addons = [
    { name: 'Extra Tables', price: 'KES 500', unit: '/month' },
    { name: 'Kitchen Display (KDS)', price: 'KES 1,200', unit: '/month' },
    { name: 'Rooms Module', price: 'KES 1,500', unit: '/month' },
    { name: 'AI Sales Forecasting', price: 'KES 2,000', unit: '/month' },
    { name: 'Multi-Branch Support', price: 'KES 3,500', unit: '/month' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* HEADER */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 to-gray-950 pointer-events-none" />
        <div className="max-w-7xl mx-auto pt-20 pb-12 px-4 text-center relative z-10">
          <span className="inline-block px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-sm font-semibold mb-6">
            Simple. Transparent. Scalable.
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            SmartServe POS / ERP – Pricing & Value
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-4">
            All prices include VAT & Catering Levy. Enable/disable taxes with a button.
          </p>
          <p className="text-md text-gray-500 max-w-xl mx-auto">
            Optional Business Setup ensures your system is ready to go from day one.
          </p>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="max-w-7xl mx-auto px-4 pb-20 -mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl flex flex-col ${
                plan.highlight 
                  ? 'bg-gradient-to-b from-orange-500/10 to-gray-900 border-2 border-orange-500 shadow-2xl shadow-orange-500/10 scale-105 z-10' 
                  : 'bg-gray-900 border border-gray-800'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 text-black text-xs font-bold rounded-full flex items-center gap-1 shadow-lg">
                  <Star size={12} className="fill-current" /> MOST POPULAR
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.highlight ? 'bg-orange-500 text-black' : 'bg-gray-800 text-orange-400'}`}>
                  <plan.icon size={24} />
                </div>

                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-6 min-h-[40px]">{plan.description}</p>

                <div className="mb-6">
                  {plan.id === 'pro' ? (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 uppercase">Starting from</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-400">KES</span>
                        <span className="text-4xl font-extrabold">15,000</span>
                        <span className="text-gray-500">/mo</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-gray-400">KES</span>
                      <span className="text-4xl font-extrabold">{plan.price}</span>
                      <span className="text-gray-500">/mo</span>
                    </div>
                  )}
                </div>

                {/* Included Features */}
                <ul className="space-y-2 mb-4 flex-1">
                  {plan.included.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check size={14} className="text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Not Included (Logic Fix) */}
                {plan.notIncluded.length > 0 && (
                  <div className="border-t border-gray-700 pt-3 mt-auto">
                    <p className="text-[10px] uppercase text-gray-600 font-bold mb-2">Not Included</p>
                    <ul className="space-y-1">
                    {plan.notIncluded.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs">
                        <X size={12} className="text-gray-600 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                    </ul>
                  </div>
                )}

                <Link 
                  href={plan.id === 'pro' ? 'mailto:sales@stasha.co.ke' : `/login?plan=${plan.id}`}
                  className={`w-full py-3 rounded-lg font-bold text-center transition mt-4 ${
                    plan.highlight 
                      ? 'bg-orange-500 text-black hover:bg-orange-600' 
                      : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {plan.id === 'pro' ? 'Contact Sales' : 'Get Started'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD-ONS SECTION (Strategic Improvement) */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white text-center mb-2">Optional Add-Ons</h2>
            <p className="text-gray-500 text-center text-sm mb-6">Enhance your plan with powerful modules.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {addons.map((addon, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                     <span className="text-gray-300 text-sm font-medium">{addon.name}</span>
                     <div className="text-right">
                        <span className="text-orange-400 font-bold">{addon.price}</span>
                        <span className="text-gray-500 text-xs">{addon.unit}</span>
                     </div>
                  </div>
               ))}
            </div>
          </div>
      </div>

      {/* COMPARISON TABLE */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Competitive Pricing Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-4 text-gray-400">Plan</th>
                  <th className="p-4 text-gray-400">Price</th>
                  <th className="p-4 text-gray-400">Key Audience</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="p-4 font-bold text-white">Basic</td>
                  <td className="p-4 text-orange-400">KES 2,200</td>
                  <td className="p-4 text-gray-300">Small cafés & takeaways</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-4 font-bold text-white">Standard</td>
                  <td className="p-4 text-orange-400">KES 4,500</td>
                  <td className="p-4 text-gray-300">Busy bars & mid-sized restaurants</td>
                </tr>
                <tr className="border-b border-gray-800 bg-orange-900/10">
                  <td className="p-4 font-bold text-white">Regular</td>
                  <td className="p-4 text-orange-400">KES 8,000</td>
                  <td className="p-4 text-gray-300">Growing kitchens & full-service</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Pro</td>
                  <td className="p-4 text-orange-400">From KES 15,000</td>
                  <td className="p-4 text-gray-300">Hotels & multi-branch chains</td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-gray-800 py-12 text-center">
        <p className="text-gray-500 text-sm mb-4">
          Designed to balance affordability, value, and profitability.
        </p>
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
           <ArrowLeft size={14} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}