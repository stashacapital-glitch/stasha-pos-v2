 'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

// 1. Extract the component that uses useSearchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  
  // Get plan from URL (default to basic)
  const selectedPlan = searchParams.get('plan') || 'basic';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { plan_type: selectedPlan } // Save selected plan
          }
        });
        if (error) throw error;
        toast.success('Account created! Please check your email to verify.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/admin');
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">SmartServe POS</h1>
            <p className="text-gray-400 text-sm">
              {isRegister ? 'Create your account' : 'Sign in to your dashboard'}
            </p>
            {selectedPlan && isRegister && (
               <span className="inline-block mt-2 px-2 py-1 bg-orange-900/30 text-orange-300 text-xs rounded-full border border-orange-700">
                 Selected Plan: {selectedPlan.toUpperCase()}
               </span>
            )}
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> {isRegister ? 'Create Account' : 'Sign In'}</>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-gray-400 hover:text-orange-400 transition"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
        </div>
        
        <p className="text-center text-gray-600 text-xs mt-6">
          Powered by SmartServe ERP
        </p>
      </div>
    </div>
  );
}

// 2. Default export wraps LoginForm in Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-400" size={32} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}