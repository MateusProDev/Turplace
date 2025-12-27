import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../utils/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";

interface UserData {
  name?: string;
  email?: string;
  plan?: string;
  isAdmin?: boolean;
  chavePix?: string;
  stripeAccountId?: string;
  slug?: string;
  // outros campos
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
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
        return () => unsubData();
      } else {
        setUserData(null);
      }
    });
    return () => unsub();
  }, []);

  return { user, userData };
}
