import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { updateProfile } from "firebase/auth";
import { useAuth } from "../hooks/useAuth";
import Logout from "../components/Auth/Logout";
import { uploadToCloudinary } from "../utils/cloudinary";
import { Link, useNavigate } from "react-router-dom";
import ConfirmModal from "../components/Provider/ConfirmModal";
import logoSemFundo from "../assets/logosemfundo.png";
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
  Eye,
  User,
  CreditCard,
  BarChart3
} from "lucide-react";
import Pricing from "./Pricing";
import Wallet from "./Wallet";
import ServiceForm from "../components/Provider/ServiceForm";

export default function ProviderDashboard() {
  const { user, userData } = useAuth();
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
  const [currentTab, setCurrentTab] = useState<'services' | 'profile' | 'plans' | 'wallet'>('services');
  const [editingService, setEditingService] = useState<any>(null);
  const [editServiceModal, setEditServiceModal] = useState(false);

  // Load dashboard settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboardSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        applyDashboardSettings(settings);
      } catch (error) {
        console.error('Erro ao carregar configurações salvas:', error);
      }
    }
  }, []);

  const applyDashboardSettings = (settings: any) => {
    const root = document.documentElement;
    if (settings.primaryColor) root.style.setProperty('--dashboard-primary', settings.primaryColor);
    if (settings.secondaryColor) root.style.setProperty('--dashboard-secondary', settings.secondaryColor);
    if (settings.backgroundColor) root.style.setProperty('--dashboard-background', settings.backgroundColor);
    if (settings.fontFamily) {
      root.style.setProperty('--dashboard-font-family', settings.fontFamily);
      document.body.style.fontFamily = settings.fontFamily;
    }
    if (settings.fontSize) {
      const fontSizeMap = { small: '14px', medium: '16px', large: '18px' } as const;
      const key = settings.fontSize as keyof typeof fontSizeMap;
      const value = fontSizeMap[key] ?? fontSizeMap.medium;
      root.style.setProperty('--dashboard-font-size', value);
    }
  };

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
    
    console.log("Salvando nome:", name.trim());
    
    // Mostrar loading state
    setEditMode(true);
    
    try {
      // Atualizar documento do usuário
      await updateDoc(doc(db, "users", user.uid), { 
        name: name.trim(),
        bio: bio.trim(),
        updatedAt: new Date()
      });
      console.log("Documento do usuário atualizado");
      
      // Atualizar displayName no Firebase Auth
      await updateProfile(user, {
        displayName: name.trim()
      });
      console.log("displayName atualizado:", user.displayName);
      
      // Atualizar ownerName em todos os serviços do usuário (em lotes para performance)
      const q = query(collection(db, "services"), where("ownerId", "==", user.uid));
      const snapshot = await getDocs(q);
      console.log("Encontrados", snapshot.docs.length, "serviços para atualizar");
      
      if (snapshot.docs.length > 0) {
        // Processar em lotes de 10 para não sobrecarregar
        const batchSize = 10;
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
          const batch = snapshot.docs.slice(i, i + batchSize);
          const updatePromises = batch.map(doc => 
            updateDoc(doc.ref, { ownerName: name.trim() })
          );
          await Promise.all(updatePromises);
          console.log(`Lote ${Math.floor(i/batchSize) + 1} atualizado`);
        }
      }
      
      console.log("Todos os serviços atualizados");
      alert("Perfil salvo com sucesso! O nome será atualizado nos cards em alguns segundos.");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      alert("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setEditMode(false);
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 dashboard-custom">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 sm:py-6">
            {/* Top Row - Title and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-gray-600 text-sm sm:text-base">Gerencie seus serviços, perfil e planos</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {userData?.isAdmin && (
                  <Link
                    to="/admin"
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-sm sm:text-base"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/catalog"
                  className="px-3 sm:px-4 py-2 sm:py-2.5 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-sm sm:text-base"
                >
                  <Eye size={16} />
                  Ver Catálogo
                </Link>
                <Link 
                  to="/dashboard/service/new" 
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-sm sm:text-base"
                >
                  <Plus size={16} />
                  Novo Serviço
                </Link>
              </div>
            </div>

            {/* Bottom Row - Tabs */}
            <div className="flex flex-wrap gap-1 -mb-px overflow-x-auto">
              <button
                onClick={() => setCurrentTab('services')}
                className={`flex items-center gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-6 border-b-2 font-semibold text-xs sm:text-sm transition-all duration-200 rounded-t-lg whitespace-nowrap ${
                  currentTab === 'services' 
                    ? 'border-blue-600 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Briefcase size={18} />
                Serviços
              </button>
                <button
                  onClick={() => navigate('/profile/settings')}
                  className={`flex items-center gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-6 border-b-2 font-semibold text-xs sm:text-sm transition-all duration-200 rounded-t-lg whitespace-nowrap ${
                    window.location.pathname === '/profile/settings'
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User size={18} />
                  Perfil Completo
                </button>
              <button
                onClick={() => setCurrentTab('plans')}
                className={`flex items-center gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-6 border-b-2 font-semibold text-xs sm:text-sm transition-all duration-200 rounded-t-lg whitespace-nowrap ${
                  currentTab === 'plans' 
                    ? 'border-blue-600 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CreditCard size={18} />
                Planos
              </button>
              <button
                onClick={() => setCurrentTab('wallet')}
                className={`flex items-center gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-6 border-b-2 font-semibold text-xs sm:text-sm transition-all duration-200 rounded-t-lg whitespace-nowrap ${
                  currentTab === 'wallet' 
                    ? 'border-blue-600 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BarChart3 size={18} />
                Carteira
              </button>
            </div>
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
                    src={photo || logoSemFundo}
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

                    {/* Plano atual do usuário */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-800">Plano atual</div>
                        <div className="text-xs text-gray-600">{profile?.planActivatedAt ? new Date(profile.planActivatedAt).toLocaleDateString() : '—'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-700 font-medium">{profile?.planId || 'free'}</div>
                        <div className="px-2 py-0.5 bg-white border rounded text-xs text-gray-600">
                          Taxa: {(() => {
                            const planId = profile?.planId || 'free';
                            const feeMap: { [key: string]: number } = {
                              'free': 12,
                              'professional': 8,
                              'premium': 3.99
                            };
                            return `${feeMap[planId] || profile?.platformFeePercent || 12}%`;
                          })()}
                        </div>
                      </div>
                      {profile?.planFeatures && (
                        <div className="mt-3 text-xs text-gray-600">
                          {Array.isArray(profile.planFeatures) ? profile.planFeatures.slice(0,3).join(' • ') : String(profile.planFeatures)}
                        </div>
                      )}
                    </div>
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
                    to="/profile/settings" 
                    className="px-5 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map(service => {
                    const statusBadge = getStatusBadge(service.status);
                    return (
                      <div 
                        key={service.id} 
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
                        onClick={() => navigate(`/service/${encodeURIComponent(service.title)}`)}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition line-clamp-1">
                              {service.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                              <div className="flex items-center gap-1">
                                <Briefcase size={12} />
                                <span className="truncate">{service.category}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin size={12} />
                                <span className="truncate">{service.city}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge.color}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 text-sm line-clamp-2 mb-4">
                          {service.description}
                        </p>
                        
                        {service.images && service.images.length > 0 && (
                          <div className="flex gap-2 mb-4 overflow-x-auto">
                            {service.images.slice(0, 3).map((img: string, i: number) => (
                              <img 
                                key={i} 
                                src={img} 
                                alt={`Serviço ${i + 1}`}
                                className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                              />
                            ))}
                            {service.images.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-500 text-xs flex-shrink-0">
                                +{service.images.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-100 gap-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold transition flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingService(service);
                                setEditServiceModal(true);
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
                            className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold transition flex items-center gap-1 w-full sm:w-auto justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/service/${encodeURIComponent(service.title)}`);
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
                    src={photo || logoSemFundo}
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

        {currentTab === 'wallet' && (
          <div className="max-w-6xl mx-auto">
            <Wallet />
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

      {/* Modal de Edição de Serviço */}
      {editServiceModal && editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Editar Serviço</h2>
              <button
                onClick={() => {
                  setEditServiceModal(false);
                  setEditingService(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <ServiceForm
                editMode={true}
                serviceData={editingService}
                onClose={() => {
                  setEditServiceModal(false);
                  setEditingService(null);
                  // Recarregar serviços após edição
                  const q = query(collection(db, "services"), where("ownerId", "==", user?.uid));
                  getDocs(q).then(snapshot => {
                    const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setServices(servicesData);
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}