import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../hooks/useAuth";
import Logout from "../components/Auth/Logout";
import { uploadToCloudinary } from "../utils/cloudinary";
import { Link, useNavigate } from "react-router-dom";
import ConfirmModal from "../components/Provider/ConfirmModal";
import { 
  Edit2, 
  Trash2, 
  Camera, 
  Mail, 
  Briefcase, 
  MapPin, 
  CheckCircle, 
  Clock,
  Plus,
  ExternalLink,
  Settings,
  Eye
} from "lucide-react";
import Pricing from "./Pricing";

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'services' | 'profile' | 'plans'>('services');

  // Carregar perfil do usuário
  useEffect(() => {
    if (!user) return;
    
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setName(data.name || "");
        setBio(data.bio || "");
        setPhoto(data.photoURL || null);
      }
    });
    return () => unsub();
  }, [user]);

  // Carregar serviços do usuário
  useEffect(() => {
    if (!user) return;
    
    const fetchServices = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "services"), 
          where("ownerId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const servicesData = snap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setServices(servicesData);
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
  }, [user]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB");
      return;
    }
    
    try {
      const url = await uploadToCloudinary(file);
      await updateDoc(doc(db, "users", user.uid), { 
        photoURL: url,
        updatedAt: new Date()
      });
      setPhoto(url);
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      alert("Erro ao atualizar foto. Tente novamente.");
    }
  };

  const handleNameSave = async () => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, "users", user.uid), { 
        name: name.trim(),
        bio: bio.trim(),
        updatedAt: new Date()
      });
      setEditMode(false);
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      alert("Erro ao salvar perfil. Tente novamente.");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteDoc(doc(db, "services", deleteId));
      setServices(services.filter((s: any) => s.id !== deleteId));
      setModalOpen(false);
      setDeleteId(null);
    } catch (err) {
      console.error("Erro ao excluir serviço:", err);
      alert("Erro ao excluir serviço.");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: any = {
      "approved": { text: "Publicado", color: "bg-green-100 text-green-800", icon: CheckCircle },
      "pending": { text: "Aguardando", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      "rejected": { text: "Rejeitado", color: "bg-red-100 text-red-800", icon: CheckCircle }
    };
    
    return statusMap[status] || statusMap.pending;
  };

  const calculateStats = () => {
    return {
      total: services.length,
      published: services.filter(s => s.status === "approved").length,
      pending: services.filter(s => s.status === "pending").length
    };
  };

  const stats = calculateStats();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acesso Restrito</h2>
          <p className="text-gray-600 mb-6">Por favor, faça login para acessar o dashboard.</p>
          <Link 
            to="/login" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Fazer Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="text-blue-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Gerencie seus serviços e perfil</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/catalog"
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition flex items-center gap-2"
              >
                <Eye size={18} />
                Ver Catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setCurrentTab('services')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                currentTab === 'services' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Serviços
            </button>
            <button
              onClick={() => setCurrentTab('profile')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                currentTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Perfil
            </button>
            <button
              onClick={() => setCurrentTab('plans')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                currentTab === 'plans' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Planos
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna da Esquerda - Perfil */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card Perfil */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img
                    src={photo || "/src/assets/logosemfundo.png"}
                    alt="Foto do perfil"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  className="absolute bottom-2 right-1/2 transform translate-x-16 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition"
                  onClick={() => fileInputRef.current?.click()}
                  title="Alterar foto"
                >
                  <Camera size={16} />
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio / Sobre você
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition min-h-[100px] resize-none"
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Conte um pouco sobre sua experiência..."
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 text-right mt-1">
                      {bio.length}/500 caracteres
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleNameSave}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Salvar
                    </button>
                    <button 
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{profile?.name || "Usuário"}</h2>
                    <div className="flex items-center justify-center gap-2 text-gray-600 mb-3">
                      <Mail size={14} />
                      <span>{profile?.email}</span>
                    </div>
                    <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {profile?.role === "provider" ? "Prestador" : profile?.role || "Usuário"}
                    </span>
                  </div>
                  
                  {bio && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700 text-sm">{bio}</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <button 
                      onClick={() => setEditMode(true)}
                      className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition flex items-center justify-center gap-2"
                    >
                      <Edit2 size={18} />
                      Editar Perfil
                    </button>
                    <Logout />
                  </div>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase size={20} />
                Estatísticas
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-gray-700">Total de Serviços</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-700">Publicados</span>
                  <span className="text-2xl font-bold text-green-600">{stats.published}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-gray-700">Pendentes</span>
                  <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna da Direita - Serviços */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Meus Serviços</h2>
                  <p className="text-gray-600">Gerencie todos os seus serviços cadastrados</p>
                </div>
                <div className="flex gap-3">
                  <Link 
                    to="/dashboard/service/new" 
                    className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition flex items-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Novo Serviço
                  </Link>
                  <Link 
                    to="/profile/settings" 
                    className="px-5 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <Settings size={18} />
                    Configurações
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="text-gray-400" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
                  <p className="text-gray-600 mb-6">Comece cadastrando seu primeiro serviço para aparecer no marketplace.</p>
                  <Link 
                    to="/dashboard/service/new" 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    <Plus size={20} />
                    Cadastrar Primeiro Serviço
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map(service => {
                    const statusBadge = getStatusBadge(service.status);
                    return (
                      <div 
                        key={service.id} 
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
                        onClick={() => navigate(`/service/${service.id}`)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition line-clamp-1">
                              {service.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <Briefcase size={12} />
                              <span>{service.category}</span>
                              <MapPin size={12} className="ml-2" />
                              <span>{service.city}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 text-sm line-clamp-2 mb-4">
                          {service.description}
                        </p>
                        
                        {service.images && service.images.length > 0 && (
                          <div className="flex gap-2 mb-4">
                            {service.images.slice(0, 3).map((img: string, i: number) => (
                              <img 
                                key={i} 
                                src={img} 
                                alt={`Serviço ${i + 1}`}
                                className="w-16 h-16 object-cover rounded-lg border"
                              />
                            ))}
                            {service.images.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-500 text-xs">
                                +{service.images.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold transition flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/service/${service.id}?edit=1`);
                              }}
                            >
                              <Edit2 size={12} />
                              Editar
                            </button>
                            <button
                              className="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 text-xs font-semibold transition flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(service.id);
                                setModalOpen(true);
                              }}
                            >
                              <Trash2 size={12} />
                              Excluir
                            </button>
                          </div>
                          <button
                            className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold transition flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/service/${service.id}`);
                            }}
                          >
                            <ExternalLink size={12} />
                            Ver
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {currentTab === 'profile' && (
          <div className="max-w-2xl mx-auto">
            {/* Card Perfil */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img
                    src={photo || "/src/assets/logosemfundo.png"}
                    alt="Foto do perfil"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  className="absolute bottom-2 right-1/2 transform translate-x-16 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition"
                  onClick={() => fileInputRef.current?.click()}
                  title="Alterar foto"
                >
                  <Camera size={16} />
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio / Sobre você
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition min-h-[100px] resize-none"
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Conte um pouco sobre sua experiência..."
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 text-right mt-1">
                      {bio.length}/500 caracteres
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleNameSave}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Salvar
                    </button>
                    <button 
                      onClick={() => setEditMode(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{name || "Nome não definido"}</h3>
                  <p className="text-gray-600 mb-4">{bio || "Adicione uma bio para contar sobre sua experiência."}</p>
                  <button 
                    onClick={() => setEditMode(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                  >
                    <Edit2 size={18} />
                    Editar Perfil
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'plans' && (
          <div className="max-w-6xl mx-auto">
            <Pricing />
          </div>
        )}
      </div>

      <ConfirmModal
        open={modalOpen}
        title="Excluir serviço"
        description="Tem certeza que deseja excluir este serviço? Esta ação não poderá ser desfeita."
        onCancel={() => { setModalOpen(false); setDeleteId(null); }}
        onConfirm={handleDelete}
      />
    </div>
  );
}