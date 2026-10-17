import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type UserRole = "admin" | "staff";

export interface UserPermissions {
  canViewAccounting: boolean;
  canEditCroquis: boolean;
  canManageGuests: boolean;
  canEditTimeline: boolean;
}

export const OWNER_EMAILS = [
  "pepe.jlfc.16@gmail.com",
  "isaalexandra40@gmail.com",
] as const;

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return (OWNER_EMAILS as readonly string[]).includes(email.toLowerCase().trim());
}

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  canViewAccounting: true,
  canEditCroquis: true,
  canManageGuests: true,
  canEditTimeline: true,
};

export const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  canViewAccounting: false,
  canEditCroquis: false,
  canManageGuests: false,
  canEditTimeline: true,
};

export interface AuthorizedUserRecord {
  id: string;
  role: UserRole;
  permissions?: UserPermissions;
  invitedBy?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  permissions: UserPermissions | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeAuthDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (unsubscribeAuthDoc) {
        unsubscribeAuthDoc();
        unsubscribeAuthDoc = null;
      }

      if (!u || !u.email) {
        setUser(null);
        setRole(null);
        setPermissions(null);
        setLoading(false);
        return;
      }

      const normalizedEmail = u.email.toLowerCase().trim();
      const userRef = doc(db, "users", u.uid);
      const authRef = doc(db, "authorized_emails", normalizedEmail);

      unsubscribeAuthDoc = onSnapshot(
        authRef,
        async (authSnap) => {
          try {
            if (isOwnerEmail(normalizedEmail)) {
              setUser(u);
              setRole("admin");
              setPermissions(DEFAULT_ADMIN_PERMISSIONS);
              setLoading(false);

              await setDoc(
                userRef,
                {
                  email: normalizedEmail,
                  role: "admin",
                  permissions: DEFAULT_ADMIN_PERMISSIONS,
                },
                { merge: true }
              );
              if (!authSnap.exists()) {
                await setDoc(
                  authRef,
                  {
                    role: "admin",
                    permissions: DEFAULT_ADMIN_PERMISSIONS,
                    createdAt: new Date().toISOString(),
                  },
                  { merge: true }
                );
              }
              return;
            }

            if (!authSnap.exists()) {
              // Access was revoked or email is not authorized
              setUser(null);
              setRole(null);
              setPermissions(null);
              setLoading(false);
              await signOut(auth);
              return;
            }

            const authData = authSnap.data() as Partial<AuthorizedUserRecord>;
            const currentRole: UserRole = authData.role === "admin" ? "admin" : "staff";
            const currentPerms: UserPermissions =
              currentRole === "admin"
                ? DEFAULT_ADMIN_PERMISSIONS
                : authData.permissions || DEFAULT_STAFF_PERMISSIONS;

            setUser(u);
            setRole(currentRole);
            setPermissions(currentPerms);
            setLoading(false);

            await setDoc(
              userRef,
              {
                email: normalizedEmail,
                role: currentRole,
                permissions: currentPerms,
              },
              { merge: true }
            );
          } catch (err) {
            console.error("Error syncing user profile:", err);
            setLoading(false);
          }
        },
        (error) => {
          console.error("Error listening to user permissions:", error);
          if (isOwnerEmail(normalizedEmail)) {
            setUser(u);
            setRole("admin");
            setPermissions(DEFAULT_ADMIN_PERMISSIONS);
          }
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeAuthDoc) unsubscribeAuthDoc();
      unsubscribeAuth();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
    if (!isOwnerEmail(normalizedEmail)) {
      const authRef = doc(db, "authorized_emails", normalizedEmail);
      const authSnap = await getDoc(authRef);
      if (!authSnap.exists()) {
        await signOut(auth);
        throw new Error("Tu acceso ha sido revocado o tu correo no está autorizado.");
      }
    }
    setUser(credential.user);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, permissions, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

