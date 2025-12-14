import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../hooks/useAuth";

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, snap => {
      setProfile(snap.exists() ? snap.data() : null);
    });
    return () => unsub();
  }, [user]);

  if (!user) return <div className="p-4">Por favor, faça login.</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Painel do Prestador</h1>
      {profile ? (
        <div className="max-w-md bg-white p-4 rounded shadow">
          <p><strong>Nome:</strong> {profile.name}</p>
          <p><strong>E-mail:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
        </div>
      ) : (
        <div>Carregando perfil...</div>
      )}
    </div>
  );
}
