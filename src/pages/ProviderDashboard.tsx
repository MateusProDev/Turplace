import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../hooks/useAuth";
import Logout from "../components/Auth/Logout";
import { uploadToCloudinary } from "../utils/cloudinary";
import { Link } from "react-router-dom";

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setName(data.name || "");
        setPhoto(data.photoURL || null);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchServices = async () => {
      const q = query(collection(db, "services"), where("ownerId", "==", user.uid));
      const snap = await getDocs(q);
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchServices();
  }, [user]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const file = e.target.files[0];
    const url = await uploadToCloudinary(file);
    // Atualiza apenas o campo photoURL do usuário logado
    await updateDoc(doc(db, "users", user.uid), { photoURL: url });
    setPhoto(url);
    setEditMode(false);
  };

  const handleNameSave = async () => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { name });
    setEditMode(false);
  };

  if (!user) return <div className="p-4">Por favor, faça login.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Perfil */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center w-full md:w-1/3">
          <div className="relative mb-4">
            <img
              src={photo || "/src/assets/logosemfundo.png"}
              alt="Foto do perfil"
              className="w-28 h-28 rounded-full object-cover border-4 border-blue-200 shadow"
            />
            <button
              className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full p-2 shadow hover:bg-blue-700 transition"
              onClick={() => fileInputRef.current?.click()}
              title="Alterar foto"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M15.232 5.232a3 3 0 1 1 4.243 4.243L7.5 21H3v-4.5L15.232 5.232Z"/><path stroke="currentColor" strokeWidth="2" d="M16.5 7.5l-9 9"/></svg>
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          {editMode ? (
            <div className="flex flex-col gap-2 w-full">
              <input
                className="border rounded px-3 py-2 w-full"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <button onClick={handleNameSave} className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition">Salvar</button>
              <button onClick={() => setEditMode(false)} className="text-gray-500 mt-1">Cancelar</button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1">{profile?.name}</h2>
              <p className="text-gray-600 mb-1">{profile?.email}</p>
              <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs mb-2">{profile?.role || "prestador"}</span>
              <button onClick={() => setEditMode(true)} className="text-blue-600 hover:underline text-sm mb-2">Editar perfil</button>
            </>
          )}
          <Logout />
        </div>

        {/* Serviços */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Meus Serviços</h2>
            <Link to="/dashboard" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition">Novo Serviço</Link>
          </div>
          {services.length === 0 ? (
            <div className="text-gray-500">Nenhum serviço cadastrado ainda.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {services.map(service => (
                <div key={service.id} className="bg-white rounded-xl shadow p-4 flex flex-col gap-2">
                  <h3 className="font-bold text-lg">{service.title}</h3>
                  <p className="text-gray-600 text-sm">{service.category} - {service.city}</p>
                  <p className="text-gray-700 text-sm line-clamp-2">{service.description}</p>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {service.images && service.images.map((img: string, i: number) => (
                      <img key={i} src={img} alt="serviço" className="w-16 h-16 object-cover rounded" />
                    ))}
                  </div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${service.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {service.status === "pending" ? "Aguardando aprovação" : "Publicado"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
