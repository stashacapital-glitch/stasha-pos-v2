 "use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

// 1. Define strict types based on your DB schema
type Role = 'owner' | 'admin' | 'barman' | 'waiter' | null;

// Using 'any' for Profile/Organization if you haven't generated types yet, 
// but strictly typing Role is already a big improvement.
type AuthContextType = {
  user: User | null;
  profile: any | null; 
  organization: any | null;
  role: Role;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [role, setRole] = useState<Role>(null);
  
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  const getProfileAndOrg = async (userId: string) => {
    if (!userId) return;

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*, organizations(*)')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn("Profile fetch failed:", error.message);
        return;
      }
      
      if (profileData) {
        setProfile(profileData);
        setRole(profileData.role as Role);
        
        if (profileData.organizations) {
          setOrganization(profileData.organizations);
        }
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) await getProfileAndOrg(session.user.id);
      setLoading(false);
    };

    getSession();

    // FIX: Added explicit types for event and session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfileAndOrg(session.user.id);
        } else {
          setProfile(null);
          setOrganization(null);
          setRole(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOrganization(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, organization, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};