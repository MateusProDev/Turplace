import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserLeadPage, getTemplate, getAllTemplates, saveUserLeadPage, updateLeadPageSection, getLeadPageStats, calculateLeadPageMetrics } from '../utils/leadpage';
import { addVercelDomain, checkVercelDomain } from '../utils/vercel';
import type { LeadPageTemplate, UserLeadPage, LeadPageSection } from '../types/leadpage';
import { 
  Eye, 
  ArrowLeft, 
  Palette, 
  CheckCircle, 
  X, 
  Upload, 
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  Bold,
  AlignLeft,
  Layout,
  Share,
  Globe
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

const renderPreviewSection = (section: LeadPageSection, userLeadPage: UserLeadPage | null, isMobilePreview: boolean = false) => {
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
        <section className="py-16">
          <div className={`container mx-auto ${isMobilePreview ? '' : 'px-4'}`}>
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{merged.title}</h2>
            <div className={`grid ${isMobilePreview ? 'grid-cols-1' : 'grid-cols-3'} gap-8`}>
              {merged.items?.map((item: unknown, idx: number) => (
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
                    <p className="text-gray-700 text-sm mb-3">{(item as any).text}</p>
                    <div className="flex items-center text-yellow-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className="text-lg">★</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }
      return (
        <section className="py-12 bg-gray-50">
          <div className={`container mx-auto ${isMobilePreview ? '' : 'px-4'}`}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{merged.title}</h2>
              {merged.subtitle && <p className="text-lg text-gray-600">{merged.subtitle}</p>}
            </div>
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
                <div className="flex items-center mb-4">
                  <img src={(merged.items?.[0] as any)?.image} alt={(merged.items?.[0] as any)?.name} className="w-12 h-12 rounded-full mr-4" />
                  <div>
                    <h4 className="font-bold text-gray-900">{(merged.items?.[0] as any)?.name}</h4>
                    <p className="text-gray-600 text-sm">{(merged.items?.[0] as any)?.location}</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">{(merged.items?.[0] as any)?.text}</p>
                <div className="flex items-center text-yellow-500 mb-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className="text-lg">★</span>
                  ))}
                </div>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition">
                  {merged.buttonText}
                </button>
              </div>
            </div>
          </div>
        </section>
      );

    case 'benefits':
      return (
        <section className="py-16 bg-gray-50">
          <div className={`container mx-auto ${isMobilePreview ? '' : 'px-4'}`}>
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{merged.title}</h2>
            <div className={`grid ${isMobilePreview ? 'grid-cols-1' : 'grid-cols-3'} gap-8`}>
              {merged.items?.map((item: unknown, idx: number) => (
                <div key={idx} className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{(item as any).title}</h3>
                  <p className="text-gray-700">{(item as any).description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className="py-16 bg-blue-600 text-white">
          <div className={`container mx-auto text-center ${isMobilePreview ? '' : 'px-4'}`}>
            <h2 className="text-3xl font-bold mb-4">{merged.title}</h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">{merged.content}</p>
            <a href={merged.buttonLink} className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-2xl inline-block">
              {merged.buttonText}
            </a>
          </div>
        </section>
      );

    default:
      return null;
  }
};

const LeadPageEditor = () => {
  const { user, userData } = useAuth();
  const [template, setTemplate] = useState<LeadPageTemplate | null>(null);
  const [allTemplates, setAllTemplates] = useState<LeadPageTemplate[]>([]);
  const [userLeadPage, setUserLeadPage] = useState<UserLeadPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [leadPageStats, setLeadPageStats] = useState<any>(null);
  const [loadingLeadStats, setLoadingLeadStats] = useState(false);
  const [domainInstructionsExpanded, setDomainInstructionsExpanded] = useState(false);

  // Draft/Publish system
  const [viewMode, setViewMode] = useState<'draft' | 'published'>('draft'); // What we're currently viewing
  const [publishing, setPublishing] = useState(false);

  const toggleSectionExpand = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Helper function to get the correct template and data based on view mode
  const getCurrentTemplateAndData = () => {
    if (viewMode === 'published' && userLeadPage?.publishedTemplateId) {
      // Find the published template
      const publishedTemplate = allTemplates.find(t => t.id === userLeadPage.publishedTemplateId);
      return {
        template: publishedTemplate || template || allTemplates[0],
        userLeadPage: {
          ...userLeadPage,
          templateId: userLeadPage.publishedTemplateId,
          customData: userLeadPage.publishedCustomData || {}
        }
      };
    }
    // Draft mode - use current template and data
    return { template: template || allTemplates[0], userLeadPage };
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/${userData?.slug || user?.uid}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const handleSaveDomain = async () => {
    if (!user || !userLeadPage) return;

    const domain = userLeadPage.domain?.trim();
    if (!domain) {
      alert('Por favor, insira um domínio válido.');
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      alert('Formato de domínio inválido. Use apenas letras, números e hífens.');
      return;
    }

    try {
      // Verificar se o domínio já está configurado no Vercel
      const domainExists = await checkVercelDomain(domain);
      
      if (!domainExists) {
        // Tentar adicionar o domínio no Vercel automaticamente
        const added = await addVercelDomain(domain);
        if (!added) {
          alert('Domínio salvo, mas houve um problema ao configurá-lo automaticamente no Vercel. Você pode adicioná-lo manualmente no painel do Vercel.');
        }
      }

      const updated: UserLeadPage = {
        ...userLeadPage,
        domain: domain
      };

      await saveUserLeadPage(user.uid, updated);
      setUserLeadPage(updated);
      
      if (domainExists) {
        alert('Domínio salvo com sucesso! Ele já estava configurado no Vercel.');
      } else {
        alert('Domínio salvo e configurado automaticamente no Vercel! Agora configure o CNAME no seu provedor DNS.');
      }
    } catch (err) {
      console.error('Erro ao salvar domínio:', err);
      alert('Erro ao salvar domínio. Tente novamente.');
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
          customData: {},
          isPublished: false // Mark as having unpublished changes
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

  const handlePublish = async () => {
    if (!user || !userLeadPage) return;

    try {
      setPublishing(true);
      const published: UserLeadPage = {
        ...userLeadPage,
        publishedTemplateId: userLeadPage.templateId,
        publishedCustomData: { ...userLeadPage.customData },
        isPublished: true,
        lastPublishedAt: new Date()
      };
      await saveUserLeadPage(user.uid, published);
      setUserLeadPage(published);
    } catch (error) {
      console.error('Erro ao publicar:', error);
      alert('Erro ao publicar mudanças. Tente novamente.');
    } finally {
      setPublishing(false);
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

        // Todos os templates estão disponíveis no modelo freemium
        setAllTemplates(templates);

        if (data) {
          const userTemplate = await getTemplate(data.templateId);
          // Todos os templates estão disponíveis no modelo freemium
          if (userTemplate) {
            setTemplate(userTemplate);
            setUserLeadPage(data);
          } else {
            // Template não encontrado, usar template padrão
            const defaultTemplate = templates.find(t => t.id === 'default-modern') || templates[0];
            if (defaultTemplate) {
              setTemplate(defaultTemplate);
              const updated: UserLeadPage = {
                ...data,
                templateId: defaultTemplate.id
              };
              await saveUserLeadPage(user.uid, updated);
              setUserLeadPage(updated);
            }
          }
        } else {
          const defaultTemplate = templates.find(t => t.id === 'default-modern') || templates[0];
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

  useEffect(() => {
    if (user) {
      handleLoadLeadStats();
    }
  }, [user]);

  const handleLoadLeadStats = async () => {
    if (!user) return;
    try {
      setLoadingLeadStats(true);
      const stats = await getLeadPageStats(user.uid);
      const metrics = stats ? calculateLeadPageMetrics(stats) : null;
      setLeadPageStats(metrics);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoadingLeadStats(false);
    }
  };

  const handleSectionChange = async (sectionId: string, field: string, value: unknown) => {
    if (!user) return;
    const updated = { ...userLeadPage!.customData[sectionId], [field]: value };
    const updatedUserLeadPage = {
      ...userLeadPage!,
      customData: { ...userLeadPage!.customData, [sectionId]: updated },
      isPublished: false // Mark as having unpublished changes
    };
    setUserLeadPage(updatedUserLeadPage);

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
              
              {allTemplates.length > 1 && viewMode === 'draft' && (
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

              {/* Current Template Display for Published Mode */}
              {viewMode === 'published' && userLeadPage?.publishedTemplateId && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-800">
                    Modelo Publicados: {allTemplates.find(t => t.id === userLeadPage.publishedTemplateId)?.name || 'Desconhecido'}
                  </span>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'draft' | 'published')}
                  className="text-sm font-medium text-gray-900 bg-transparent border-none focus:ring-0 focus:outline-none"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
              </div>

              {/* Publish Button */}
              {userLeadPage && !userLeadPage.isPublished && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Publicar</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => window.open(`${window.location.origin}/${userData?.slug || user?.uid}`, '_blank')}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>Visualizar Página</span>
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
        {/* Editor and Preview Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sections Editor Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Palette className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Editor de Seções</h2>
                      <p className="text-sm text-gray-600">Personalize cada seção da sua página</p>
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

            {/* Domain Settings Card */}
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
                        onClick={handleSaveDomain}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition whitespace-nowrap"
                      >
                        Salvar Domínio
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      ⓘ Configure o CNAME do seu domínio para apontar para <code className="bg-gray-100 px-1 rounded">lucrazi.com.br</code>
                    </p>
                  </div>

                  {/* Accordion com orientações */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setDomainInstructionsExpanded(!domainInstructionsExpanded)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1 bg-blue-100 rounded">
                          <Globe className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">Como configurar seu domínio personalizado</span>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${domainInstructionsExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {domainInstructionsExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-green-800 mb-1">Resultado esperado</h4>
                                <p className="text-sm text-green-700">
                                  Após salvar, o domínio será configurado automaticamente no Vercel. Você só precisa configurar o CNAME no seu provedor DNS.
                                  Por exemplo: se você configurar <code>lead.seudominio.com.br</code>, sua lead page ficará disponível em
                                  <code>https://lead.seudominio.com.br</code>.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Passos para configuração:</h4>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <h5 className="font-medium text-green-800 mb-2">1. Salve seu domínio</h5>
                              <p className="text-sm text-green-700 mb-2">
                                Digite seu domínio personalizado acima e clique em "Salvar Domínio". O sistema irá configurá-lo automaticamente no Vercel.
                              </p>
                              <p className="text-xs text-green-600">
                                O domínio será adicionado automaticamente à sua conta Vercel.
                              </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <h5 className="font-medium text-blue-800 mb-2">2. Configure o DNS</h5>
                              <p className="text-sm text-blue-700 mb-2">
                                Após salvar, configure o CNAME no seu provedor de domínio (GoDaddy, Registro.br, etc.).
                              </p>
                              <p className="text-xs text-blue-600">
                                Use as configurações que aparecem no seu painel Vercel para o domínio.
                              </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <h5 className="font-medium text-blue-800 mb-2">4. Aguarde a propagação</h5>
                              <p className="text-sm text-blue-700 mb-2">
                                As mudanças de DNS podem levar até 48 horas para se propagarem globalmente.
                              </p>
                              <p className="text-xs text-blue-600">
                                Você pode verificar o status usando ferramentas online como "DNS Checker" ou "What's My DNS".
                              </p>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <h5 className="font-medium text-yellow-800 mb-2">⚠️ Dicas importantes</h5>
                              <ul className="text-xs text-yellow-700 space-y-1">
                                <li>• Se já existir um registro A ou CNAME para "@" ou "www", edite-o em vez de criar um novo</li>
                                <li>• Não remova outros registros DNS que já existam</li>
                                <li>• Se usar "www", certifique-se de que também funciona sem "www"</li>
                                <li>• Teste a configuração antes de considerar completa</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden sticky top-24">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-gray-700" />
                  <h3 className="font-semibold text-gray-900">
                    Pré-visualização Mobile {viewMode === 'draft' ? '(Rascunho)' : '(Publicado)'}
                  </h3>
                  {viewMode === 'published' && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Ao Vivo
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="bg-gray-100 rounded-2xl p-4 mx-auto max-w-lg">
                  <div className="bg-white rounded-xl overflow-hidden shadow-lg min-h-[600px] max-h-[700px] overflow-y-auto">
                    <div className="[&>*]:!rounded-none [&_section]:!py-6 [&_section]:!px-6 [&_.container]:!px-0">
                      {(() => {
                        const { template: currentTemplate, userLeadPage: currentData } = getCurrentTemplateAndData();
                        return currentTemplate ? currentTemplate.sections
                          .filter(section => {
                            const custom = currentData?.customData?.[section.id] || {};
                            const merged = { ...section, ...custom };
                            return merged.enabled !== false;
                          })
                          .map(section => (
                            <div key={section.id}>
                              {renderPreviewSection(section, currentData, true)}
                            </div>
                          )) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {(() => {
                  const { template: currentTemplate, userLeadPage: currentData } = getCurrentTemplateAndData();
                  return currentTemplate && currentTemplate.sections.filter(section => {
                    const custom = currentData?.customData?.[section.id] || {};
                    const merged = { ...section, ...custom };
                    return merged.enabled !== false;
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
                  );
                })()}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Estatísticas da Lead Page</h3>

                {/* Métricas principais */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {loadingLeadStats ? '...' : (leadPageStats?.totalViews || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Visualizações Totais</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {loadingLeadStats ? '...' : (leadPageStats?.leads || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Leads Gerados</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {loadingLeadStats ? '...' : `${(leadPageStats?.conversionRate || 0).toFixed(1)}%`}
                    </div>
                    <div className="text-sm text-gray-600">Taxa de Conversão</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {loadingLeadStats ? '...' : (leadPageStats?.clicks || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Cliques em Botões</div>
                  </div>
                </div>

                {/* Accordion com estatísticas detalhadas */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setDomainInstructionsExpanded(!domainInstructionsExpanded)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-blue-100 rounded">
                        <Eye className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">Analytics Detalhados</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${domainInstructionsExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {domainInstructionsExpanded && (
                    <div className="p-4 bg-white border-t border-gray-200">
                      <div className="space-y-6">
                        {/* Sessões e Engajamento */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-indigo-600">
                              {loadingLeadStats ? '...' : (leadPageStats?.totalSessions || 0)}
                            </div>
                            <div className="text-xs text-gray-600">Sessões Totais</div>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-orange-600">
                              {loadingLeadStats ? '...' : `${(leadPageStats?.bounceRate || 0).toFixed(1)}%`}
                            </div>
                            <div className="text-xs text-gray-600">Taxa de Rejeição</div>
                          </div>
                          <div className="bg-teal-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-teal-600">
                              {loadingLeadStats ? '...' : `${leadPageStats?.avgSessionDuration || 0}s`}
                            </div>
                            <div className="text-xs text-gray-600">Tempo Médio</div>
                          </div>
                          <div className="bg-pink-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-pink-600">
                              {loadingLeadStats ? '...' : (leadPageStats?.mostActiveHour || 'N/A')}
                            </div>
                            <div className="text-xs text-gray-600">Horário Mais Ativo</div>
                          </div>
                        </div>

                        {/* Top Fontes */}
                        {leadPageStats?.topSources && leadPageStats.topSources.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Top Fontes de Tráfego</h4>
                            <div className="space-y-1">
                              {leadPageStats.topSources.map((source: {name: string, value: number}, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{source.name}</span>
                                  <span className="font-medium text-gray-900">{source.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Dispositivos */}
                        {leadPageStats?.topDevices && leadPageStats.topDevices.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Dispositivos Mais Usados</h4>
                            <div className="space-y-1">
                              {leadPageStats.topDevices.map((device: {name: string, value: number}, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{device.name}</span>
                                  <span className="font-medium text-gray-900">{device.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Navegadores */}
                        {leadPageStats?.topBrowsers && leadPageStats.topBrowsers.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Navegadores Mais Usados</h4>
                            <div className="space-y-1">
                              {leadPageStats.topBrowsers.map((browser: {name: string, value: number}, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{browser.name}</span>
                                  <span className="font-medium text-gray-900">{browser.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Países */}
                        {leadPageStats?.topCountries && leadPageStats.topCountries.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Países dos Visitantes</h4>
                            <div className="space-y-1">
                              {leadPageStats.topCountries.map((country: {name: string, value: number}, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{country.name}</span>
                                  <span className="font-medium text-gray-900">{country.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadPageEditor;