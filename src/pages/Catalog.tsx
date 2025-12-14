import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Catalog() {
  const [services, setServices] = useState<any[]>([]);
  useEffect(() => {
    async function fetchServices() {
      const q = query(collection(db, "services"), where("status", "==", "approved"));
      const querySnapshot = await getDocs(q);
      setServices(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchServices();
  }, []);
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Catálogo de Serviços</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map(service => (
          <div key={service.id} className="border p-4 rounded bg-white">
            <img src={service.images?.[0]} alt={service.title} className="h-40 w-full object-cover mb-2 rounded" />
            <h2 className="font-semibold">{service.title}</h2>
            <p className="text-sm text-gray-600">{service.category} - {service.city}</p>
            <a
              href={`https://wa.me/${service.whatsapp}?text=Olá, vi seu serviço no marketplace!`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-2 bg-green-600 text-white rounded font-semibold text-center hover:bg-green-700 transition mt-2 block"
            >
              Entrar em contato
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
