import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  CheckCircle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  User,
  CreditCard,
  FileText,
  Eye,
  Camera,
  MapPin
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import ConfirmModal from '../components/Provider/ConfirmModal';
import ServiceForm from '../components/Provider/ServiceForm';
import Pricing from './Pricing';
import Wallet from './Wallet';
import { generateSlug } from '../utils/slug';
import { uploadToCloudinary } from '../utils/cloudinary';
import Logout from '../components/Auth/Logout';
import LeadPageEditor from './LeadPageEditor';
import ShareContentService from '../services/shareContentService';

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [services, setServices] = useState<Record<string, unknown>[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'services' | 'profile' | 'plans' | 'wallet' | 'leadpage' | 'leadpage-editor'>('services');
  const [editingService, setEditingService] = useState<Record<string, unknown> | null>(null);
  const [editServiceModal, setEditServiceModal] = useState(false);
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [linkAnalytics, setLinkAnalytics] = useState<any | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const shareContentService = new ShareContentService();

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

  const applyDashboardSettings = (settings: Record<string, unknown>) => {
    const root = document.documentElement;
    if (settings.primaryColor) root.style.setProperty('--dashboard-primary', settings.primaryColor as string);
    if (settings.secondaryColor) root.style.setProperty('--dashboard-secondary', settings.secondaryColor as string);
    if (settings.backgroundColor) root.style.setProperty('--dashboard-background', settings.backgroundColor as string);
    if (settings.fontFamily) {
      root.style.setProperty('--dashboard-font-family', settings.fontFamily as string);
      document.body.style.fontFamily = settings.fontFamily as string;
    }
    if (settings.fontSize) {
      root.style.setProperty('--dashboard-font-size', settings.fontSize as string);
    }
  };

  // Load user profile and services
  useEffect(() => {
    if (!user) return;

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProfile(data);
        setName(data.name as string || "");
        setBio(data.bio as string || "");
        setPhoto(data.photoURL as string || null);
      }
      setLoading(false);
    });

    const fetchServices = async () => {
      try {
        const q = query(collection(db, "services"), where("ownerId", "==", user.uid));
        const snapshot = await getDocs(q);
        const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(servicesData);
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
      }
    };

    fetchServices();

    return () => unsubProfile();
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

    setEditMode(true);

    try {
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
      setServices(services.filter((s: Record<string, unknown>) => s.id !== deleteId));
      setModalOpen(false);
      setDeleteId(null);
    } catch (err) {
      console.error("Erro ao excluir serviço:", err);
      alert("Erro ao excluir serviço.");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; icon: typeof CheckCircle }> = {
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

  const handleGenerateShortLink = async () => {
    if (!user) return;

    setGeneratingLink(true);
    try {
      const leadPageUrl = `${window.location.origin}/lead/${user.uid}`;
      const shortLinkData = await shareContentService.createShortLink(
        leadPageUrl,
        `Lead Page de ${profile?.name || user.displayName || 'Usuário'}`,
        `lead-${user.uid}`
      );
      setShortLink(shortLinkData.short_url ?? null);
    } catch (err) {
      console.error("Erro ao gerar link encurtado:", err);
      alert("Erro ao gerar link encurtado. Tente novamente.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleLoadAnalytics = async () => {
    if (!shortLink) return;

    setLoadingAnalytics(true);
    try {
      // Extrair o código do link encurtado
      const urlParts = shortLink.split('/');
      const shortCode = urlParts[urlParts.length - 1];

      const analytics = await shareContentService.getLinkAnalytics(shortCode);
      setLinkAnalytics(analytics);
    } catch (err) {
      console.error("Erro ao carregar analytics:", err);
      alert("Erro ao carregar analytics. Tente novamente.");
    } finally {
      setLoadingAnalytics(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'services', label: 'Serviços', icon: Briefcase },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'plans', label: 'Planos', icon: CreditCard },
    { id: 'wallet', label: 'Carteira', icon: BarChart3 },
    { id: 'leadpage', label: 'Lead Page', icon: FileText }
  ];

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
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard do Prestador</h1>
                  <p className="text-gray-600">Gerencie seus serviços e leads</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Logout />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <Briefcase className="text-blue-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Total de Serviços</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Publicados</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <Clock className="text-yellow-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Aguardando</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap border-b border-gray-200 mb-8 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 sm:px-6 border-b-2 font-semibold text-xs sm:text-sm transition-all duration-200 rounded-t-lg whitespace-nowrap ${
                  currentTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Services Tab */}
        {currentTab === 'services' && (
          <div className="space-y-8">
            {/* Services Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Meus Serviços</h2>
              <button
                onClick={() => setEditServiceModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={16} />
                Novo Serviço
              </button>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service: Record<string, unknown>) => {
                const statusBadge = getStatusBadge(service.status as string);
                const Icon = statusBadge.icon;
                return (
                  <div key={service.id as string} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="aspect-video bg-gray-200 relative">
                      {service.images && (service.images as string[]).length > 0 ? (
                        <img
                          src={(service.images as string[])[0]}
                          alt={service.title as string}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Briefcase size={48} />
                        </div>
                      )}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                        <Icon size={12} className="inline mr-1" />
                        {statusBadge.text}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{service.title as string}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description as string}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin size={14} />
                          {service.city as string}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/service/${generateSlug(service.title as string)}`)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition"
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingService(service);
                              setEditServiceModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteId(service.id as string);
                              setModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {services.length === 0 && (
              <div className="text-center py-12">
                <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço encontrado</h3>
                <p className="text-gray-600 mb-6">Comece criando seu primeiro serviço para atrair clientes.</p>
                <button
                  onClick={() => setEditServiceModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Criar Primeiro Serviço
                </button>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {currentTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Editar Perfil</h2>

              {/* Profile Picture */}
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {photo ? (
                      <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-gray-400" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{String(profile?.name) || user.displayName || "Usuário"}</h3>
                  <p className="text-sm text-gray-600">{String(profile?.email) || user.email}</p>
                </div>
              </div>

              {/* Profile Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Conte um pouco sobre você e seus serviços"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setName(profile?.name as string || "");
                      setBio(profile?.bio as string || "");
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleNameSave}
                    disabled={editMode}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {editMode ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans Tab */}
        {currentTab === 'plans' && (
          <div className="space-y-8">
            <Pricing />
          </div>
        )}

        {/* Wallet Tab */}
        {currentTab === 'wallet' && (
          <div className="space-y-8">
            <Wallet />
          </div>
        )}

        {/* Lead Page Tab */}
        {currentTab === 'leadpage' && (
          <div className="space-y-8">
            {/* Lead Page Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Sua Lead Page</h2>
              </div>

              <p className="text-gray-600 mb-6">
                Sua página de leads é onde potenciais clientes podem conhecer seus serviços e entrar em contato.
              </p>

              <div className="flex items-center gap-4 mb-6">
                <a
                  href={`/lead/${user.uid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Eye size={16} />
                  Ver Lead Page
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => setCurrentTab('leadpage-editor')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  <Edit2 size={16} />
                  Editar Lead Page
                </button>
              </div>

              {/* Short Link Generation */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Link Encurtado com Analytics</h3>

                {!shortLink ? (
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Gere um link encurtado para compartilhar sua lead page e acompanhar visualizações e cliques.
                    </p>
                    <button
                      onClick={handleGenerateShortLink}
                      disabled={generatingLink}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {generatingLink ? 'Gerando...' : 'Gerar Link Encurtado'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">Link:</span>
                      <code className="text-blue-600">{shortLink}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(shortLink)}
                        className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                      >
                        Copiar
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleLoadAnalytics}
                        disabled={loadingAnalytics}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <BarChart3 size={16} />
                        {loadingAnalytics ? 'Carregando...' : 'Ver Analytics'}
                      </button>
                    </div>

                    {/* Analytics Display */}
                    {linkAnalytics && (
                      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <h4 className="font-medium text-purple-900 mb-3">Analytics do Link</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{linkAnalytics.totalViews || 0}</div>
                            <div className="text-sm text-purple-700">Visualizações Totais</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{linkAnalytics.uniqueViews || 0}</div>
                            <div className="text-sm text-purple-700">Visualizações Únicas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{linkAnalytics.viewsByDay ? Object.keys(linkAnalytics.viewsByDay).length : 0}</div>
                            <div className="text-sm text-purple-700">Dias Ativos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{linkAnalytics.topCountries ? linkAnalytics.topCountries.length : 0}</div>
                            <div className="text-sm text-purple-700">Países</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lead Page Editor Tab */}
        {currentTab === 'leadpage-editor' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Editor da Lead Page</h2>
              <button
                onClick={() => setCurrentTab('leadpage')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                ← Voltar
              </button>
            </div>
            <LeadPageEditor />
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        open={modalOpen}
        title="Excluir Serviço"
        description="Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita."
        onCancel={() => {
          setModalOpen(false);
          setDeleteId(null);
        }}
        onConfirm={handleDelete}
      />

      {editServiceModal && (
        <ServiceForm
          editMode={!!editingService}
          serviceData={editingService as any}
          onClose={() => {
            setEditServiceModal(false);
            setEditingService(null);
            // Refresh services
            if (user) {
              const q = query(collection(db, "services"), where("ownerId", "==", user.uid));
              getDocs(q).then(snapshot => {
                const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setServices(servicesData);
              });
            }
          }}
        />
      )}
    </div>
  );
}