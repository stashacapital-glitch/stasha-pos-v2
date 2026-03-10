 'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'basic'; // Get plan from URL

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // SIGN UP FLOW
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              plan_type: selectedPlan, // Pass plan in metadata
            },
          },
        });

        if (error) throw error;
        
        // Immediately try to create profile if it doesn't exist
        if (data.user) {
             await createOrUpdateProfile(data.user.id, email, selectedPlan);
        }

        toast.success('Account created! Please check email to verify.');
      } else {
        // LOGIN FLOW
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Update plan on login (for testing/demo purposes)
          await createOrUpdateProfile(data.user.id, email, selectedPlan);
          router.push('/admin');
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateProfile = async (userId: string, email: string, plan: string) => {
    // This client-side upsert helps fix missing profiles immediately
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      email: email,
      plan_type: plan,
      role: 'admin',
      full_name: email.split('@')[0]
    }, { onConflict: 'id' });

    if (error) console.error("Profile upsert error", error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-400">StashaPOS</h1>
          <p className="text-gray-400 mt-2 text-sm">
            {isRegister ? `Create your ${selectedPlan.toUpperCase()} account` : `Login to continue`}
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-400 focus:ring-1 focus:ring-orange-500"
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
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-400 focus:ring-1 focus:ring-orange-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Login'}
          </button>

          <div className="text-center text-sm text-gray-500 pt-2">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-orange-400 hover:underline">
              {isRegister ? 'Login' : 'Register'}
            </button>
          </div>
        </form>

        <p className="text-xs text-center text-gray-600">
          By continuing, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}