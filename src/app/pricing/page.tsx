 'use client';

import { Check, X, Star, Zap, Crown, Building, ChefHat, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';

export default function PricingPage() {

  const plans = [
    {
      id: 'basic',
      icon: UtensilsCrossed,
      name: PLANS.basic.name,
      price: PLANS.basic.price,
      description: 'Perfect for small cafes and food joints starting their digital journey.',
      highlight: false,
      features: [
        { name: '3 User Accounts', enabled: true },
        { name: 'Stock Management', enabled: true },
        { name: 'Auto-Deduct Stock', enabled: true },
        { name: 'Offline Mode', enabled: true },
        { name: 'Table Management', enabled: false },
        { name: 'Kitchen Display', enabled: false },
      ],
    },
    {
      id: 'standard',
      icon: ChefHat,
      name: PLANS.standard.name,
      price: PLANS.standard.price,
      description: 'Ideal for busy bars and medium-sized restaurants.',
      highlight: false,
      features: [
        { name: '5 User Accounts', enabled: true },
        { name: '5 Tables Included', enabled: true },
        { name: 'Stock & Offline Mode', enabled: true },
        { name: 'Table Management', enabled: true },
        { name: 'Kitchen Display', enabled: false },
        { name: 'Rooms Module', enabled: false },
      ],
    },
    {
      id: 'regular',
      icon: Zap,
      name: PLANS.regular.name,
      price: PLANS.regular.price,
      description: 'Streamline your kitchen and scale operations.',
      highlight: true, // MOST POPULAR
      features: [
        { name: '10 User Accounts', enabled: true },
        { name: 'Unlimited Tables', enabled: true },
        { name: 'Kitchen Display (KDS)', enabled: true },
        { name: 'Full Stock Control', enabled: true },
        { name: 'Rooms Module', enabled: false },
        { name: 'Payroll & Tax', enabled: false },
      ],
    },
    {
      id: 'pro',
      icon: Building,
      name: PLANS.pro.name,
      price: PLANS.pro.price,
      description: 'Complete solution for hotels and large chains.',
      highlight: false,
      features: [
        { name: 'Unlimited Users', enabled: true },
        { name: 'Hotel Rooms Module', enabled: true },
        { name: 'Payroll & Taxes', enabled: true },
        { name: 'Multi-Branch Support', enabled: true },
        { name: 'Priority Support', enabled: true },
        { name: 'SLA Agreement', enabled: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* HEADER */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 to-gray-950 pointer-events-none" />
        <div className="max-w-7xl mx-auto pt-20 pb-12 px-4 text-center relative z-10">
          <span className="inline-block px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-sm font-semibold mb-6">
            Simple, Transparent Pricing
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Scale Your Business
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the perfect plan for your needs. No hidden fees.
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
                  {plan.price === 'Custom' ? (
                    <span className="text-4xl font-extrabold">Custom</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">KES {plan.price}</span>
                      <span className="text-gray-500">/mo</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      {feature.enabled ? (
                        <Check size={16} className="text-green-400 flex-shrink-0" />
                      ) : (
                        <X size={16} className="text-gray-600 flex-shrink-0" />
                      )}
                      <span className={feature.enabled ? 'text-gray-300' : 'text-gray-600'}>{feature.name}</span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href={plan.id === 'pro' ? 'mailto:sales@stasha.co.ke' : '/login'}
                  className={`w-full py-3 rounded-lg font-bold text-center transition ${
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

      {/* FOOTER */}
      <div className="border-t border-gray-800 py-12 text-center">
        <p className="text-gray-500 text-sm mb-4">
          All prices exclude VAT. Plans renew monthly. Cancel anytime.
        </p>
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
           <ArrowLeft size={14} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}