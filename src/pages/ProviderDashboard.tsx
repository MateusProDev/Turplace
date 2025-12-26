import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  MapPin,
  Sparkles,
  Settings,
  Share2,
  TrendingUp,
  Link as LinkIcon
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

// Definindo tipos
interface Service {
  id: string;
  title: string;
  slug?: string;
  type: string;
  category: string;
  city: string;
  description: string;
  whatsapp: string;
  images: string[];
  status: string;
  createdAt: any;
  price?: string;
  productType?: string;
  billingType?: string;
  priceMonthly?: string;
  views?: number;
  leads?: number;
  featured?: boolean;
  [key: string]: unknown;
}

interface Tab {
  id: 'services' | 'profile' | 'plans' | 'wallet' | 'leadpage' | 'leadpage-editor';
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Estados principais
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'services' | 'profile' | 'plans' | 'wallet' | 'leadpage' | 'leadpage-editor'>('services');
  
  // Estados do perfil
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados de modais e ações
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const [editServiceModal, setEditServiceModal] = useState(false);
  
  // Estados do link encurtado
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [linkAnalytics, setLinkAnalytics] = useState<any | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Estados de UI

  const shareContentService = new ShareContentService();

  // Configurações de tabs modernas
  const tabs: Tab[] = useMemo(() => [
    { 
      id: 'services', 
      label: 'Serviços', 
      icon: Briefcase, 
      color: 'text-blue-600', 
      gradient: 'from-blue-500 to-blue-600' 
    },
    { 
      id: 'profile', 
      label: 'Perfil', 
      icon: User, 
      color: 'text-purple-600', 
      gradient: 'from-purple-500 to-purple-600' 
    },
    { 
      id: 'plans', 
      label: 'Planos', 
      icon: CreditCard, 
      color: 'text-emerald-600', 
      gradient: 'from-emerald-500 to-emerald-600' 
    },
    { 
      id: 'wallet', 
      label: 'Carteira', 
      icon: BarChart3, 
      color: 'text-amber-600', 
      gradient: 'from-amber-500 to-amber-600' 
    },
    { 
      id: 'leadpage', 
      label: 'Lead Page', 
      icon: FileText, 
      color: 'text-rose-600', 
      gradient: 'from-rose-500 to-rose-600' 
    }
  ], []);

  // Carregar configurações do dashboard
  useEffect(() => {
    const saved = localStorage.getItem('dashboardSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        applyDashboardSettings(settings);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }

    const savedShortLink = localStorage.getItem('providerShortLink');
    if (savedShortLink) {
      setShortLink(savedShortLink);
    }
  }, []);

  const applyDashboardSettings = useCallback((settings: Record<string, unknown>) => {
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
  }, []);

  // Carregar dados do usuário e serviços
  useEffect(() => {
    if (!user) return;

    const loadExistingShortLink = async () => {
      try {
        const expectedShortCode = `lead-${user.uid}`;
        const analytics = await shareContentService.getLinkAnalytics(expectedShortCode);
        if (analytics && analytics.short_code === expectedShortCode) {
          const shortUrl = `https://sharecontent.io/x/${expectedShortCode}`;
          setShortLink(shortUrl);
          localStorage.setItem('providerShortLink', shortUrl);
          
          await updateDoc(doc(db, "users", user.uid), {
            shortLink: shortUrl,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.log('Sem link encurtado existente');
      }
    };

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setName(data.name as string || "");
        setBio(data.bio as string || "");
        setPhone(data.phone as string || "");
        setCity(data.city as string || "");
        setSpecialties(data.specialties as string[] || []);
        setExperience(data.experience as string || "");
        setPhoto(data.photoURL as string || null);
        
        const firestoreShortLink = data.shortLink as string;
        if (firestoreShortLink) {
          setShortLink(firestoreShortLink);
          localStorage.setItem('providerShortLink', firestoreShortLink);
        } else {
          loadExistingShortLink();
        }
      }
      setLoading(false);
    });

    const fetchServices = async () => {
      try {
        const q = query(collection(db, "services"), where("ownerId", "==", user.uid));
        const snapshot = await getDocs(q);
        const servicesData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Service));
        setServices(servicesData);
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
      }
    };

    fetchServices();
    return () => unsubProfile();
  }, [user, shareContentService]);

  // Manipuladores de perfil
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
      alert("Erro ao atualizar foto.");
    }
  };

  const handleProfileSave = async () => {
    if (!user) return;

    setEditMode(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        city: city.trim(),
        specialties: specialties,
        experience: experience.trim(),
        updatedAt: new Date()
      });

      await updateProfile(user, {
        displayName: name.trim()
      });

      // Atualizar nome em todos os serviços
      const q = query(collection(db, "services"), where("ownerId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
          const batch = snapshot.docs.slice(i, i + batchSize);
          const updatePromises = batch.map(docRef =>
            updateDoc(docRef.ref, { ownerName: name.trim() })
          );
          await Promise.all(updatePromises);
        }
      }

      alert("Perfil salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      alert("Erro ao salvar perfil.");
    } finally {
      setEditMode(false);
    }
  };

  // Manipuladores de serviços
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteDoc(doc(db, "services", deleteId));
      setServices(prev => prev.filter(s => s.id !== deleteId));
      setModalOpen(false);
      setDeleteId(null);
    } catch (err) {
      console.error("Erro ao excluir serviço:", err);
      alert("Erro ao excluir serviço.");
    }
  };

  const getStatusBadge = useCallback((status: string) => {
    const statusMap = {
      "approved": { text: "Publicado", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
      "pending": { text: "Aguardando", color: "bg-amber-100 text-amber-800", icon: Clock },
      "rejected": { text: "Rejeitado", color: "bg-rose-100 text-rose-800", icon: CheckCircle }
    };

    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  }, []);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = services.length;
    const published = services.filter(s => s.status === "approved").length;
    const pending = services.filter(s => s.status === "pending").length;
    const views = services.reduce((sum, s) => sum + (s.views as number || 0), 0);
    
    return { total, published, pending, views };
  }, [services]);

  // Manipuladores de link encurtado
  const handleGenerateShortLink = async () => {
    if (!user) return;

    if (shortLink) {
      handleLoadAnalytics();
      return;
    }

    setGeneratingLink(true);
    try {
      const leadPageUrl = `${window.location.origin}/lead/${user.uid}`;
      const shortLinkData = await shareContentService.createShortLink(
        leadPageUrl,
        `Lead Page de ${profile?.name || user.displayName || 'Usuário'}`,
        `lead-${user.uid}`
      );
      
      const newShortLink = shortLinkData.short_url ?? null;
      setShortLink(newShortLink);
      
      if (newShortLink) {
        localStorage.setItem('providerShortLink', newShortLink);
        await updateDoc(doc(db, "users", user.uid), {
          shortLink: newShortLink,
          updatedAt: new Date()
        });
      }
    } catch (err) {
      console.error("Erro ao gerar link:", err);
      alert("Erro ao gerar link encurtado.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleLoadAnalytics = async () => {
    if (!shortLink) return;

    setLoadingAnalytics(true);
    try {
      const urlParts = shortLink.split('/');
      const shortCode = urlParts[urlParts.length - 1];
      console.log('Loading analytics for shortCode:', shortCode);
      
      const analytics = await shareContentService.getLinkAnalytics(shortCode);
      console.log('Analytics loaded:', analytics);
      setLinkAnalytics(analytics);
    } catch (err) {
      console.error("Erro ao carregar analytics:", err);
      alert(`Erro ao carregar analytics: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      // Reset analytics on error
      setLinkAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Componentes de loading
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 max-w-md mx-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl">
            <Briefcase className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Acesso Restrito</h2>
          <p className="text-gray-600 mb-8">Faça login para acessar seu dashboard profissional.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <User size={18} />
            Fazer Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Moderno */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Título */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="text-white" size={20} />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Dashboard Pro</h1>
                <p className="text-xs text-gray-500">Painel do Prestador</p>
              </div>
            </div>

            {/* Ações do Header */}
            <div className="flex items-center gap-3">
              {/* Configurações */}
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <Settings size={20} />
              </button>

              {/* Perfil */}
              <div className="relative group">
                <div className="flex items-center gap-2 p-2 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    {photo ? (
                      <img src={photo} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="text-white" size={16} />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden md:inline">
                    {String(profile?.name) || "Usuário"}
                  </span>
                </div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-4 border-b border-gray-100">
                    <p className="font-medium text-gray-900">{String(profile?.name)}</p>
                    <p className="text-xs text-gray-500 mt-1">{String(profile?.email)}</p>
                  </div>
                  <div className="p-2">
                    <Logout />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total de Serviços */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                <Briefcase className="text-white" size={20} />
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                +12%
              </span>
            </div>
            <p className="text-sm text-gray-600">Total de Serviços</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">Ativos: {stats.published}</p>
            </div>
          </div>

          {/* Visualizações */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md">
                <Eye className="text-white" size={20} />
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                +24%
              </span>
            </div>
            <p className="text-sm text-gray-600">Visualizações</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.views.toLocaleString()}</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <TrendingUp size={12} />
                Crescimento semanal
              </div>
            </div>
          </div>

          {/* Pendentes */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-md">
                <Clock className="text-white" size={20} />
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                Aguardando
              </span>
            </div>
            <p className="text-sm text-gray-600">Em Análise</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pending}</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">Aprovação pendente</p>
            </div>
          </div>

          {/* Performance */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md">
                <BarChart3 className="text-white" size={20} />
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                94%
              </span>
            </div>
            <p className="text-sm text-gray-600">Performance</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">94%</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-1 rounded-full w-3/4"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Navegação por Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`group relative flex items-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    isActive 
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : tab.color} />
                  {tab.label}
                  
                  {/* Indicador ativo para a aba atual */}
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-r ${tab.gradient}"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo das Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Services Tab */}
          {currentTab === 'services' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Meus Serviços</h2>
                  <p className="text-gray-600 mt-1">Gerencie e monitore todos os seus serviços</p>
                </div>
                <button
                  onClick={() => setEditServiceModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Plus size={18} />
                  Novo Serviço
                </button>
              </div>

              {/* Services Grid */}
              {services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => {
                    const statusBadge = getStatusBadge(service.status);
                    const Icon = statusBadge.icon;
                    
                    return (
                      <div 
                        key={service.id} 
                        className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                      >
                        {/* Imagem do Serviço */}
                        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                          {service.images?.[0] ? (
                            <img
                              src={service.images[0]}
                              alt={service.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Briefcase className="text-gray-400" size={48} />
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge.color} backdrop-blur-sm`}>
                            <Icon size={12} className="inline mr-1.5" />
                            {statusBadge.text}
                          </div>
                          
                          {/* Overlay Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>

                        {/* Conteúdo do Card */}
                        <div className="p-5">
                          <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{service.title}</h3>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>
                          
                          <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                              <MapPin size={14} />
                              {service.city}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/service/${generateSlug(service.title)}`)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver detalhes"
                              >
                                <ExternalLink size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingService(service);
                                  setEditServiceModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteId(service.id);
                                  setModalOpen(true);
                                }}
                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Excluir"
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
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Briefcase className="text-gray-400" size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Nenhum serviço encontrado</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Comece criando seu primeiro serviço para atrair clientes e expandir seu negócio.
                  </p>
                  <button
                    onClick={() => setEditServiceModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Plus size={18} />
                    Criar Primeiro Serviço
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {currentTab === 'profile' && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Coluna da Foto */}
                  <div className="md:w-1/3">
                    <div className="sticky top-8">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
                        <div className="relative mb-6">
                          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-600 p-1">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                              {photo ? (
                                <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                <User className="text-blue-600" size={48} />
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-2 right-2 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
                          >
                            <Camera className="text-blue-600" size={18} />
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                        </div>
                        
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-gray-900">{String(profile?.name) || "Usuário"}</h3>
                          <p className="text-gray-600 text-sm mt-1">{String(profile?.email)}</p>
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 rounded-full text-sm font-medium">
                            <CheckCircle size={14} />
                            Perfil Verificado
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna do Formulário */}
                  <div className="md:w-2/3">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Editar Perfil</h2>
                      <p className="text-gray-600 mb-8">Atualize suas informações pessoais e profissionais</p>

                      <div className="space-y-6">
                        {/* Campo Nome */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Nome Completo
                            <span className="text-rose-500 ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Digite seu nome completo"
                          />
                        </div>

                        {/* Campo Biografia */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Biografia
                            <span className="text-gray-400 ml-1">(opcional)</span>
                          </label>
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            placeholder="Conte um pouco sobre você, suas experiências e especialidades..."
                          />
                          <p className="text-xs text-gray-500">
                            Esta descrição aparecerá em seu perfil público
                          </p>
                        </div>

                        {/* Campo Telefone */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Telefone
                            <span className="text-gray-400 ml-1">(opcional)</span>
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="(11) 99999-9999"
                          />
                        </div>

                        {/* Campo Cidade */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Cidade
                            <span className="text-gray-400 ml-1">(opcional)</span>
                          </label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="São Paulo, SP"
                          />
                        </div>

                        {/* Campo Especialidades */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Especialidades
                            <span className="text-gray-400 ml-1">(opcional)</span>
                          </label>
                          <input
                            type="text"
                            value={specialties.join(', ')}
                            onChange={(e) => setSpecialties(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Fotografia, Vídeo, Eventos"
                          />
                          <p className="text-xs text-gray-500">
                            Separe as especialidades por vírgula
                          </p>
                        </div>

                        {/* Campo Experiência */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Experiência
                            <span className="text-gray-400 ml-1">(opcional)</span>
                          </label>
                          <select
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          >
                            <option value="">Selecione sua experiência</option>
                            <option value="iniciante">Iniciante (0-2 anos)</option>
                            <option value="intermediario">Intermediário (2-5 anos)</option>
                            <option value="experiente">Experiente (5-10 anos)</option>
                            <option value="expert">Expert (10+ anos)</option>
                          </select>
                        </div>

                        {/* Ações */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setName(profile?.name as string || "");
                              setBio(profile?.bio as string || "");
                              setPhone(profile?.phone as string || "");
                              setCity(profile?.city as string || "");
                              setSpecialties(profile?.specialties as string[] || []);
                              setExperience(profile?.experience as string || "");
                            }}
                            className="px-5 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleProfileSave}
                            disabled={editMode}
                            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                          >
                            {editMode ? (
                              <>
                                <span className="inline-block animate-spin mr-2">⟳</span>
                                Salvando...
                              </>
                            ) : 'Salvar Alterações'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Plans Tab */}
          {currentTab === 'plans' && (
            <div className="p-6">
              <Pricing />
            </div>
          )}

          {/* Wallet Tab */}
          {currentTab === 'wallet' && (
            <div className="p-6">
              <Wallet />
            </div>
          )}

          {/* Lead Page Tab */}
          {currentTab === 'leadpage' && (
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                {/* Header da Lead Page */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600">
                      <FileText className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Sua Lead Page</h2>
                      <p className="text-gray-600">Gerencie e compartilhe sua página de captura de leads</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Preview e Ações */}
                  <div className="lg:col-span-2">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Prévia da Lead Page</h3>
                      
                      {/* Card de Preview */}
                      <div className="relative group">
                        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 hover:border-blue-400 transition-colors">
                          <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg mb-4 flex items-center justify-center">
                            <div className="text-center">
                              <FileText className="text-blue-400 mx-auto mb-3" size={40} />
                              <p className="text-blue-600 font-medium">Preview da Lead Page</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="h-3 bg-gray-200 rounded-full w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded-full w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded-full w-2/3"></div>
                          </div>
                        </div>
                        
                        {/* Overlay com CTA */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end justify-center p-6">
                          <a
                            href={`/lead/${user.uid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                          >
                            <Eye size={18} />
                            Ver Página Completa
                          </a>
                        </div>
                      </div>

                      {/* Ações Rápidas */}
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <button
                          onClick={() => setCurrentTab('leadpage-editor')}
                          className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 size={20} className="text-blue-600" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Editor</p>
                            <p className="text-sm text-gray-600">Personalizar página</p>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/lead/${user.uid}`);
                            alert('Link copiado!');
                          }}
                          className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                        >
                          <LinkIcon size={20} className="text-emerald-600" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Copiar Link</p>
                            <p className="text-sm text-gray-600">Compartilhar rapidamente</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Analytics e Link Encurtado */}
                  <div className="space-y-6">
                    {/* Gerar Link Encurtado */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Share2 className="text-blue-600" size={20} />
                        <h3 className="font-bold text-gray-900">Link Encurtado</h3>
                      </div>
                      
                      {!shortLink ? (
                        <div className="space-y-4">
                          <p className="text-gray-600 text-sm">
                            Crie um link encurtado com analytics para acompanhar visualizações e cliques.
                          </p>
                          <button
                            onClick={handleGenerateShortLink}
                            disabled={generatingLink}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {generatingLink ? (
                              <>
                                <span className="inline-block animate-spin">⟳</span>
                                Gerando...
                              </>
                            ) : (
                              <>
                                <Share2 size={18} />
                                Criar Link Encurtado
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Seu Link:</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(shortLink)}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Copiar
                              </button>
                            </div>
                            <code className="text-sm text-blue-800 break-all">{shortLink}</code>
                          </div>
                          
                          <button
                            onClick={handleLoadAnalytics}
                            disabled={loadingAnalytics}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {loadingAnalytics ? (
                              <>
                                <span className="inline-block animate-spin">⟳</span>
                                Carregando...
                              </>
                            ) : (
                              <>
                                <BarChart3 size={18} />
                                Ver Analytics
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Analytics Display */}
                    {linkAnalytics && (
                      <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="text-purple-600" size={20} />
                          <h3 className="font-bold text-gray-900">Analytics do Link</h3>
                        </div>
                        
                        <div className="space-y-4">
                          {linkAnalytics.note ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 text-yellow-800">
                                <BarChart3 size={16} />
                                <span className="font-medium">Analytics Indisponível</span>
                              </div>
                              <p className="text-sm text-yellow-700 mt-1">{linkAnalytics.note}</p>
                              <p className="text-xs text-yellow-600 mt-2">
                                Os dados de analytics podem levar alguns minutos para aparecer após o primeiro acesso.
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                                  <div className="text-2xl font-bold text-purple-700 mb-1">
                                    {linkAnalytics.totalViews || linkAnalytics.views || 0}
                                  </div>
                                  <div className="text-xs text-purple-600">Visualizações Totais</div>
                                </div>
                                
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                                  <div className="text-2xl font-bold text-blue-700 mb-1">
                                    {linkAnalytics.uniqueViews || linkAnalytics.unique_visitors || 0}
                                  </div>
                                  <div className="text-xs text-blue-600">Visitantes Únicos</div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Cliques</span>
                                  <span className="font-medium text-gray-900">
                                    {linkAnalytics.clicks || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Países</span>
                                  <span className="font-medium text-gray-900">
                                    {linkAnalytics.topCountries?.length || linkAnalytics.countries?.length || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Data de Criação</span>
                                  <span className="font-medium text-gray-900">
                                    {linkAnalytics.created_at ? new Date(linkAnalytics.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="text-yellow-300" size={20} />
                        <h3 className="font-bold">Performance</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Taxa de Conversão</span>
                          <span className="font-bold text-emerald-400">12.5%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Tempo Médio</span>
                          <span className="font-bold">2:30min</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Taxa de Rejeição</span>
                          <span className="font-bold text-rose-400">18%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lead Page Editor Tab */}
          {currentTab === 'leadpage-editor' && (
            <div className="p-6">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Editor da Lead Page</h2>
                    <p className="text-gray-600 mt-1">Personalize sua página de captura de leads</p>
                  </div>
                  <button
                    onClick={() => setCurrentTab('leadpage')}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    ← Voltar
                  </button>
                </div>
              </div>
              <LeadPageEditor />
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação */}
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

      {/* Modal de Edição de Serviço */}
      {editServiceModal && (
        <ServiceForm
          editMode={!!editingService}
          serviceData={editingService}
          onClose={() => {
            setEditServiceModal(false);
            setEditingService(undefined);
            if (user) {
              const q = query(collection(db, "services"), where("ownerId", "==", user.uid));
              getDocs(q).then(snapshot => {
                const servicesData = snapshot.docs.map(doc => ({ 
                  id: doc.id, 
                  ...doc.data() 
                } as Service));
                setServices(servicesData);
              });
            }
          }}
        />
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-600 text-sm">
                © {new Date().getFullYear()} Dashboard Pro. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/terms" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">
                Termos
              </Link>
              <Link to="/privacy" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">
                Privacidade
              </Link>
              <Link to="/support" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">
                Suporte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}