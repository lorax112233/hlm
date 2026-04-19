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
  isViewer: boolean;
  isLoading: boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("viewer");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncRole = async () => {
      const { data } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setRole(getUserRole(data.user));
      setUserId(data.user?.id ?? null);
      setIsLoading(false);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setRole("viewer");
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

  const value = useMemo(
    () => ({
      role,
      userId,
      isAdmin: role === "admin",
      isViewer: role === "viewer",
      isLoading,
    }),
    [isLoading, role, userId],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);

  if (!context) {
    throw new Error("useRole must be used inside RoleProvider.");
  }

  return context;
}
