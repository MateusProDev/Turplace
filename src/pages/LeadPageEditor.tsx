import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserLeadPage, getTemplate, getAllTemplates, saveUserLeadPage, updateLeadPageSection } from '../utils/leadpage';
import type { LeadPageTemplate, UserLeadPage, LeadPageSection } from '../types/leadpage';
import { 
  Eye, 
  ArrowLeft, 
  Palette, 
  CheckCircle, 
  X, 
  Upload, 
  Smartphone, 
  Globe,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  Bold,
  AlignLeft,
  Layout,
  Share
} from 'lucide-react';
import { uploadToCloudinary } from '../utils/cloudinary';

const getFieldPlaceholder = (field: string): string => {
  switch (field) {
    case 'buttonLink':
      return 'link';
    case 'title':
      return 'título';
    case 'content':
      return 'conteúdo';
    case 'buttonText':
      return 'texto do botão';
    case 'subtitle':
      return 'subtítulo';
    default:
      return field.toLowerCase();
  }
};

const LeadPageEditor = () => {
  const { user, userData } = useAuth();
  const [template, setTemplate] = useState<LeadPageTemplate | null>(null);
  const [allTemplates, setAllTemplates] = useState<LeadPageTemplate[]>([]);
  const [userLeadPage, setUserLeadPage] = useState<UserLeadPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [previewMode] = useState<'mobile'>('mobile');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const isMobilePreview = previewMode === 'mobile';

  const toggleSectionExpand = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/lead/${user?.uid}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const handleTemplateChange = async (newTemplateId: string) => {
    if (!user) return;

    try {
      const newTemplate = await getTemplate(newTemplateId);
      if (newTemplate) {
        setTemplate(newTemplate);
        const updated: UserLeadPage = {
          ...userLeadPage!,
          templateId: newTemplateId,
          customData: {} // Reset custom data when changing template
        };
        setUserLeadPage(updated);
        await saveUserLeadPage(user.uid, updated);
        setExpandedSections(new Set());
      }
    } catch (error) {
      console.error('Erro ao mudar template:', error);
      alert('Erro ao mudar template. Tente novamente.');
    }
  };

  const handleImageUpload = async (sectionId: string, file: File) => {
    try {
      setUploadingImage(sectionId);
      const imageUrl = await uploadToCloudinary(file);
      await handleSectionChange(sectionId, 'image', imageUrl);
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    } finally {
      setUploadingImage(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [templates, data] = await Promise.all([
          getAllTemplates(),
          getUserLeadPage(user.uid)
        ]);

        setAllTemplates(templates);

        if (data) {
          const userTemplate = await getTemplate(data.templateId);
          setTemplate(userTemplate);
          setUserLeadPage(data);
        } else {
          const defaultTemplate = templates.find(t => t.id === 'default-tourism') || templates[0];
          if (defaultTemplate) {
            setTemplate(defaultTemplate);
            const initial: UserLeadPage = {
              templateId: defaultTemplate.id,
              customData: {}
            };
            await saveUserLeadPage(user.uid, initial);
            setUserLeadPage(initial);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados da lead page:', err);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleSectionChange = async (sectionId: string, field: string, value: unknown) => {
    if (!user) return;
    const updated = { ...userLeadPage!.customData[sectionId], [field]: value };
    setUserLeadPage(prev => prev ? {
      ...prev,
      customData: { ...prev.customData, [sectionId]: updated }
    } : null);

    try {
      setSaving(true);
      await updateLeadPageSection(user.uid, sectionId, updated);
      setTimeout(() => setSaving(false), 500);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setSaving(false);
    }
  };

  const toggleSection = async (sectionId: string, enabled: boolean) => {
    if (!user) return;
    await handleSectionChange(sectionId, 'enabled', enabled);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">Você precisa estar logado para acessar o editor de lead page.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all hover:scale-105"
          >
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
          <p className="text-gray-600">Carregando editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Erro ao Carregar</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!template || !userLeadPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <p className="text-gray-600">Erro ao carregar dados da lead page.</p>
        </div>
      </div>
    );
  }

  const renderPreviewSection = (section: LeadPageSection, isMobilePreview: boolean = false) => {
    const custom = userLeadPage?.customData?.[section.id] || {};
    const merged = { ...section, ...custom };
    if (merged.enabled === false) return null; // Only hide if explicitly set to false

    switch (merged.type) {
      case 'hero':
        if (merged.stats) {
          return (
            <section className="relative min-h-[400px] flex items-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white overflow-hidden">
              {merged.image && (
                <div className="absolute inset-0">
                  <img src={merged.image} alt="Hero Background" className="w-full h-full object-cover opacity-20" />
                  <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                </div>
              )}
              <div className={`relative z-10 container mx-auto ${isMobilePreview ? '' : 'px-4'} py-8`}>
                <div className="max-w-4xl mx-auto text-center">
                  {merged.subtitle && (
                    <p className="text-base md:text-lg mb-2 text-blue-200 font-light">{merged.subtitle}</p>
                  )}
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-black mb-3 leading-tight">{merged.title}</h1>
                  <p className="text-base md:text-lg mb-4 max-w-3xl mx-auto text-blue-100">{merged.content}</p>

                  {merged.stats && (
                    <div className={`grid ${isMobilePreview ? 'grid-cols-1' : 'grid-cols-3'} gap-4 mb-6`}>
                      {merged.stats.map((stat: string, idx: number) => (
                        <div key={idx} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-3 border border-white border-opacity-20">
                          <div className="text-xl md:text-2xl font-bold text-white">{stat.split(' ')[0]}</div>
                          <div className="text-blue-200 text-xs mt-1">{stat.split(' ').slice(1).join(' ')}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                    <a href={merged.buttonLink} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-2xl">
                      {merged.buttonText}
                    </a>
                    {merged.urgencyText && (
                      <div className="text-red-300 font-semibold animate-pulse text-xs">
                        {merged.urgencyText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        }

        return (
          <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
            <div className={`container mx-auto text-center ${isMobilePreview ? '' : 'px-4'}`}>
              <h1 className="text-2xl md:text-3xl font-bold mb-3">{merged.title}</h1>
              <p className="text-base mb-4 max-w-2xl mx-auto">{merged.content}</p>
              {merged.image && <img src={merged.image} alt="Hero" className="mx-auto mb-4 rounded-lg shadow-lg max-w-xs" />}
              <a href={merged.buttonLink} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition inline-block text-sm">
                {merged.buttonText}
              </a>
            </div>
          </section>
        );

      case 'about':
        return (
          <section className="py-16 bg-gray-50">
            <div className={`container mx-auto text-center ${isMobilePreview ? '' : 'px-4'}`}>
              <h2 className="text-3xl font-bold mb-8 text-gray-900">{merged.title}</h2>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">{merged.content}</p>
              {merged.image && (
                <img
                  src={merged.image}
                  alt="About"
                  className="mx-auto mt-8 rounded-lg shadow-lg max-w-md"
                />
              )}
            </div>
          </section>
        );

      case 'benefits':
        if ((merged.items?.[0] as any)?.price) {
          return (
            <section className="py-12 bg-gray-50">
              <div className={`container mx-auto ${isMobilePreview ? '' : 'px-4'}`}>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{merged.title}</h2>
                  {merged.subtitle && <p className="text-lg text-gray-600">{merged.subtitle}</p>}
                </div>
                <div className={`grid ${isMobilePreview ? 'grid-cols-1' : 'grid-cols-3'} gap-6 max-w-6xl mx-auto`}>
                  {(merged as any).items?.map((item: unknown, idx: number) => (
                    <div key={idx} className={`relative bg-white rounded-xl shadow-lg p-6 ${(item as any).popular ? 'ring-2 ring-blue-500 transform scale-105' : ''}`}>
                      {(item as any).popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          MAIS POPULAR
                        </div>
                      )}
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{(item as any).title}</h3>
                        {(item as any).subtitle && <p className="text-gray-600 mb-3 text-sm">{(item as any).subtitle}</p>}
                        <div className="mb-4">
                          <span className="text-2xl font-black text-gray-900">{(item as any).price}</span>
                          {(item as any).period && <span className="text-gray-600 text-sm">/{(item as any).period}</span>}
                        </div>
                        <ul className="text-left space-y-2 mb-6">
                          {(item as any).features?.map((feature: string, fidx: number) => (
                            <li key={fidx} className="flex items-center text-sm">
                              <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button className={`w-full py-2 px-4 rounded-lg font-bold text-sm transition-all ${(item as any).popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}>
                          {(item as any).cta || (item as any).buttonText}
                        </button>
                        {(item as any).bonus && (
                          <p className="text-green-600 font-semibold mt-2 text-xs">{(item as any).bonus}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if ((merged.items?.[0] as any)?.image || (merged.items?.[0] as any)?.features) {
          return (
            <section className="py-12 bg-white">
              <div className={`container mx-auto ${isMobilePreview ? '' : 'px-4'}`}>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{merged.title}</h2>
                  {merged.subtitle && <p className="text-lg text-gray-600">{merged.subtitle}</p>}
                </div>
                <div className={`grid ${isMobilePreview ? 'grid-cols-1' : 'grid-cols-3'} gap-6`}>
                  {merged.items?.map((item: unknown, idx: number) => (
                    <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      {(item as any).image && (
                        <img src={(item as any).image} alt={(item as any).title} className="w-full h-32 object-cover" />
                      )}
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{(item as any).title}</h3>
                        {(item as any).description && <p className="text-gray-600 mb-3 text-sm">{(item as any).description}</p>}
                        {(item as any).price && <p className="text-xl font-bold text-blue-600">{(item as any).price}</p>}
                        {(item as any).features && (
                          <ul className="space-y-1 mt-3">
                            {(item as any).features?.map((feature: string, fidx: number) => (
                              <li key={fidx} className="text-xs text-gray-600 flex items-center">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        return (
          <section className="py-16">
            <div className={`container mx-auto ${isMobilePreview ? '' : 'px-4'}`}>
              <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{merged.title}</h2>
                <div className={`grid ${isMobilePreview ? 'grid-cols-1' : 'grid-cols-3'} gap-8`}>
                {merged.items?.map((item, idx) => (
                  <div key={idx} className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-700">{typeof item === 'string' ? item : (item as any).title || item}</p>
                  </div>
                ))}
              </div>
              {merged.image && (
                <img
                  src={merged.image}
                  alt="Benefits"
                  className="mx-auto mt-12 rounded-lg shadow-lg max-w-md"
                />
              )}
            </div>
          </section>
        );

      case 'social-proof':
        if ((merged.items?.[0] as any)?.video) {
          return (
            <section className="py-12 bg-gray-50">
              <div className={`container mx-auto ${isMobilePreview ? '' : 'px-4'}`}>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{merged.title}</h2>
                  {merged.subtitle && <p className="text-lg text-gray-600">{merged.subtitle}</p>}
                </div>
                <div className={`grid ${isMobilePreview ? 'grid-cols-1' : 'grid-cols-3'} gap-6`}>
                  {merged.items?.map((item: unknown, idx: number) => (
                    <div key={idx} className="bg-white rounded-lg shadow-md p-4">
                      <div className="flex items-center mb-3">
                        <img src={(item as any).image} alt={(item as any).name} className="w-10 h-10 rounded-full mr-3" />
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{(item as any).name}</h4>
                          <p className="text-gray-600 text-xs">{(item as any).location}</p>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3 text-sm">"{(item as any).text}"</p>
                      <div className="flex items-center">
                        <span className="text-green-600 font-bold mr-2 text-sm">{(item as any).result}</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        return (
          <section className="py-16 bg-gray-50">
            <div className={`container mx-auto ${isMobilePreview ? '' : 'px-4'}`}>
              <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{merged.title}</h2>
              <div className={`grid ${isMobilePreview ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-8`}>
                {merged.items?.map((item, idx) => (
                  <blockquote key={idx} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 italic text-gray-700">
                    "{typeof item === 'string' ? item : ((item as any).text || (item as any).title || (item as any).description || JSON.stringify(item))}"
                  </blockquote>
                ))}
              </div>
              {merged.image && (
                <img
                  src={merged.image}
                  alt="Social Proof"
                  className="mx-auto mt-12 rounded-lg shadow-lg max-w-md"
                />
              )}
            </div>
          </section>
        );

      case 'cta':
        const bgStyle = merged.backgroundColor
          ? { backgroundColor: merged.backgroundColor }
          : merged.backgroundImage
          ? { backgroundImage: `url(${merged.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : {};

        return (
          <section className="py-8 text-white" style={bgStyle}>
            <div className="container mx-auto text-center px-4">
              <div className="max-w-4xl mx-auto">
                <div className={`grid ${isMobilePreview ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6 items-center`}>
                  <div>
                    <h2 className="text-xl font-bold mb-2">{merged.title}</h2>
                    {merged.subtitle && <p className="text-base mb-2 text-blue-100">{merged.subtitle}</p>}
                    <p className="text-base mb-4">{merged.content}</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                      <a href={merged.buttonLink} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-2xl">
                        {merged.buttonText}
                      </a>
                      {merged.urgencyText && (
                        <div className="text-red-300 font-semibold animate-pulse text-xs">
                          {merged.urgencyText}
                        </div>
                      )}
                    </div>
                  </div>
                  {merged.image && (
                    <div>
                      <img
                        src={merged.image}
                        alt="CTA"
                        className="w-full rounded-lg shadow-lg object-cover max-w-sm mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section className="py-16">
            <div className="container mx-auto text-center px-4">
              <h2 className="text-3xl font-bold mb-8 text-gray-900">{merged.title}</h2>
              <div className="bg-gray-50 p-8 rounded-lg max-w-md mx-auto">
                <p className="text-lg text-gray-700 whitespace-pre-line">{merged.content}</p>
              </div>
              {merged.image && (
                <img
                  src={merged.image}
                  alt="Contact"
                  className="mx-auto mt-8 rounded-lg shadow-lg max-w-md"
                />
              )}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link 
                to="/provider" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Voltar ao Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layout className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Editor de Lead Page</h1>
                  <p className="text-sm text-gray-600">Personalize sua página de conversão</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {saving && (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                  <span className="text-sm font-medium">Salvando...</span>
                </div>
              )}
              
              {allTemplates.length > 1 && (
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <Palette className="w-4 h-4 text-gray-500" />
                  <select
                    value={template?.id || ''}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="text-sm font-medium text-gray-900 bg-transparent border-none focus:ring-0 focus:outline-none"
                  >
                    {allTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                <Smartphone className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">Visualização Mobile</span>
              </div>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  showPreview
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {showPreview ? (
                  <>
                    <Palette className="w-4 h-4" />
                    <span>Continuar Editando</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Visualizar Página</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share className="w-4 h-4" />
                    <span>Compartilhar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {showPreview ? (
          // Preview Mode
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Pré-visualização</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    {template.sections.filter(s => {
                      const custom = userLeadPage?.customData?.[s.id] || {};
                      const merged = { ...s, ...custom };
                      return merged.enabled !== false; // Count as active if not explicitly disabled
                    }).length} seções ativas
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Palette className="w-4 h-4" />
                    Voltar ao Editor
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {template.sections.map(section => (
                <div key={section.id}>
                  {renderPreviewSection(section, isMobilePreview)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Editor Mode
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sidebar - Editor Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Sections Editor */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Palette className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Seções da Página</h2>
                        <p className="text-sm text-gray-600">Ative e personalize cada seção</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {template.sections.length} seções disponíveis
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {template.sections.map((section) => {
                    const custom = userLeadPage?.customData?.[section.id] || {};
                    const merged = { ...section, ...custom };
                    const isExpanded = expandedSections.has(section.id);

                    return (
                      <div
                        key={section.id}
                        className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                          isExpanded ? 'border-blue-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div 
                          className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => toggleSectionExpand(section.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${merged.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              <div>
                                <h3 className="font-semibold text-gray-900 capitalize">
                                  {section.type.replace('-', ' ')}
                                </h3>
                                <p className="text-xs text-gray-500">{section.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSection(section.id, !merged.enabled);
                                }}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                                  merged.enabled
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {merged.enabled ? 'Ativo' : 'Inativo'}
                              </button>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 bg-white border-t border-gray-100">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  id={`toggle-${section.id}`}
                                  checked={merged.enabled}
                                  onChange={(e) => toggleSection(section.id, e.target.checked)}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor={`toggle-${section.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                  Exibir esta seção na página
                                </label>
                              </div>

                              {merged.enabled && (
                                <>
                                  {['title', 'content', 'buttonText', 'buttonLink'].map(field => (
                                    merged[field as keyof typeof merged] !== undefined && (
                                      <div key={field} className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                          {field === 'buttonLink' ? (
                                            <>
                                              <LinkIcon className="w-4 h-4" />
                                              Link do Botão
                                            </>
                                          ) : field === 'title' ? (
                                            <>
                                              <Bold className="w-4 h-4" />
                                              Título
                                            </>
                                          ) : field === 'content' ? (
                                            <>
                                              <AlignLeft className="w-4 h-4" />
                                              Conteúdo
                                            </>
                                          ) : (
                                            field
                                          )}
                                        </label>
                                        {field === 'content' ? (
                                          <textarea
                                            value={String(merged[field as keyof typeof merged] || '')}
                                            onChange={(e) => handleSectionChange(section.id, field, e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                            placeholder={`Digite o ${getFieldPlaceholder(field)}`}
                                          />
                                        ) : (
                                          <input
                                            type={field === 'buttonLink' ? 'url' : 'text'}
                                            value={String(merged[field as keyof typeof merged] || '')}
                                            onChange={(e) => handleSectionChange(section.id, field, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                            placeholder={`Digite o ${field === 'buttonLink' ? 'link' : (field as string).toLowerCase()}`}
                                          />
                                        )}
                                      </div>
                                    )
                                  ))}

                                  {/* Image Upload */}
                                  {section.type !== 'benefits' && section.type !== 'social-proof' && (
                                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <ImageIcon className="w-4 h-4" />
                                        Imagem
                                      </label>
                                      {merged.image ? (
                                        <div className="relative group">
                                          <img
                                            src={merged.image}
                                            alt="Preview"
                                            className="w-full h-48 object-cover rounded-lg border shadow-sm"
                                          />
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                                            <button
                                              onClick={() => handleSectionChange(section.id, 'image', '')}
                                              className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all transform hover:scale-110"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="relative">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleImageUpload(section.id, file);
                                            }}
                                            className="hidden"
                                            id={`image-upload-${section.id}`}
                                            disabled={uploadingImage === section.id}
                                          />
                                          <label
                                            htmlFor={`image-upload-${section.id}`}
                                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                                              uploadingImage === section.id
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                            }`}
                                          >
                                            {uploadingImage === section.id ? (
                                              <>
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                                                <span className="text-sm text-blue-600 font-medium">Fazendo upload...</span>
                                              </>
                                            ) : (
                                              <>
                                                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                                                <span className="text-sm text-gray-600">Clique para fazer upload</span>
                                                <span className="text-xs text-gray-500">PNG, JPG ou GIF</span>
                                              </>
                                            )}
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Items Editor */}
                                  {(section.type === 'benefits' || section.type === 'social-proof') && (
                                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                      <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                                        <span>Itens</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newItems = [...(merged.items || []), ''];
                                            handleSectionChange(section.id, 'items', newItems);
                                          }}
                                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                          <Plus className="w-4 h-4" />
                                          Adicionar Item
                                        </button>
                                      </label>
                                      <div className="space-y-2">
                                        {(merged.items || []).map((item, idx) => (
                                          <div key={idx} className="flex gap-2">
                                            <input
                                              type="text"
                                              value={typeof item === 'string' ? item : (item as any).title || (item as any).text || JSON.stringify(item)}
                                              onChange={(e) => {
                                                const newItems = [...(merged.items || [])];
                                                if (typeof item === 'string') {
                                                  newItems[idx] = e.target.value;
                                                } else {
                                                  newItems[idx] = { ...(item as any), title: e.target.value };
                                                }
                                                handleSectionChange(section.id, 'items', newItems);
                                              }}
                                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                              placeholder={`Item ${idx + 1}`}
                                            />
                                            <button
                                              onClick={() => {
                                                const newItems = (merged.items || []).filter((_, i) => i !== idx);
                                                handleSectionChange(section.id, 'items', newItems);
                                              }}
                                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                              title="Remover item"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Domain Settings */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Domínio Personalizado</h2>
                      <p className="text-sm text-gray-600">Use seu próprio domínio para a lead page</p>
                    </div>
                  </div>

                  {userData?.plan === 'premium' ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Seu Domínio
                            </label>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                                https://
                              </span>
                              <input
                                type="text"
                                placeholder="meuservico.com.br"
                                value={userLeadPage?.domain || ''}
                                onChange={(e) => setUserLeadPage(prev => prev ? { ...prev, domain: e.target.value } : null)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              // Handle domain save
                            }}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition whitespace-nowrap"
                          >
                            Salvar Domínio
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-3">
                          ⓘ Configure o CNAME do seu domínio para apontar para <code className="bg-gray-100 px-1 rounded">marketplace.turvia.com.br</code>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100 rounded-xl p-6 text-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Globe className="w-6 h-6 text-yellow-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Domínio Personalizado Premium</h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        Use seu próprio domínio para aumentar a credibilidade e conversões
                      </p>
                      <Link
                        to="/pricing"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all hover:scale-105"
                      >
                        Fazer Upgrade para Premium
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Pré-visualização</h3>
                    </div>
                    <div className="text-xs text-gray-500">
                      Mobile
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {isMobilePreview ? (
                    <div className="bg-white rounded-lg overflow-hidden shadow-lg min-h-[800px] max-h-[900px] overflow-y-auto">
                      {/* Mobile preview wrapper */}
                      <div className="[&>*]:!rounded-none [&_section]:!py-8 [&_section]:!px-4 [&_.container]:!px-0">
                        {template.sections.filter(section => {
                          const custom = userLeadPage?.customData?.[section.id] || {};
                          const merged = { ...section, ...custom };
                          return merged.enabled !== false; // Show if not explicitly disabled
                        }).map(section => (
                          <div key={section.id}>
                            {renderPreviewSection(section, true)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg overflow-hidden shadow-lg min-h-[800px] max-h-[900px] overflow-y-auto">
                      {template.sections.filter(section => {
                        const custom = userLeadPage?.customData?.[section.id] || {};
                        const merged = { ...section, ...custom };
                        return merged.enabled !== false; // Show if not explicitly disabled
                      }).map(section => (
                        <div key={section.id}>
                          {renderPreviewSection(section, false)}
                        </div>
                      ))}
                    </div>
                  )}

                  {template.sections.filter(section => {
                    const custom = userLeadPage?.customData?.[section.id] || {};
                    const merged = { ...section, ...custom };
                    return merged.enabled !== false; // Show if not explicitly disabled
                  }).length === 0 && (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Eye className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">Nenhuma seção ativa</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Ative algumas seções no editor para visualizá-las aqui
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span>Seções ativas:</span>
                      <span className="font-medium">
                        {template.sections.filter(s => {
                          const custom = userLeadPage?.customData?.[s.id] || {};
                          const merged = { ...s, ...custom };
                          return merged.enabled !== false; // Count as active if not explicitly disabled
                        }).length} / {template.sections.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Online
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizar Página Completa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadPageEditor;