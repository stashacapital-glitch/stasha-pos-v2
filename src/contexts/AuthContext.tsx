 "use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { Session, User } from '@supabase/supabase-js';

type Role = 'owner' | 'admin' | 'barman' | 'waiter' | null;

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
        // If no profile found, we just log it. The user needs to run the SQL fix.
        console.warn("Profile fetch failed (Did you run the SQL script?):", error.message);
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
      
      if (session?.user) {
        await getProfileAndOrg(session.user.id);
      }
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
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
  }, [supabase]);

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