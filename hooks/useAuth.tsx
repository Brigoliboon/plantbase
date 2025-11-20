import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  // Explicitly type the state so TypeScript knows it can hold a User or null
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
          console.error("getSession error:", error);
        } else if (mounted) {
          setUser(data.session?.user ?? null);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      // unsubscribe the listener properly
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
