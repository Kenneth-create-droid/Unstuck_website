import React, { createContext, useContext, useState, useEffect } from "react";
import { getUserProfile, deactivateLocation } from "../api";


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
const [token, setToken] = useState(null);
const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    try {
      const stored = localStorage.getItem("unstuck_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }

      const storedToken = localStorage.getItem("unstuck_token");

          if (storedToken) {
            setToken(storedToken);
          }
    } catch (e) {
      console.error("Failed to parse stored user session", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userData, authToken) => {
  setUser(userData);
  localStorage.setItem("unstuck_user", JSON.stringify(userData));

  if (authToken) {
    setToken(authToken);
    localStorage.setItem("unstuck_token", authToken);
  } else {
    setToken(null);
    localStorage.removeItem("unstuck_token");
  }
};

  const logout = async () => {
    if (user?.id) {
      try {
        await deactivateLocation({ userId: user.id });
      } catch (e) {
        console.warn("Could not deactivate location on logout:", e.message);
      }
    }
    setUser(null);
setToken(null);

localStorage.removeItem("unstuck_user");
localStorage.removeItem("unstuck_token");
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    try {
      const fresh = await getUserProfile(user.id);
      if (fresh) {
        const updated = { ...user, ...fresh };
        setUser(updated);
        localStorage.setItem("unstuck_user", JSON.stringify(updated));
      }
    } catch (e) {
      console.warn("Could not refresh profile:", e.message);
    }
  };

  return (
   <AuthContext.Provider
  value={{ user, token, login, logout, refreshProfile, loading }}
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
