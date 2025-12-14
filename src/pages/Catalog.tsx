import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { collection, query, where, onSnapshot, serverTimestamp, addDoc } from "firebase/firestore";

export default function Catalog() {
  const [services, setServices] = useState<any[]>([]);
  useEffect(() => {
    const q = query(collection(db, "services"), where("status", "==", "approved"));
    const unsub = onSnapshot(q, snapshot => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const createLeadAndOpen = async (service: any) => {
    try {
      await addDoc(collection(db, "leads"), {
        serviceId: service.id,
        ownerId: service.ownerId,
        origem: "catalog",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Erro criando lead", err);
    }
    const wa = `https://wa.me/${service.whatsapp}?text=Olá,%20vi%20seu%20serviço%20no%20Turplace`;
    window.open(wa, "_blank");
  };
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Catálogo de Serviços</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map(service => (
          <div key={service.id} className="border p-4 rounded bg-white">
            <img src={service.images?.[0]} alt={service.title} className="h-40 w-full object-cover mb-2 rounded" />
            <h2 className="font-semibold">{service.title}</h2>
            <p className="text-sm text-gray-600">{service.category} - {service.city}</p>
            <button onClick={() => createLeadAndOpen(service)} className="w-full px-4 py-2 bg-green-600 text-white rounded font-semibold text-center hover:bg-green-700 transition mt-2">
              Entrar em contato
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
