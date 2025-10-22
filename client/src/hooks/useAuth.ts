import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName || '',
        }
      }
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      // 임시 로컬 인증 (개발용)
      if (email === 'test@example.com' && password === 'password123') {
        const mockUser = {
          id: '1',
          email: 'test@example.com',
          user_metadata: {
            first_name: 'Test',
            last_name: 'User'
          }
        };
        
        const mockSession = {
          access_token: 'mock_token_' + Date.now(),
          user: mockUser
        };

        // 로컬 상태 업데이트
        setUser(mockUser as any);
        setSession(mockSession as any);

        return { data: { user: mockUser, session: mockSession }, error: null };
      }

      // Supabase 인증 (실제 키가 있을 때)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { data, error };
    } catch (error) {
      return { data: null, error: { message: '인증 중 오류가 발생했습니다.' } };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
  };
}
