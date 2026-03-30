"use client";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext({ user: null, loading: false });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (active) {
          setUser(data?.user || null);
        }
      } catch (error) {
        console.error("Failed to load auth session:", error);
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
    setUser(null);
  }

  const value = {
    user,
    loading,
    setUser,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
