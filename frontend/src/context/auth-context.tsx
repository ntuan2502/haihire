"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Role } from "@/types";

export interface RecruiterUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: RecruiterUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "ats_recruiter_token";
const USER_KEY = "ats_recruiter_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<RecruiterUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
      }
    } catch (err) {
      console.error("Failed to load saved session", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<{
      accessToken: string;
      user: RecruiterUser;
    }>("/auth/login", {
      email,
      password,
    });

    const { accessToken, user: userData } = response.data;

    setToken(accessToken);
    setUser(userData);
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common.Authorization;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
