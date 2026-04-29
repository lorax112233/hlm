"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserRole, type UserRole } from "@/lib/roles";

type RoleContextValue = {
  role: UserRole;
  userId: string | null;
  isAdmin: boolean;
  isTechnician: boolean;
  isLoading: boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  // Least-privilege defaults until user metadata is loaded.
  const [role, setRole] = useState<UserRole>("technician");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Resolve role from the current authenticated user.
    const syncRole = async () => {
      const { data } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setRole(getUserRole(data.user));
      setUserId(data.user?.id ?? null);
      setIsLoading(false);
    };

    // React to auth changes so role state stays current.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setRole("technician");
        setUserId(null);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        setRole(getUserRole(session.user));
        setUserId(session.user.id);
        setIsLoading(false);
      }
    });

    void syncRole();

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Memoize derived role flags to avoid unnecessary re-renders downstream.
  const value = useMemo(
    () => ({
      role,
      userId,
      isAdmin: role === "admin",
      isTechnician: role === "technician",
      isLoading,
    }),
    [isLoading, role, userId],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);

  // Guard misuse to keep provider boundaries explicit.
  if (!context) {
    throw new Error("useRole must be used inside RoleProvider.");
  }

  return context;
}

