"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, clearToken, User } from "./api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("inkmind_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/api/auth/me")
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post<{ access_token: string; user: User }>("/api/auth/login", { email, password });
    setToken(data.access_token);
    setUser(data.user);
    router.push("/dashboard");
  }

  async function register(name: string, email: string, password: string) {
    const data = await api.post<{ access_token: string; user: User }>("/api/auth/register", {
      name,
      email,
      password,
    });
    setToken(data.access_token);
    setUser(data.user);
    router.push("/dashboard");
  }

  async function loginDemo() {
    const data = await api.post<{ access_token: string; user: User }>("/api/demo/login");
    setToken(data.access_token);
    setUser(data.user);
    router.push("/dashboard");
  }

  function logout() {
    clearToken();
    setUser(null);
    router.push("/");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
