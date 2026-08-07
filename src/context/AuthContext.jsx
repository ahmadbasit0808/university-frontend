import { createContext, useContext, useState, useEffect } from "react";
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  seedAdmin,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (session exists)
    getMe()
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username, password) => {
    const res = await apiLogin(username, password);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const ensureAdmin = async () => {
    await seedAdmin();
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{ user, login, logout, ensureAdmin, loading, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
