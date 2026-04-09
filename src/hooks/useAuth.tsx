import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type UserRole = "admin" | "staff";

export interface UserPermissions {
  canViewAccounting: boolean;
  canEditCroquis: boolean;
  canManageGuests: boolean;
  canEditTimeline: boolean;
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

interface UserProfile {
  role: UserRole;
  email: string;
  permissions?: UserPermissions;
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch role and permissions from Firestore
        const userRef = doc(db, "users", u.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setRole(data.role);
          // Handle legacy users without permissions
          const userPerms = data.permissions || (data.role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS);
          setPermissions(userPerms);
        } else {
          // Check if this email is pre-authorized
          const authRef = doc(db, "authorized_emails", u.email?.toLowerCase() || "");
          const authDoc = await getDoc(authRef);
          
          let initialRole: UserRole = "staff"; // Safer default
          let initialPerms: UserPermissions = DEFAULT_STAFF_PERMISSIONS;
          
          if (authDoc.exists()) {
            const authData = authDoc.data() as any;
            initialRole = authData.role;
            initialPerms = authData.permissions || (initialRole === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS);
          } else if (u.email === "pepe.jlfc.16@gmail.com") {
             // Hardcoded admin for owner
             initialRole = "admin";
             initialPerms = DEFAULT_ADMIN_PERMISSIONS;
          }
          
          await setDoc(userRef, {
            email: u.email,
            role: initialRole,
            permissions: initialPerms,
            createdAt: new Date().toISOString()
          });
          setRole(initialRole);
          setPermissions(initialPerms);
        }
      } else {
        setRole(null);
        setPermissions(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
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
