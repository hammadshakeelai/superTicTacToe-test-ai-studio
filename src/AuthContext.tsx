import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserProfile {
  username: string;
  elo_rating: number;
  avg_accuracy: number;
  marker_theme: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Unblock the UI immediately once auth state is known

      if (currentUser) {
        // Fetch profile asynchronously without blocking
        const fetchProfile = async () => {
          try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              // Create default profile
              const newProfile: UserProfile = {
                username: currentUser.displayName || 'Player',
                elo_rating: 1200,
                avg_accuracy: 0,
                marker_theme: 'standard',
                created_at: new Date().toISOString(),
              };
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
            }
          } catch (error: any) {
            if (error?.message?.includes('client is offline')) {
              console.warn("⚠️ Firestore is offline or not yet created. Using a local fallback profile. To fix this, please create your Firestore database in the Firebase Console.");
            } else {
              console.error("Error fetching/creating user profile:", error);
            }
            // If Firestore is offline or fails, provide a fallback profile so the app still works
            setProfile({
              username: currentUser.displayName || 'Player',
              elo_rating: 1200,
              avg_accuracy: 0,
              marker_theme: 'standard',
              created_at: new Date().toISOString(),
            });
          }
        };
        fetchProfile();
      } else {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
