import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getLandingRouteByRole,
  loginRequest,
  logoutRequest,
  refreshProfileRequest,
  registerRequest,
  updateProfileRequest,
  watchAuthState,
} from "../lib/authService.js";
import { setSessionExpiredHandler } from "../lib/apiClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = watchAuthState((nextUser, nextToken) => {
      setToken(nextToken);
      setUser(nextUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setToken(null);
    });

    return () => setSessionExpiredHandler(null);
  }, []);

  async function login(payload) {
    const { user: loggedInUser, token: nextToken } = await loginRequest(payload);
    setUser(loggedInUser);
    setToken(nextToken);
    return loggedInUser;
  }

  async function register(payload) {
    const { user: newUser } = await registerRequest(payload);
    await logoutRequest();
    setUser(null);
    setToken(null);
    return newUser;
  }

  async function updateProfile(payload) {
    const { user: updatedUser } = await updateProfileRequest(payload);
    setUser(updatedUser);
    return updatedUser;
  }

  async function refreshProfile() {
    const { user: refreshedUser, token: refreshedToken } = await refreshProfileRequest();
    setUser(refreshedUser);
    setToken(refreshedToken);
    return refreshedUser;
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
    setToken(null);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      updateProfile,
      refreshProfile,
      logout,
      getLandingRouteByRole,
    }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth لازم يتستخدم جوه AuthProvider");
  return ctx;
}
