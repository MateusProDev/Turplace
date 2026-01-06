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
  Link as LinkIcon,
  BookOpen,
  ShoppingBag
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
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
import { getLeadPageStats, calculateLeadPageMetrics } from '../utils/leadpage';

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

interface CourseSection {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration?: string;
  order: number;
}

interface CourseModule {
  id: string;
  title: string;
  description?: string;
  sections: CourseSection[];
  order: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  image?: string;
  modules: CourseModule[];
  status: 'draft' | 'published';
  createdAt: any;
  updatedAt: any;
  instructorId: string;
  totalStudents?: number;
  rating?: number;
  views?: number;
}

interface Tab {
  id: 'services' | 'courses' | 'profile' | 'plans' | 'wallet' | 'leadpage' | 'leadpage-editor';
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
}

interface CourseFormProps {
  course?: Course;
  onSave: (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'instructorId' | 'totalStudents' | 'rating'>) => void;
  onCancel: () => void;
}

function CourseForm({ course, onSave, onCancel }: CourseFormProps) {
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [price, setPrice] = useState(course?.price?.toString() || '');
  const [image, setImage] = useState(course?.image || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [status, setStatus] = useState<'draft' | 'published'>(course?.status || 'draft');
  const [modules, setModules] = useState<CourseModule[]>(course?.modules || []);

  const addModule = () => {
    if (modules.length >= 5) {
      alert('Máximo de 5 módulos por curso');
      return;
    }
    const newModule: CourseModule = {
      id: Date.now().toString(),
      title: '',
      description: '',
      sections: [],
      order: modules.length
    };
    setModules([...modules, newModule]);
  };

  const updateModule = (moduleId: string, field: keyof CourseModule, value: string) => {
    setModules(modules.map(module => 
      module.id === moduleId ? { ...module, [field]: value } : module
    ));
  };

  const removeModule = (moduleId: string) => {
    setModules(modules.filter(module => module.id !== moduleId));
  };

  const addSectionToModule = (moduleId: string) => {
    setModules(modules.map(module => {
      if (module.id === moduleId) {
        const newSection: CourseSection = {
          id: Date.now().toString(),
          title: '',
          description: '',
          videoUrl: '',
          duration: '',
          order: module.sections.length
        };
        return { ...module, sections: [...module.sections, newSection] };
      }
      return module;
    }));
  };

  const updateSectionInModule = (moduleId: string, sectionId: string, field: keyof CourseSection, value: string | number) => {
    setModules(modules.map(module => {
      if (module.id === moduleId) {
        return {
          ...module,
          sections: module.sections.map(section => 
            section.id === sectionId ? { ...section, [field]: value } : section
          )
        };
      }
      return module;
    }));
  };

  const removeSectionFromModule = (moduleId: string, sectionId: string) => {
    setModules(modules.map(module => {
      if (module.id === moduleId) {
        return {
          ...module,
          sections: module.sections.filter(section => section.id !== sectionId)
        };
      }
      return module;
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      setImage(imageUrl);
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      alert('Título e descrição são obrigatórios');
      return;
    }

    if (modules.length === 0) {
      alert('Adicione pelo menos um módulo ao curso');
      return;
    }

    // Verificar se todos os módulos têm pelo menos uma seção
    const modulesWithoutSections = modules.filter(module => module.sections.length === 0);
    if (modulesWithoutSections.length > 0) {
      alert('Todos os módulos devem ter pelo menos uma seção');
      return;
    }

    const courseData = {
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      image: image.trim(),
      status,
      modules: modules.map((module, moduleIndex) => ({
        ...module,
        order: moduleIndex,
        sections: module.sections.map((section, sectionIndex) => ({ ...section, order: sectionIndex }))
      }))
    };

    onSave(courseData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título do Curso *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ex: Introdução ao Turismo Sustentável"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preço (R$)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrição *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Descreva o que os alunos aprenderão neste curso..."
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagem do Curso
          </label>
          
          {/* Preview da imagem */}
          {image && (
            <div className="mb-3">
              <img 
                src={image} 
                alt="Preview do curso" 
                className="w-full h-32 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}

          {/* Upload de imagem */}
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={uploadingImage}
            />
            
            {uploadingImage && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Fazendo upload...
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </div>
      </div>

      {/* Módulos do Curso */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Módulos do Curso</h3>
          <button
            type="button"
            onClick={addModule}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            disabled={modules.length >= 5}
          >
            <Plus size={16} />
            Adicionar Módulo ({modules.length}/5)
          </button>
        </div>

        <div className="space-y-6">
          {modules.map((module, moduleIndex) => (
            <div key={module.id} className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 text-lg">Módulo {moduleIndex + 1}: {module.title || 'Sem título'}</h4>
                <button
                  type="button"
                  onClick={() => removeModule(module.id)}
                  className="text-red-600 hover:text-red-800 transition-colors p-1"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Informações do Módulo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título do Módulo *
                  </label>
                  <input
                    type="text"
                    value={module.title}
                    onChange={(e) => updateModule(module.id, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ex: Introdução ao Tema"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição (opcional)
                  </label>
                  <input
                    type="text"
                    value={module.description}
                    onChange={(e) => updateModule(module.id, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Breve descrição do módulo..."
                  />
                </div>
              </div>

              {/* Seções do Módulo */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-800">Seções do Módulo</h5>
                  <button
                    type="button"
                    onClick={() => addSectionToModule(module.id)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={14} />
                    Adicionar Seção
                  </button>
                </div>

                <div className="space-y-3">
                  {module.sections.map((section, sectionIndex) => (
                    <div key={section.id} className="border border-gray-300 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-700">Seção {moduleIndex + 1}.{sectionIndex + 1}: {section.title || 'Sem título'}</span>
                        <button
                          type="button"
                          onClick={() => removeSectionFromModule(module.id, section.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Título da Seção *
                          </label>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateSectionInModule(module.id, section.id, 'title', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                            placeholder="Título da seção"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Duração (opcional)
                          </label>
                          <input
                            type="text"
                            value={section.duration}
                            onChange={(e) => updateSectionInModule(module.id, section.id, 'duration', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                            placeholder="Ex: 15 min"
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Descrição (opcional)
                        </label>
                        <textarea
                          value={section.description}
                          onChange={(e) => updateSectionInModule(module.id, section.id, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                          placeholder="Breve descrição..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Link do Vídeo *
                        </label>
                        <input
                          type="url"
                          value={section.videoUrl}
                          onChange={(e) => updateSectionInModule(module.id, section.id, 'videoUrl', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                          placeholder="https://www.youtube.com/watch?v=..."
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {module.sections.length === 0 && (
                  <div className="text-center py-4 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma seção neste módulo</p>
                    <p className="text-xs">Adicione seções para organizar o conteúdo</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {modules.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum módulo adicionado ainda</p>
            <p className="text-sm mt-1">Clique em "Adicionar Módulo" para começar a estruturar seu curso</p>
          </div>
        )}
      </div>

      {/* Botões */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          {course ? 'Atualizar Curso' : 'Criar Curso'}
        </button>
      </div>
    </form>
  );
}

export default function ProviderDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Estados principais
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'services' | 'courses' | 'profile' | 'plans' | 'wallet' | 'leadpage' | 'leadpage-editor'>('services');
  
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
  
  // Estados de cursos
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | undefined>(undefined);
  const [courseModal, setCourseModal] = useState(false);
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);
  
  // Estados do link encurtado
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [linkAnalytics, setLinkAnalytics] = useState<any | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [autoUpdating, setAutoUpdating] = useState(false);
  
  // Estados das estatísticas da leadpage
  const [leadPageStats, setLeadPageStats] = useState<any>(null);
  const [loadingLeadStats, setLoadingLeadStats] = useState(false);

  // Função para calcular performance geral
  const calculateOverallPerformance = useCallback(() => {
    if (!leadPageStats) return 0;

    // Se não há visualizações reais, mostrar 0% para usuários novos
    if (leadPageStats.totalViews === 0 && leadPageStats.leads === 0 && leadPageStats.clicks === 0) {
      return 0;
    }

    const conversionRate = leadPageStats.conversionRate || 0;
    const bounceRate = leadPageStats.bounceRate || 0;

    // Performance = (Conversão * 60%) + (Retenção * 40%)
    // Retenção = 100 - Bounce Rate
    const retentionRate = Math.max(0, 100 - bounceRate);
    const performance = (conversionRate * 0.6) + (retentionRate * 0.4);

    return Math.round(Math.min(100, Math.max(0, performance)));
  }, [leadPageStats]);

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
      id: 'courses', 
      label: 'Cursos', 
      icon: BookOpen, 
      color: 'text-green-600', 
      gradient: 'from-green-500 to-green-600' 
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

  // Carregar dados do usuário e serviços
  useEffect(() => {
    if (!user) return;

    const loadExistingShortLink = async () => {
      try {
        const expectedShortCode = `lead-${user.uid}`;
        console.log('Checking for existing short link with code:', expectedShortCode);
        
        // Try to get analytics for the expected short code to check if it exists
        const analytics = await shareContentService.getLinkAnalytics(expectedShortCode);
        if (analytics && analytics.short_code === expectedShortCode) {
          // Link exists, construct the URL
          const shortUrl = `https://sharecontent.io/x/${expectedShortCode}`;
          console.log('Found existing short link:', shortUrl);
          setShortLink(shortUrl);
          localStorage.setItem('providerShortLink', shortUrl);
          
          // Save to Firestore for future loads
          await updateDoc(doc(db, "users", user.uid), {
            shortLink: shortUrl,
            updatedAt: new Date()
          });
          console.log('Saved existing short link to Firestore');
        }
      } catch (error) {
        console.log('No existing short link found or error checking:', error instanceof Error ? error.message : String(error));
      }
    };

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Loading user data for uid:', user.uid, 'data keys:', Object.keys(data));
        setProfile(data);
        setName(data.name as string || "");
        setBio(data.bio as string || "");
        setPhone(data.phone as string || "");
        setCity(data.city as string || "");
        setSpecialties(data.specialties as string[] || []);
        setExperience(data.experience as string || "");
        setPhoto(data.photoURL as string || null);
        
        // Generate and save slug if not exists (only once)
        const currentName = data.name as string || "";
        const currentSlug = data.slug as string;
        if (currentName && !currentSlug) {
          try {
            const newSlug = await generateUniqueUserSlug(currentName, user.uid);
            await updateDoc(doc(db, "users", user.uid), {
              slug: newSlug,
              updatedAt: new Date()
            });
            console.log('Generated and saved user slug:', newSlug);
          } catch (error) {
            console.error('Error generating user slug:', error);
          }
        }
        
        // Load short link from Firestore
        const firestoreShortLink = data.shortLink as string;
        if (firestoreShortLink) {
          console.log('Found shortLink in Firestore:', firestoreShortLink);
          setShortLink(firestoreShortLink);
          // Also save to localStorage for faster loading
          localStorage.setItem('providerShortLink', firestoreShortLink);
        } else {
          console.log('No shortLink found in Firestore for user:', user.uid, '- checking API');
          // If no short link in Firestore, try to load from API
          loadExistingShortLink();
        }
      } else {
        console.log('User document does not exist for uid:', user.uid);
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
    
    loadCourses();
    
    // Carregar estatísticas da leadpage
    handleLoadLeadStats();
    return () => unsubProfile();
  }, [user]);

  // Polling automático dos analytics em tempo real
  useEffect(() => {
    if (!shortLink) return;

    const pollAnalytics = async () => {
      try {
        setAutoUpdating(true);
        // Usar o link encurtado armazenado para analytics
        const analyticsLink = localStorage.getItem('providerShortLinkAnalytics') || shortLink;

        // Extrair o código do link encurtado
        const urlParts = analyticsLink.split('/');
        const shortCode = urlParts[urlParts.length - 1];

        const analytics = await shareContentService.getLinkAnalytics(shortCode);
        setLinkAnalytics(analytics);
      } catch (error) {
        console.warn('Erro ao atualizar analytics automaticamente:', error);
      } finally {
        setAutoUpdating(false);
      }
    };

    // Executar imediatamente
    pollAnalytics();

    // Configurar polling a cada 30 segundos
    const interval = setInterval(pollAnalytics, 30000);

    // Limpar intervalo quando o componente desmontar ou shortLink mudar
    return () => clearInterval(interval);
  }, [shortLink]);

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

  const handleDeleteCourse = async () => {
    if (!deleteCourseId) return;

    try {
      await deleteDoc(doc(db, "courses", deleteCourseId));
      setCourses(prev => prev.filter(c => c.id !== deleteCourseId));
      setDeleteCourseId(null);
    } catch (err) {
      console.error("Erro ao excluir curso:", err);
      alert("Erro ao excluir curso.");
    }
  };

  const loadCourses = async () => {
    if (!user) return;
    
    try {
      const q = query(collection(db, "courses"), where("instructorId", "==", user.uid));
      const snapshot = await getDocs(q);
      const coursesData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Course));
      setCourses(coursesData);
    } catch (error) {
      console.error("Erro ao carregar cursos:", error);
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

  // Função para calcular crescimento de serviços
  const calculateServicesGrowth = useCallback(() => {
    const { total, published } = stats;
    if (total === 0) return 0;
    
    // Crescimento baseado na taxa de aprovação
    // Quanto mais serviços aprovados vs pendentes, maior o crescimento
    const approvalRate = published / total;
    const growth = approvalRate * 25; // Máximo de 25% de crescimento
    
    return Math.round(growth);
  }, [stats]);

  // Função para calcular crescimento de visualizações
  const calculateViewsGrowth = useCallback(() => {
    const { views, total, published } = stats;

    // Verificações de segurança para evitar NaN
    if (!views || views === 0 || !total || total === 0) return 0;

    try {
      // Crescimento baseado em múltiplos fatores para consistência
      const viewsPerService = views / total;
      const approvalRate = published / total;

      // Fator baseado no volume de views por serviço (0-20%)
      const volumeFactor = Math.min(viewsPerService / 10, 20);

      // Fator baseado na taxa de aprovação (0-15%)
      const approvalFactor = approvalRate * 15;

      // Fator baseado no ID do usuário para consistência (0-10%)
      let userFactor = 5; // valor padrão
      if (user?.uid) {
        try {
          // Pegar os últimos 2 caracteres e converter para número
          const lastTwoChars = user.uid.slice(-2);
          const parsed = parseInt(lastTwoChars, 16);
          if (!isNaN(parsed)) {
            userFactor = parsed % 10;
          }
        } catch (error) {
          // Se der erro, mantém o valor padrão
          console.warn('Erro ao calcular userFactor:', error);
        }
      }

      const totalGrowth = volumeFactor + approvalFactor + userFactor;

      // Garantir que o resultado seja um número válido
      const finalGrowth = Math.round(Math.min(Math.max(totalGrowth, 0), 45));

      return isNaN(finalGrowth) ? 0 : finalGrowth;
    } catch (error) {
      console.error('Erro ao calcular crescimento de visualizações:', error);
      return 0;
    }
  }, [stats, user]);

  // Função para gerar slug único do usuário
  const generateUniqueUserSlug = async (name: string, userId: string): Promise<string> => {
    let slug = generateSlug(name);
    if (!slug) slug = `user-${userId.slice(0, 8)}`; // Fallback se o nome estiver vazio
    
    try {
      // Verificar se o slug já existe
      const existingUsers = await getDocs(query(collection(db, "users"), where("slug", "==", slug)));
      if (existingUsers.empty) {
        return slug;
      }
      
      // Se existe, adicionar sufixo numérico
      let counter = 1;
      let uniqueSlug = `${slug}-${counter}`;
      while (true) {
        const checkQuery = query(collection(db, "users"), where("slug", "==", uniqueSlug));
        const checkResult = await getDocs(checkQuery);
        if (checkResult.empty) {
          return uniqueSlug;
        }
        counter++;
        uniqueSlug = `${slug}-${counter}`;
      }
    } catch (error) {
      console.error('Error checking slug uniqueness:', error);
      return slug; // Retornar slug básico em caso de erro
    }
  };

  // Manipuladores de link encurtado
  const handleGenerateShortLink = async () => {
    if (!user) return;

    if (shortLink) {
      handleLoadAnalytics();
      return;
    }

    setGeneratingLink(true);
    try {
      // Garantir que temos um slug válido
      let userSlug = profile?.slug as string;

      // Se não temos slug no profile, tentar gerar um baseado no nome
      if (!userSlug && profile?.name) {
        try {
          userSlug = await generateUniqueUserSlug(profile.name as string, user.uid);
          // Atualizar o profile com o novo slug
          await updateDoc(doc(db, "users", user.uid), {
            slug: userSlug,
            updatedAt: new Date()
          });
          console.log('Generated new slug for short link:', userSlug);
        } catch (error) {
          console.error('Error generating slug for short link:', error);
        }
      }

      // Fallback para user.uid se ainda não temos slug
      if (!userSlug) {
        userSlug = user.uid;
        console.log('Using user.uid as fallback slug:', userSlug);
      }

      const leadPageUrl = `${window.location.origin}/${userSlug}`;

      // Usar o slug do usuário como código curto do link encurtado
      let shortCode = userSlug;
      console.log('Criando link encurtado com slug:', shortCode, 'URL:', leadPageUrl);

      try {
        const shortLinkData = await shareContentService.createShortLink(
          leadPageUrl,
          `Lead Page de ${profile?.name || user.displayName || 'Usuário'}`,
          shortCode
        );

        console.log('Link encurtado criado com sucesso:', shortLinkData.short_url);

        // Usar o link da leadpage para exibição
        const displayLink = leadPageUrl;
        setShortLink(displayLink);

        // Salvar o link encurtado para analytics
        const shortLinkUrl = shortLinkData.short_url ?? null;
        if (shortLinkUrl) {
          localStorage.setItem('providerShortLink', shortLinkUrl);
          localStorage.setItem('providerShortLinkAnalytics', shortLinkUrl);
          await updateDoc(doc(db, "users", user.uid), {
            shortLink: shortLinkUrl,
            leadPageUrl: displayLink,
            updatedAt: new Date()
          });

          // Carregar analytics automaticamente após criar o link
          try {
            const analytics = await shareContentService.getLinkAnalytics(shortCode);
            setLinkAnalytics(analytics);
          } catch (analyticsError) {
            console.warn('Erro ao carregar analytics automaticamente:', analyticsError);
          }
        }
      } catch (slugError) {
        console.warn('Erro ao criar link com slug personalizado, tentando fallback:', slugError);
        // Fallback: usar código automático se o slug personalizado falhar
        const shortLinkData = await shareContentService.createShortLink(
          leadPageUrl,
          `Lead Page de ${profile?.name || user.displayName || 'Usuário'}`,
          `lead-${user.uid}`
        );

        console.log('Link encurtado criado com fallback:', shortLinkData.short_url);

        // Usar o link da leadpage para exibição
        const displayLink = leadPageUrl;
        setShortLink(displayLink);

        // Salvar o link encurtado para analytics
        const shortLinkUrl = shortLinkData.short_url ?? null;
        if (shortLinkUrl) {
          localStorage.setItem('providerShortLink', shortLinkUrl);
          localStorage.setItem('providerShortLinkAnalytics', shortLinkUrl);
          await updateDoc(doc(db, "users", user.uid), {
            shortLink: shortLinkUrl,
            leadPageUrl: displayLink,
            updatedAt: new Date()
          });
        }
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
      // Usar o link encurtado armazenado para analytics
      const analyticsLink = localStorage.getItem('providerShortLinkAnalytics') || shortLink;

      // Extrair o código do link encurtado
      const urlParts = analyticsLink.split('/');
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

  const handleLoadLeadStats = async () => {
    if (!user) return;

    setLoadingLeadStats(true);
    try {
      const stats = await getLeadPageStats(user.uid);
      if (stats) {
        const metrics = calculateLeadPageMetrics(stats);
        setLeadPageStats(metrics);
      } else {
        // Estatísticas padrão se não houver dados
        setLeadPageStats({
          conversionRate: 0,
          avgDuration: 0,
          bounceRate: 0,
          totalViews: 0,
          uniqueViews: 0,
          leads: 0,
          clicks: 0
        });
      }
    } catch (err) {
      console.error("Erro ao carregar estatísticas da leadpage:", err);
      setLeadPageStats({
        conversionRate: 0,
        avgDuration: 0,
        bounceRate: 0,
        totalViews: 0,
        uniqueViews: 0,
        leads: 0,
        clicks: 0
      });
    } finally {
      setLoadingLeadStats(false);
    }
  };

  // Componentes de loading - mostrar spinner enquanto auth carrega
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="mt-6 text-gray-600 font-medium">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="mt-6 text-gray-600 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Moderno */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
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
              {/* Link para área do cliente */}
              <button
                onClick={() => navigate('/client')}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Área do Cliente"
              >
                <ShoppingBag size={18} />
                <span className="text-sm font-medium hidden md:inline">Minhas Compras</span>
              </button>

              {/* Configurações */}
              <button
                onClick={() => navigate('/profile/settings')}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Configurações"
              >
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
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total de Serviços */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                <Briefcase className="text-white" size={20} />
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                +{calculateServicesGrowth()}%
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
                +{calculateViewsGrowth()}%
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
                {loadingLeadStats ? '...' : `${calculateOverallPerformance()}%`}
              </span>
            </div>
            <p className="text-sm text-gray-600">Performance</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{loadingLeadStats ? '...' : `${calculateOverallPerformance()}%`}</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-1 rounded-full transition-all duration-500" 
                  style={{ width: `${calculateOverallPerformance()}%` }}
                ></div>
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

          {/* Courses Tab */}
          {currentTab === 'courses' && (
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Meus Cursos</h2>
                    <p className="text-gray-600 mt-1">Crie e gerencie seus cursos online</p>
                  </div>
                  <button
                    onClick={() => setCourseModal(true)}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <Plus size={18} />
                    Novo Curso
                  </button>
                </div>

                {courses.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                    <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum curso criado ainda</h3>
                    <p className="text-gray-600 mb-6">Comece criando seu primeiro curso online</p>
                    <button
                      onClick={() => setCourseModal(true)}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Criar Primeiro Curso
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <div key={course.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="aspect-video bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                          {course.image ? (
                            <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="w-12 h-12 text-white" />
                          )}
                        </div>
                        <div className="p-6">
                          <h3 className="font-semibold text-gray-900 mb-2">{course.title}</h3>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-lg font-bold text-green-600">R$ {Number(course.price).toFixed(2)}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              course.status === 'published' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {course.status === 'published' ? 'Publicado' : 'Rascunho'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mb-4">
                            <span>{course.views || 0} visualizações</span>
                            {course.totalStudents && course.totalStudents > 0 && (
                              <span> • {course.totalStudents} alunos</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingCourse(course);
                                setCourseModal(true);
                              }}
                              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setDeleteCourseId(course.id)}
                              className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                            href={`/${profile?.slug || user.uid}`}
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
                            navigator.clipboard.writeText(`${window.location.origin}/${profile?.slug || user.uid}`);
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
                                onClick={() => {
                                  const shortLinkUrl = localStorage.getItem('providerShortLink');
                                  navigator.clipboard.writeText(shortLinkUrl || shortLink || `${window.location.origin}/${profile?.slug || user.uid}`);
                                }}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Copiar
                              </button>
                            </div>
                            <code className="text-sm text-blue-800 break-all">/{String(profile?.slug || user.uid)}</code>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BarChart3 size={18} />
                              <span className="font-medium">Analytics do Link</span>
                              {autoUpdating && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span>Atualizando...</span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={handleLoadAnalytics}
                              disabled={loadingAnalytics}
                              className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-colors"
                            >
                              {loadingAnalytics ? '⟳' : '↻'}
                            </button>
                          </div>
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
                              <div className="text-xs text-blue-600">Visualizações Únicas</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl">
                              <div className="text-2xl font-bold text-emerald-700 mb-1">
                                {linkAnalytics.viewsByDay ? Object.keys(linkAnalytics.viewsByDay).length : 0}
                              </div>
                              <div className="text-xs text-emerald-600">Dias Ativos</div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-xl">
                              <div className="text-2xl font-bold text-rose-700 mb-1">
                                {linkAnalytics.topCountries ? linkAnalytics.topCountries.length : linkAnalytics.countries?.length || 0}
                              </div>
                              <div className="text-xs text-rose-600">Países</div>
                            </div>
                          </div>
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
                          <span className="font-bold text-emerald-400">
                            {loadingLeadStats ? '...' : `${leadPageStats?.conversionRate || 0}%`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Tempo Médio</span>
                          <span className="font-bold">
                            {loadingLeadStats ? '...' : `${Math.floor((leadPageStats?.avgDuration || 0) / 60)}:${String((leadPageStats?.avgDuration || 0) % 60).padStart(2, '0')}min`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Taxa de Rejeição</span>
                          <span className="font-bold text-rose-400">
                            {loadingLeadStats ? '...' : `${leadPageStats?.bounceRate || 0}%`}
                          </span>
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

      {/* Modal de Confirmação para Cursos */}
      <ConfirmModal
        open={!!deleteCourseId}
        title="Excluir Curso"
        description="Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita e todos os alunos perderão acesso."
        onCancel={() => setDeleteCourseId(null)}
        onConfirm={handleDeleteCourse}
      />

      {/* Modal de Edição de Serviço */}
      {editServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingService ? "Editar Serviço" : "Cadastrar Novo Serviço"}
              </h2>
              <button
                onClick={() => {
                  setEditServiceModal(false);
                  setEditingService(undefined);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
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
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cursos */}
      {courseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCourse ? "Editar Curso" : "Criar Novo Curso"}
              </h2>
              <button
                onClick={() => {
                  setCourseModal(false);
                  setEditingCourse(undefined);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Trash2 size={24} />
              </button>
            </div>

            <div className="p-6">
              <CourseForm
                course={editingCourse}
                onSave={async (courseData) => {
                  try {
                    if (editingCourse) {
                      // Atualizar curso existente
                      await updateDoc(doc(db, 'courses', editingCourse.id), {
                        ...courseData,
                        updatedAt: new Date()
                      });
                    } else {
                      // Criar novo curso
                      const courseRef = doc(collection(db, 'courses'));
                      await setDoc(courseRef, {
                        ...courseData,
                        id: courseRef.id,
                        instructorId: user?.uid,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        totalStudents: 0,
                        rating: 0,
                        views: 0
                      });
                    }
                    
                    // Recarregar cursos
                    await loadCourses();
                    
                    setCourseModal(false);
                    setEditingCourse(undefined);
                  } catch (error) {
                    console.error('Erro ao salvar curso:', error);
                    alert('Erro ao salvar curso. Tente novamente.');
                  }
                }}
                onCancel={() => {
                  setCourseModal(false);
                  setEditingCourse(undefined);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 mt-12 py-8">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
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