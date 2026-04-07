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

interface UserProfile {
  role: UserRole;
  email: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch role from Firestore
        const userRef = doc(db, "users", u.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setRole((userDoc.data() as UserProfile).role);
        } else {
          // Check if this email is pre-authorized
          const authRef = doc(db, "authorized_emails", u.email?.toLowerCase() || "");
          const authDoc = await getDoc(authRef);
          
          let initialRole: UserRole = "staff"; // Safer default
          
          if (authDoc.exists()) {
            initialRole = (authDoc.data() as any).role;
          } else if (u.email === "pepe.jlfc.16@gmail.com") {
             // Hardcoded admin for owner
             initialRole = "admin";
          }
          
          await setDoc(userRef, {
            email: u.email,
            role: initialRole,
            createdAt: new Date().toISOString()
          });
          setRole(initialRole);
        }
      } else {
        setRole(null);
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
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
