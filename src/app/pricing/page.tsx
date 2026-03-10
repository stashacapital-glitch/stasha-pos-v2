'use client';

import { Check, X, Star, ArrowLeft, Zap, Building, ChefHat, UtensilsCrossed, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';

export default function PricingPage() {

  const plans = [
    {
      id: 'basic',
      icon: UtensilsCrossed,
      name: PLANS.basic.name,
      price: PLANS.basic.price,
      description: 'Best for small cafés & takeaways.',
      highlight: false,
      included: [ 'Quick Sale / Fast Checkout', 'Automatic Stock', 'Offline Mode', '3 User Accounts' ],
      notIncluded: [ 'Table Management', 'Kitchen Display' ],
    },
    {
      id: 'standard',
      icon: ChefHat,
      name: PLANS.standard.name,
      price: PLANS.standard.price,
      description: 'Ideal for busy bars & restaurants.',
      highlight: false,
      included: [ 'Table Management', '5 Tables Included', 'Stock & Offline', '5 User Accounts' ],
      notIncluded: [ 'Kitchen Display (Add-on)' ],
    },
    {
      id: 'regular',
      icon: Zap,
      name: PLANS.regular.name,
      price: PLANS.regular.price,
      description: 'Streamline kitchen & scale operations.',
      highlight: true, // MOST POPULAR
      included: [ 'Unlimited Tables', 'Kitchen Display (KDS)', 'Rooms Module', 'Payroll & Tax' ],
      notIncluded: [],
    },
    {
      id: 'pro',
      icon: Crown,
      name: PLANS.pro.name,
      price: PLANS.pro.price,
      description: 'For multi-branch chains & large hotels.',
      highlight: false,
      included: [ 'Multi-Branch Management', 'Unlimited Users', 'Advanced Analytics', 'Priority Support' ],
      notIncluded: [],
    },
    {
      id: 'custom',
      icon: Briefcase,
      name: PLANS.custom.name,
      price: PLANS.custom.price,
      description: 'Tailored solutions for unique needs.',
      highlight: false,
      included: [ 'Custom Development', 'Dedicated Server', 'SLA Agreements', 'On-Site Training' ],
      notIncluded: [],
    },
  ];

  const addons = [
    { name: 'Extra Tables', price: 'KES 500', unit: '/month' },
    { name: 'Kitchen Display (KDS)', price: 'KES 1,200', unit: '/month' },
    { name: 'Rooms Module', price: 'KES 1,500', unit: '/month' },
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
            SmartServe POS / ERP – Pricing
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-4">
            All prices include VAT & Catering Levy.
          </p>
        </div>
      </div>

      {/* CARDS GRID - 5 Columns on Desktop */}
      <div className="max-w-[1400px] mx-auto px-4 pb-20 -mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <Star size={12} className="fill-current" /> POPULAR
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${plan.highlight ? 'bg-orange-500 text-black' : 'bg-gray-800 text-orange-400'}`}>
                  <plan.icon size={20} />
                </div>

                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <p className="text-gray-500 text-xs mb-4 min-h-[30px]">{plan.description}</p>

                <div className="mb-4">
                  {plan.price === 'Custom' ? (
                    <span className="text-2xl font-extrabold">Contact Us</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-gray-400">KES</span>
                      <span className="text-2xl font-extrabold">{plan.price}</span>
                      <span className="text-gray-500 text-xs">/mo</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-2 mb-4 flex-1">
                  {plan.included.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs">
                      <Check size={12} className="text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.notIncluded.length > 0 && (
                  <div className="border-t border-gray-700 pt-2 mt-auto mb-3">
                     <ul className="space-y-1">
                     {plan.notIncluded.map((feature, idx) => (
                       <li key={idx} className="flex items-center gap-2 text-[10px]">
                         <X size={10} className="text-gray-600" />
                         <span className="text-gray-600">{feature}</span>
                       </li>
                     ))}
                     </ul>
                  </div>
                )}

                <Link 
                  href={plan.id === 'custom' ? 'mailto:sales@stasha.co.ke' : `/login?plan=${plan.id}`}
                  className={`w-full py-2.5 rounded-lg font-bold text-center transition text-sm ${
                    plan.highlight 
                      ? 'bg-orange-500 text-black hover:bg-orange-600' 
                      : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                  )`}
                >
                  {plan.id === 'custom' ? 'Contact Sales' : 'Get Started'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD-ONS SECTION */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white text-center mb-2">Optional Add-Ons</h2>
            <p className="text-gray-500 text-center text-xs mb-4">Enhance your plan with powerful modules.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               {addons.map((addon, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                     <span className="text-gray-300 text-xs font-medium">{addon.name}</span>
                     <div className="text-right">
                        <span className="text-orange-400 font-bold text-sm">{addon.price}</span>
                        <span className="text-gray-500 text-[10px]">{addon.unit}</span>
                     </div>
                  </div>
               ))}
            </div>
          </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-gray-800 py-12 text-center">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
           <ArrowLeft size={14} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}