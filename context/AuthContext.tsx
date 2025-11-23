import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { db, auth } from '../firebase';
import firebase from 'firebase/compat/app';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User | null>;
  signup: (name: string, email: string, pass: string) => Promise<User | null>;
  enrollInCourse: (courseId: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// List of designated admin emails.
const ADMIN_EMAILS = ['yk8292238@gmail.com', 'admin@gmail.com'];

// Normalize email for comparison, especially for Gmail addresses which ignore dots.
const normalizeEmail = (email: string) => {
  if (!email) return '';
  const emailStr = email.toLowerCase().trim();
  const parts = emailStr.split('@');
  if (parts.length === 2 && parts[1] === 'gmail.com') {
    return `${parts[0].replace(/\./g, '')}@gmail.com`;
  }
  return emailStr;
};

const normalizedAdminEmails = ADMIN_EMAILS.map(normalizeEmail);


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
            try {
                const userRef = db.ref(`users/${firebaseUser.uid}`);
                const userSnap = await userRef.get();
                
                if (userSnap.exists()) {
                    const dbUser = userSnap.val();
                    const enrollmentsSnapshot = await db.ref(`enrollments/${firebaseUser.uid}`).get();
                    const enrolledCourses = enrollmentsSnapshot.exists() ? Object.keys(enrollmentsSnapshot.val()) : [];
                    
                    const fullUser: User = {
                        id: firebaseUser.uid,
                        email: firebaseUser.email!,
                        ...dbUser,
                        enrolledCourses
                    };
                    setUser(fullUser);
                } else {
                    // This case can happen if a user is in Firebase Auth but not in the DB.
                    // For this app, we'll treat them as logged out until they are in the DB.
                    await auth.signOut();
                    setUser(null);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<User | null> => {
    const userCredential = await auth.signInWithEmailAndPassword(email, pass);
    const firebaseUser = userCredential.user;

    if (firebaseUser) {
        const userRef = db.ref(`users/${firebaseUser.uid}`);
        const userSnap = await userRef.get();

        if (userSnap.exists()) {
            const dbUser = userSnap.val();
            const enrollmentsSnapshot = await db.ref(`enrollments/${firebaseUser.uid}`).get();
            const enrolledCourses = enrollmentsSnapshot.exists() ? Object.keys(enrollmentsSnapshot.val()) : [];

            const fullUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                ...dbUser,
                enrolledCourses
            };
            setUser(fullUser);
            return fullUser;
        }
    }
    return null;
  };
  
  const signup = async (name: string, email: string, pass: string): Promise<User | null> => {
    const normalizedEmail = normalizeEmail(email);
    const isAdmin = normalizedAdminEmails.includes(normalizedEmail);

    const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
    const firebaseUser = userCredential.user;
    
    if (firebaseUser) {
        const newUser: Omit<User, 'id' | 'enrolledCourses' | 'email'> = {
            name,
            role: isAdmin ? 'admin' : 'student',
            lastActive: new Date().toISOString(),
            watchedHours: 0,
        };

        await db.ref(`users/${firebaseUser.uid}`).set(newUser);
        
        const fullUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            ...newUser,
            enrolledCourses: []
        };
        setUser(fullUser);
        return fullUser;
    }
    return null;
  };

  const loginWithGoogle = async (): Promise<User | null> => {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const firebaseUser = result.user;
    
    if (firebaseUser) {
        const userRef = db.ref(`users/${firebaseUser.uid}`);
        const userSnap = await userRef.get();

        if (userSnap.exists()) {
          // Existing user
          const dbUser = userSnap.val();
          const enrollmentsSnapshot = await db.ref(`enrollments/${firebaseUser.uid}`).get();
          const enrolledCourses = enrollmentsSnapshot.exists() ? Object.keys(enrollmentsSnapshot.val()) : [];

          const fullUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            ...dbUser,
            enrolledCourses
          };
          setUser(fullUser);
          return fullUser;
        } else {
          // New user via Google
          const normalizedEmail = normalizeEmail(firebaseUser.email || '');
          const isAdmin = normalizedAdminEmails.includes(normalizedEmail);

          const newUser: Omit<User, 'id' | 'enrolledCourses' | 'email'> = {
            name: firebaseUser.displayName || 'New User',
            role: isAdmin ? 'admin' : 'student',
            lastActive: new Date().toISOString(),
            watchedHours: 0,
          };

          await db.ref(`users/${firebaseUser.uid}`).set(newUser);

          const fullUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            ...newUser,
            enrolledCourses: []
          };
          setUser(fullUser);
          return fullUser;
        }
    }
    return null;
  };

  const enrollInCourse = async (courseId: string): Promise<void> => {
    if (!user) {
        throw new Error("User must be logged in to enroll in a course.");
    }
    try {
        const enrollmentRef = db.ref(`enrollments/${user.id}/${courseId}`);
        await enrollmentRef.set(true);
        
        const updatedUser = {
            ...user,
            enrolledCourses: [...user.enrolledCourses, courseId]
        };
        setUser(updatedUser);
    } catch (error) {
        console.error("Failed to enroll in course:", error);
        throw error;
    }
  };
  
  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  const value = { user, loading, login, signup, enrollInCourse, logout, loginWithGoogle };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};