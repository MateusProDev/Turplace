import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../utils/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { useAuth } from "../../hooks/useAuth";

export default function ServiceForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", category: "", city: "", description: "", whatsapp: "" });
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const imageUrls = await Promise.all(images.map(uploadToCloudinary));
    await addDoc(collection(db, "services"), {
      ...form,
      images: imageUrls,
      ownerId: user.uid,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    setLoading(false);
    alert("Serviço cadastrado! Aguarde aprovação.");
    navigate('/provider');
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 flex flex-col gap-2">
      <input name="title" value={form.title} onChange={handleChange} placeholder="Nome do serviço" className="input input-bordered" required />
      <input name="category" value={form.category} onChange={handleChange} placeholder="Categoria" className="input input-bordered" required />
      <input name="city" value={form.city} onChange={handleChange} placeholder="Cidade" className="input input-bordered" required />
      <textarea name="description" value={form.description} onChange={handleChange} placeholder="Descrição" className="textarea textarea-bordered" required />
      <input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="WhatsApp" className="input input-bordered" required />
      <input type="file" multiple onChange={e => setImages(Array.from(e.target.files || []))} className="file-input file-input-bordered" />
      <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold text-center hover:bg-blue-700 transition" disabled={loading}>{loading ? "Enviando..." : "Cadastrar"}</button>
    </form>
  );
}
