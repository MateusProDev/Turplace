import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../utils/firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { getPlanLimits } from "../utils/planUtils";

interface UserData {
  id?: string;
  name?: string;
  email?: string;
  planId?: string;
  planActivatedAt?: string;
  planExpiresAt?: string;
  planFeatures?: {
    maxServices: number;
    maxLeadPages: number;
    hasCustomDomain: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
    commissionRate: number;
  };
  isAdmin?: boolean;
  chavePix?: string;
  stripeAccountId?: string;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
  photoURL?: string;
  role?: string;
  // outros campos
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const unsubData = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserData(snap.data() as UserData);
          } else {
            setUserData(null);
          }
        });

        // Verificar se o documento do usuário existe, se não, criar com plano free
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          try {
            const planLimits = getPlanLimits('free');
            await setDoc(userRef, {
              id: u.uid,
              email: u.email,
              name: u.displayName || u.email?.split('@')[0] || 'Usuário',
              planId: 'free',
              planActivatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              photoURL: u.photoURL || null,
              role: 'user',
              // Limitações do plano free
              planFeatures: planLimits.features
            });
            console.log('User document created with free plan:', u.uid);
          } catch (error) {
            console.error('Error creating user document:', error);
          }
        }

        return () => unsubData();
      } else {
        setUserData(null);
      }
    });
    return () => unsub();
  }, []);

  return { user, userData };
}
