import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

export default function AdminDashboard() {
  const [services, setServices] = useState<any[]>([]);
  useEffect(() => {
    async function fetchServices() {
      const querySnapshot = await getDocs(collection(db, "services"));
      setServices(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchServices();
  }, []);

  const handleApprove = async (id: string, status: string) => {
    await updateDoc(doc(db, "services", id), { status });
    setServices(s => s.map(sv => sv.id === id ? { ...sv, status } : sv));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin - Aprovação de Serviços</h1>
      <table className="table w-full">
        <thead>
          <tr>
            <th>Nome</th><th>Status</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {services.map(service => (
            <tr key={service.id}>
              <td>{service.title}</td>
              <td>{service.status}</td>
              <td>
                {service.status !== "approved" && (
                  <button className="btn btn-success btn-xs mr-2" onClick={() => handleApprove(service.id, "approved")}>Aprovar</button>
                )}
                {service.status !== "pending" && (
                  <button className="btn btn-warning btn-xs" onClick={() => handleApprove(service.id, "pending")}>Reprovar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
