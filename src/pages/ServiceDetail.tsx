import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../utils/firebase";

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const ref = doc(db, "services", id);
      const snap = await getDoc(ref);
      if (snap.exists()) setService({ id: snap.id, ...snap.data() });
    })();
  }, [id]);

  const handleContact = async () => {
    if (!service) return;
    await addDoc(collection(db, "leads"), {
      serviceId: service.id,
      ownerId: service.ownerId,
      origem: "service_detail",
      createdAt: serverTimestamp(),
    });
    const wa = `https://wa.me/${service.whatsapp}?text=Olá%2C%20vi%20seu%20serviço%20no%20Turplace`;
    window.open(wa, "_blank");
  };

  if (!service) return <div className="p-4">Carregando serviço...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{service.title}</h1>
      <p className="text-sm text-gray-600 mb-4">{service.category} — {service.city}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {service.images?.map((url: string, i: number) => (
            <img key={i} src={url} alt={service.title} className="w-full mb-2 rounded" />
          ))}
        </div>
        <div>
          <p className="mb-4">{service.description}</p>
          <button onClick={handleContact} className="px-4 py-2 bg-green-600 text-white rounded">Falar no WhatsApp</button>
        </div>
      </div>
    </div>
  );
}
