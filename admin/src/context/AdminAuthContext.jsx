import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { API_BASE } from "../config.js";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkKeyConfigured = 
  Boolean(PUBLISHABLE_KEY) && 
  (PUBLISHABLE_KEY.startsWith("pk_test_") || PUBLISHABLE_KEY.startsWith("pk_live_")) &&
  PUBLISHABLE_KEY !== "pk_test_your_clerk_publishable_key_here";

export const AUTHORIZED_ADMIN_EMAIL = (
  import.meta.env.VITE_AUTHORIZED_ADMIN_EMAIL || "vimalgupta8025@gmail.com"
).toLowerCase().trim();

const AdminAuthContext = createContext(null);

function InnerAdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("medicare_admin_token") || "");
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem("medicare_admin_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [unauthorizedAccount, setUnauthorizedAccount] = useState(null); // stores { email } if wrong Clerk account

  // Clerk hooks (rendered inside ClerkProvider)
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  // Handle Clerk authentication sync
  useEffect(() => {
    if (!isClerkKeyConfigured || !isClerkLoaded) {
      return;
    }

    if (isClerkSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase().trim();

      if (email === AUTHORIZED_ADMIN_EMAIL) {
        // Authorized Super Admin detected from Clerk
        setUnauthorizedAccount(null);

        // Exchange Clerk session with backend to get valid admin JWT
        fetch(`${API_BASE}/api/admin/clerk-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, clerkUserId: clerkUser.id }),
        })
          .then((r) => r.json())
          .then((json) => {
            if (json?.success && json?.token) {
              setToken(json.token);
              setAdminUser(json.admin);
              localStorage.setItem("medicare_admin_token", json.token);
              localStorage.setItem("medicare_admin_user", JSON.stringify(json.admin));
            }
          })
          .catch((err) => {
            console.error("Clerk admin session exchange error:", err);
          })
          .finally(() => {
            setLoading(false);
          });
      } else if (email) {
        // Non-authorized account signed in through Clerk
        setUnauthorizedAccount({ email });
        setToken("");
        setAdminUser(null);
        localStorage.removeItem("medicare_admin_token");
        localStorage.removeItem("medicare_admin_user");
        setLoading(false);
      }
    } else if (!isClerkSignedIn) {
      setUnauthorizedAccount(null);
    }
  }, [isClerkLoaded, isClerkSignedIn, clerkUser]);

  // Validate existing stored token on mount (for password-based sessions)
  useEffect(() => {
    let isMounted = true;
    const verifyExistingToken = async () => {
      const savedToken = localStorage.getItem("medicare_admin_token");
      if (!savedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/admin/verify`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        const json = await res.json().catch(() => null);

        if (res.ok && json?.success && json?.admin) {
          const email = json.admin.email?.toLowerCase().trim();
          if (email === AUTHORIZED_ADMIN_EMAIL) {
            if (isMounted) {
              setToken(savedToken);
              setAdminUser(json.admin);
              localStorage.setItem("medicare_admin_user", JSON.stringify(json.admin));
            }
          } else {
            // Outdated or wrong admin account
            if (isMounted) {
              setToken("");
              setAdminUser(null);
              localStorage.removeItem("medicare_admin_token");
              localStorage.removeItem("medicare_admin_user");
            }
          }
        } else {
          // Token expired or invalid
          if (isMounted) {
            setToken("");
            setAdminUser(null);
            localStorage.removeItem("medicare_admin_token");
            localStorage.removeItem("medicare_admin_user");
          }
        }
      } catch (err) {
        console.error("Admin session verification error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifyExistingToken();

    return () => {
      isMounted = false;
    };
  }, []);

  // Direct password authentication
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success || !json?.token) {
      throw new Error(json?.message || "Invalid administrator credentials");
    }

    setToken(json.token);
    setAdminUser(json.admin);
    setUnauthorizedAccount(null);
    localStorage.setItem("medicare_admin_token", json.token);
    localStorage.setItem("medicare_admin_user", JSON.stringify(json.admin));

    return json.admin;
  }, []);

  // Logout from both Clerk and stored token
  const logout = useCallback(async () => {
    setToken("");
    setAdminUser(null);
    setUnauthorizedAccount(null);
    localStorage.removeItem("medicare_admin_token");
    localStorage.removeItem("medicare_admin_user");

    if (clerkSignOut && isClerkSignedIn) {
      try {
        await clerkSignOut();
      } catch (err) {
        console.error("Clerk signout error:", err);
      }
    }
  }, [clerkSignOut, isClerkSignedIn]);

  const value = {
    token,
    adminUser,
    isAuthenticated: Boolean(token) && adminUser?.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL,
    loading,
    unauthorizedAccount,
    authorizedEmail: AUTHORIZED_ADMIN_EMAIL,
    isClerkConfigured: isClerkKeyConfigured,
    isClerkSignedIn,
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function AdminAuthProvider({ children }) {
  return <InnerAdminAuthProvider>{children}</InnerAdminAuthProvider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
