import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUserLeadPage, getDefaultTemplate, getTemplate, trackLeadPageView, trackLeadPageSessionEnd, trackLeadPageClick, trackLeadPageLead } from '../utils/leadpage';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import type { LeadPageTemplate, UserLeadPage, LeadPageSection } from '../types/leadpage';

interface LeadPageProps {
  customDomain?: string;
  previewMode?: boolean;
  previewTemplate?: LeadPageTemplate;
  previewUserData?: UserLeadPage;
  previewUser?: any;
  forceMobile?: boolean;
  selectedSectionId?: string | null;
  onSectionSelect?: (sectionId: string | null) => void;
}

const LeadPage: React.FC<LeadPageProps> = ({ 
  customDomain, 
  previewMode = false, 
  previewTemplate, 
  previewUserData, 
  previewUser,
  forceMobile = false,
  selectedSectionId,
  onSectionSelect
}) => {
  const { userSlug } = useParams<{ userSlug: string }>();
  const { domain: routeDomain } = useParams<{ domain: string }>();

  // Usar customDomain se fornecido, senão usar o da rota
  const domain = customDomain || routeDomain;
  
  // Se o userSlug começa com "lead/", extrair o slug real (para compatibilidade com URLs antigas)
  const actualSlug = userSlug?.startsWith('lead/') ? userSlug.substring(5) : userSlug;
  const [template, setTemplate] = useState<LeadPageTemplate | null>(null);
  const [userData, setUserData] = useState<UserLeadPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [forceMobilePreview, setForceMobilePreview] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Função para detectar e buscar usuário por domínio personalizado
  const getUserByCustomDomain = async (hostname: string) => {
    try {
      // Primeiro, buscar diretamente na coleção leadPages (nova estrutura)
      const leadPagesRef = collection(db, "leadPages");
      let leadPageQuery = query(leadPagesRef, where("domain", "==", hostname));
      let leadPageSnapshot = await getDocs(leadPageQuery);

      if (!leadPageSnapshot.empty) {
        const leadPageDoc = leadPageSnapshot.docs[0];
        const userId = leadPageDoc.id;

        // Buscar dados do usuário
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          return { uid: userId, ...userDoc.data() };
        }
      }

      // Tentar remover subdomínios comuns (www, lead, etc.)
      const domainParts = hostname.split('.');
      if (domainParts.length > 2) {
        const domainWithoutSubdomain = domainParts.slice(-2).join('.');
        leadPageQuery = query(leadPagesRef, where("domain", "==", domainWithoutSubdomain));
        leadPageSnapshot = await getDocs(leadPageQuery);

        if (!leadPageSnapshot.empty) {
          const leadPageDoc = leadPageSnapshot.docs[0];
          const userId = leadPageDoc.id;

          // Buscar dados do usuário
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            return { uid: userId, ...userDoc.data() };
          }
        }
      }

      // Tentar sem "www" se hostname começar com "www"
      if (hostname.startsWith('www.')) {
        const domainWithoutWww = hostname.substring(4);
        const leadPageQueryNoWww = query(leadPagesRef, where("domain", "==", domainWithoutWww));
        const leadPageSnapshotNoWww = await getDocs(leadPageQueryNoWww);

        if (!leadPageSnapshotNoWww.empty) {
          const leadPageDoc = leadPageSnapshotNoWww.docs[0];
          const userId = leadPageDoc.id;

          // Buscar dados do usuário
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            return { uid: userId, ...userDoc.data() };
          }
        }
      }

      // Fallback: buscar na estrutura antiga (users/{userId}/leadpage/data)
      console.log('Tentando buscar na estrutura antiga...');
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);

      for (const userDoc of usersSnapshot.docs) {
        try {
          const leadPageRef = doc(db, "users", userDoc.id, "leadpage", "data");
          const leadPageSnap = await getDoc(leadPageRef);

          if (leadPageSnap.exists()) {
            const leadPageData = leadPageSnap.data();
            if (leadPageData.domain === hostname) {
              return { uid: userDoc.id, ...userDoc.data() };
            }
          }
        } catch (error) {
          // Ignorar erros individuais
        }
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar usuário por domínio personalizado:', error);
      return null;
    }
  };

  // Função para lidar com cliques em botões CTA
  const handleButtonClick = async (_e: React.MouseEvent, buttonLink: string) => {
    if (user) {
      try {
        await trackLeadPageClick(user.uid);
      } catch (error) {
        console.error('Error tracking click:', error);
      }
    }
    // Se o link é WhatsApp, considerar como lead
    if (buttonLink.includes('wa.me') || buttonLink.includes('whatsapp.com') || buttonLink.includes('api.whatsapp.com')) {
      try {
        await trackLeadPageLead(user.uid, sessionId);
      } catch (error) {
        console.error('Error tracking lead:', error);
      }
    }
  };

  // Função para buscar usuário por slug ou ID
  const getUserBySlugOrId = async (slugOrId: string) => {
    try {
      // Primeiro tenta buscar por slug
      const slugQuery = query(collection(db, "users"), where("slug", "==", slugOrId));
      const slugSnapshot = await getDocs(slugQuery);
      
      if (!slugSnapshot.empty) {
        const userDoc = slugSnapshot.docs[0];
        return { uid: userDoc.id, ...userDoc.data() };
      }
      
      // Se não encontrou por slug, tenta buscar diretamente pelo ID (para compatibilidade com UIDs legados)
      try {
        const userDoc = await getDocs(query(collection(db, "users")));
        const foundUser = userDoc.docs.find(doc => doc.id === slugOrId);
        if (foundUser) {
          return { uid: foundUser.id, ...foundUser.data() };
        }
      } catch (error) {
        console.error('Error fetching user by UID:', error);
      }
      
      // Se ainda não encontrou, assume que é um UID legado (fallback)
      console.log('User not found by slug or UID, assuming legacy UID:', slugOrId);
      return { uid: slugOrId };
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  };

  // Detecta se é mobile baseado no tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      if (previewMode && forceMobile !== undefined) {
        setIsMobile(forceMobile);
        setForceMobilePreview(forceMobile);
        return;
      }

      const width = window.innerWidth;
      // Mobile: < 768px (1 coluna)
      // Desktop: >= 768px (3 colunas)
      const isActuallyMobile = width < 768;
      console.log('Screen width:', width, 'isMobile:', isActuallyMobile, 'grid-cols:', isActuallyMobile ? '1' : '3');
      setIsMobile(isActuallyMobile);
      setForceMobilePreview(isActuallyMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [previewMode, forceMobile]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Se estiver em modo preview, usar dados passados via props
        if (previewMode) {
          setTemplate(previewTemplate || null);
          setUserData(previewUserData || null);
          setUser(previewUser || null);
          setLoading(false);
          return;
        }

        let foundUser = null;

        // Primeiro, verificar se é acesso via domínio personalizado
        const hostname = window.location.hostname;
        const isCustomDomain = hostname !== 'lucrazi.com.br' && hostname !== 'localhost' && !hostname.includes('vercel.app');

        if (isCustomDomain && !actualSlug) {
          // Acesso direto via domínio personalizado (sem slug na URL)
          foundUser = await getUserByCustomDomain(hostname);
        } else if (domain) {
          // Acesso via rota /custom/:domain (redirecionamento)
          foundUser = await getUserByCustomDomain(domain);
        } else if (actualSlug) {
          // Acesso via URL padrão com slug
          foundUser = await getUserBySlugOrId(actualSlug);
        }

        if (!foundUser) {
          console.error('Usuário não encontrado');
          setLoading(false);
          return;
        }
        
        setUser(foundUser);
        
        const data = await getUserLeadPage(foundUser.uid);

        // Use published data if available, otherwise use draft data
        const displayData = data?.publishedTemplateId ? {
          ...data,
          templateId: data.publishedTemplateId,
          customData: data.publishedCustomData || {}
        } : data;

        console.log('LeadPage Debug:', {
          domain,
          hasPublishedData: !!data?.publishedTemplateId,
          publishedTemplateId: data?.publishedTemplateId,
          draftTemplateId: data?.templateId,
          displayTemplateId: displayData?.templateId,
          isUsingPublished: !!data?.publishedTemplateId
        });

        // Load the correct template based on displayData
        const [tmpl] = await Promise.all([
          displayData?.templateId ? getTemplate(displayData.templateId).catch(() => getDefaultTemplate()) : getDefaultTemplate()
        ]);

        setTemplate(tmpl);
        setUserData(displayData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [actualSlug, domain, previewMode, previewTemplate, previewUserData, previewUser]);

  // Tracking de visualizações
  useEffect(() => {
    if (!user || loading) return;

    // Registrar visualização
    const trackView = async () => {
      try {
        const device = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
        const source = document.referrer ? new URL(document.referrer).hostname : 'direct';
        
        await trackLeadPageView(user.uid, sessionId, source, device);
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    trackView();

    // Registrar quando o usuário sai da página
    const handleBeforeUnload = () => {
      trackLeadPageSessionEnd(user.uid, sessionId).catch(error => {
        console.error('Error tracking session end:', error);
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, loading, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando página...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Template não encontrado</h1>
          <p className="text-gray-600">O template da página não está disponível no momento.</p>
        </div>
      </div>
    );
  }

  const renderSection = (section: LeadPageSection) => {
    const custom = userData?.customData?.[section.id] || {};
    const merged = { ...section, ...custom };
    if (!merged.enabled) return null;

    // Wrapper para preview mode com seções clicáveis
    const SectionWrapper = ({ children }: { children: React.ReactNode }) => {
      if (!previewMode) return <>{children}</>;

      const isSelected = selectedSectionId === section.id;

      return (
        <div
          className={`relative group cursor-pointer transition-all duration-200 ${
            isSelected 
              ? 'border-2 border-blue-500 bg-blue-50 bg-opacity-10' 
              : 'border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 hover:bg-opacity-10'
          }`}
          onClick={() => {
            onSectionSelect?.(section.id);
          }}
        >
          {/* Indicador visual de seção editável */}
          <div className={`absolute -top-2 -left-2 text-xs px-2 py-1 rounded-full font-medium transition-opacity duration-200 z-10 ${
            isSelected 
              ? 'bg-blue-500 text-white opacity-100' 
              : 'bg-blue-500 text-white opacity-0 group-hover:opacity-100'
          }`}>
            {section.type}
          </div>

          {/* Overlay sutil para indicar interatividade */}
          <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 pointer-events-none" />

          {children}
        </div>
      );
    };

    switch (merged.type) {
      case 'hero':
        // Hero Moderno com Stats (Versão Mobile First)
        if (merged.stats) {
          return (
            <SectionWrapper>
              <section className="relative min-h-[90vh] md:min-h-screen flex items-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white overflow-hidden">
                {merged.image && (
                  <div className="absolute inset-0">
                    <img 
                      src={merged.image} 
                      alt="Hero Background" 
                      className="w-full h-full object-cover opacity-20" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                  </div>
                )}
                <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
                  <div className="max-w-4xl mx-auto text-center">
                    {merged.subtitle && (
                      <p className="text-sm md:text-base mb-3 md:mb-4 text-blue-200 font-light">
                        {merged.subtitle}
                      </p>
                    )}
                    
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black mb-4 md:mb-6 leading-tight break-words">
                      {merged.title}
                    </h1>
                    
                    <p className="text-xs md:text-sm lg:text-base mb-6 md:mb-8 max-w-3xl mx-auto text-blue-100 px-2">
                      {merged.content}
                    </p>

                    {/* Stats Grid - Empilhado em mobile */}
                    {merged.stats && (
                      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4 md:gap-8 mb-8 md:mb-12`}>
                        {merged.stats.map((stat: string, idx: number) => (
                          <div 
                            key={idx} 
                            className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-300"
                          >
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1">
                              {stat.split(' ')[0]}
                            </div>
                            <div className="text-blue-200 text-sm md:text-base">
                              {stat.split(' ').slice(1).join(' ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CTA Button com responsividade */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center">
                      <a
                        href={merged.buttonLink}
                        onClick={(e) => merged.buttonLink && handleButtonClick(e, merged.buttonLink)}
                        className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-sm md:text-base transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
                      >
                        {merged.buttonText}
                      </a>
                      {merged.urgencyText && (
                        <div className="text-red-300 font-semibold animate-pulse text-sm md:text-base">
                          {merged.urgencyText}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </SectionWrapper>
          );
        }

        // Hero Padrão
        return (
          <SectionWrapper>
            <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 md:py-20">
              <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 md:mb-6 break-words">
                    {merged.title}
                  </h1>
                  <p className="text-sm md:text-base mb-6 md:mb-8 max-w-2xl mx-auto">
                    {merged.content}
                  </p>
                  {merged.image && (
                    <img
                      src={merged.image}
                      alt="Hero"
                      className="mx-auto mb-6 md:mb-8 rounded-lg shadow-lg w-full max-w-md object-cover"
                      loading="lazy"
                    />
                  )}
                  <a
                    href={merged.buttonLink}
                    onClick={(e) => merged.buttonLink && handleButtonClick(e, merged.buttonLink)}
                    className="inline-block bg-white text-blue-600 px-6 py-3 md:px-8 md:py-4 rounded-lg font-semibold hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm md:text-base"
                  >
                    {merged.buttonText}
                  </a>
                </div>
              </div>
            </section>
          </SectionWrapper>
        );

      case 'about':
        return (
          <SectionWrapper>
            <section className="py-12 md:py-16 bg-gray-50">
              <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                  <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                    {/* Imagem acima em mobile, ao lado em desktop */}
                    {merged.image && (
                      <div className="w-full md:w-1/2 order-1 md:order-2">
                        <img
                          src={merged.image}
                          alt="About"
                          className="w-full rounded-xl shadow-lg object-cover aspect-square md:aspect-video"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className={`w-full ${merged.image ? 'md:w-1/2' : 'md:w-full'} order-2 md:order-1`}>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900">
                        {merged.title}
                      </h2>
                      <div className="prose prose-lg max-w-none">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {merged.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </SectionWrapper>
        );

      case 'benefits':
        // Pricing Cards - Empilhados em mobile
        if ((merged.items?.[0] as any)?.price) {
          return (
            <section className="py-12 md:py-20 bg-gradient-to-b from-gray-50 to-white">
              <div className="container mx-auto px-4">
                <div className="text-center mb-8 md:mb-16">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                    {merged.title}
                  </h2>
                  {merged.subtitle && (
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                      {merged.subtitle}
                    </p>
                  )}
                </div>
                
                {/* Cards empilhados em mobile, lado a lado em desktop */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 max-w-6xl mx-auto">
                  {(merged as any).items?.map((item: unknown, idx: number) => (
                    <div 
                      key={idx} 
                      className={`flex-1 bg-white rounded-2xl shadow-xl p-6 md:p-8 hover:shadow-2xl transition-all duration-300 ${
                        (item as any).popular 
                          ? 'ring-2 md:ring-4 ring-blue-500 transform md:scale-105 order-first md:order-none' 
                          : ''
                      }`}
                    >
                      {(item as any).popular && (
                        <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold">
                          MAIS POPULAR
                        </div>
                      )}
                      
                      <div className="text-center pt-4">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                          {(item as any).title}
                        </h3>
                        
                        {(item as any).subtitle && (
                          <p className="text-gray-600 mb-4 text-sm md:text-base">
                            {(item as any).subtitle}
                          </p>
                        )}
                        
                        <div className="mb-4 md:mb-6">
                          <span className="text-3xl md:text-4xl font-black text-gray-900">
                            {(item as any).price}
                          </span>
                          {(item as any).period && (
                            <span className="text-gray-600 text-lg md:text-xl">
                              /{(item as any).period}
                            </span>
                          )}
                        </div>
                        
                        <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8 text-left">
                          {(item as any).features?.map((feature: string, fidx: number) => (
                            <li key={fidx} className="flex items-start">
                              <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-gray-700 text-sm md:text-base">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        <button className={`w-full py-3 md:py-4 px-4 md:px-6 rounded-lg font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${
                          (item as any).popular 
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' 
                            : 'bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-900 text-white'
                        }`}>
                          {(item as any).cta || (item as any).buttonText || 'Começar Agora'}
                        </button>
                        
                        {(item as any).bonus && (
                          <p className="text-green-600 font-semibold mt-3 md:mt-4 text-sm md:text-base">
                            {(item as any).bonus}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        // Grid de Destinos/Serviços
        if ((merged.items?.[0] as any)?.image || (merged.items?.[0] as any)?.features) {
          return (
            <section className="py-12 md:py-20 bg-white">
              <div className="container mx-auto px-4">
                <div className="text-center mb-8 md:mb-16">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                    {merged.title}
                  </h2>
                  {merged.subtitle && (
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                      {merged.subtitle}
                    </p>
                  )}
                </div>
                
                {/* Grid empilhado em mobile (1 coluna), 2-3 colunas em desktop */}
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6 md:gap-8`}>
                  {(merged as any).items?.map((item: unknown, idx: number) => (
                    <div 
                      key={idx} 
                      className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
                    >
                      {(item as any).image && (
                        <div className="relative overflow-hidden h-48 md:h-56">
                          <img 
                            src={(item as any).image} 
                            alt={(item as any).title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                      )}
                      
                      <div className="p-5 md:p-6">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                          {(item as any).title}
                        </h3>
                        
                        {(item as any).description && (
                          <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">
                            {(item as any).description}
                          </p>
                        )}
                        
                        {(item as any).price && (
                          <p className="text-2xl md:text-3xl font-bold text-blue-600 mb-3">
                            {(item as any).price}
                          </p>
                        )}
                        
                        {(item as any).features && (
                          <ul className="space-y-2 mt-4">
                            {(item as any).features.map((feature: string, fidx: number) => (
                              <li key={fidx} className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></span>
                                <span className="text-gray-600 text-sm md:text-base">{feature}</span>
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

        // Benefits Padrão - Lista de Vantagens
        return (
          <section className="py-12 md:py-16 bg-gradient-to-b from-white to-gray-50">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                  <div className="w-full md:w-1/2">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-6 md:mb-8 text-gray-900">
                      {merged.title}
                    </h2>
                    
                    <div className="space-y-4 md:space-y-6">
                      {merged.items?.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                              {typeof item === 'string' ? item : (item as any).title || (item as any).description || item}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {merged.image && (
                    <div className="w-full md:w-1/2">
                      <div className="relative">
                        <img
                          src={merged.image}
                          alt="Benefits"
                          className="w-full rounded-xl shadow-lg object-cover aspect-video md:aspect-square"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-xl"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'social-proof':
        // Testimonials com Vídeo
        if ((merged.items?.[0] as any)?.video) {
          return (
            <section className="py-12 md:py-20 bg-gradient-to-b from-gray-50 to-white">
              <div className="container mx-auto px-4">
                <div className="text-center mb-8 md:mb-16">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                    {merged.title}
                  </h2>
                  {merged.subtitle && (
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                      {merged.subtitle}
                    </p>
                  )}
                </div>
                
                {/* Testimonials Grid - 1 coluna mobile, 2-3 desktop */}
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6 md:gap-8 max-w-6xl mx-auto`}>
                  {(merged as any).items?.map((item: unknown, idx: number) => (
                    <div 
                      key={idx} 
                      className="bg-white rounded-xl shadow-lg p-5 md:p-6 hover:shadow-2xl transition-shadow duration-300"
                    >
                      <div className="flex items-center mb-4">
                        <img 
                          src={(item as any).image} 
                          alt={(item as any).name} 
                          className="w-12 h-12 md:w-14 md:h-14 rounded-full mr-4 border-2 border-white shadow-md"
                          loading="lazy"
                        />
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm md:text-base">
                            {(item as any).name}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {(item as any).location}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-4 text-sm md:text-base italic leading-relaxed">
                        "{(item as any).text}"
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-green-600 font-bold text-sm md:text-base">
                          {(item as any).result}
                        </span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i} 
                              className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-current" 
                              viewBox="0 0 20 20"
                            >
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

        // Social Proof Padrão - Depoimentos
        return (
          <section className="py-12 md:py-16 bg-gradient-to-b from-gray-50 to-white">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                  <div className="w-full md:w-1/2">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-6 md:mb-8 text-gray-900">
                      {merged.title}
                    </h2>
                    
                    <div className="space-y-5 md:space-y-6">
                      {merged.items?.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white p-5 md:p-6 rounded-xl shadow-lg border-l-4 border-blue-500"
                        >
                          <div className="flex items-start">
                            <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-500 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                            </svg>
                            <blockquote className="text-gray-700 text-sm md:text-base leading-relaxed italic">
                              "{typeof item === 'string' ? item : ((item as any).text || (item as any).title || (item as any).description || JSON.stringify(item))}"
                            </blockquote>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {merged.image && (
                    <div className="w-full md:w-1/2">
                      <div className="relative rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={merged.image}
                          alt="Social Proof"
                          className="w-full object-cover aspect-video md:aspect-square"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'cta': {
        // CTA Responsivo com Background
        const bgStyle = merged.backgroundColor
          ? { backgroundColor: merged.backgroundColor }
          : merged.backgroundImage
          ? { 
              backgroundImage: `url(${merged.backgroundImage})`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center',
              backgroundAttachment: isMobile ? 'scroll' : 'fixed'
            }
          : {};

        return (
          <section 
            className="py-12 md:py-20 text-white relative overflow-hidden"
            style={bgStyle}
          >
            {/* Overlay para legibilidade */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-purple-900/80"></div>
            
            <div className="relative z-10 container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                  <div className="w-full md:w-1/2 text-center md:text-left">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4">
                      {merged.title}
                    </h2>
                    
                    {merged.subtitle && (
                      <p className="text-lg md:text-xl mb-3 md:mb-4 text-blue-100">
                        {merged.subtitle}
                      </p>
                    )}
                    
                    <p className="text-sm md:text-base mb-6 md:mb-8 text-white/90">
                      {merged.content}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center md:justify-start items-center">
                      <a 
                        href={merged.buttonLink}
                        onClick={(e) => merged.buttonLink && handleButtonClick(e, merged.buttonLink)}
                        className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-sm md:text-base transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
                      >
                        {merged.buttonText}
                      </a>
                      
                      {merged.urgencyText && (
                        <div className="text-red-300 font-semibold animate-pulse text-sm md:text-base">
                          {merged.urgencyText}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {merged.image && (
                    <div className="w-full md:w-1/2">
                      <div className="relative">
                        <img
                          src={merged.image}
                          alt="CTA"
                          className="w-full rounded-xl shadow-2xl object-cover aspect-video md:aspect-square"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-xl"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      }

      case 'contact':
        return (
          <section className="py-12 md:py-16 bg-gradient-to-b from-white to-gray-50">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                  <div className="w-full md:w-1/2">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900">
                      {merged.title}
                    </h2>

                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
                      <div className="prose prose-lg max-w-none">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {merged.content}
                        </p>
                      </div>
                    </div>
                  </div>

                  {merged.image && (
                    <div className="w-full md:w-1/2">
                      <img
                        src={merged.image}
                        alt="Contact"
                        className="w-full rounded-xl shadow-lg object-cover aspect-video md:aspect-square"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      // MODERN 2025 SECTIONS
      case 'hero-modern':
        return (
          <section className="min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            {/* Elementos decorativos - ocultos em mobile para performance */}
            <div className="hidden md:block absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
            <div className="hidden md:block absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="hidden md:block absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
            <div className="relative z-10 container mx-auto px-4 py-16 md:py-20">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black mb-4 md:mb-6 leading-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent break-words">
                  {merged.title}
                </h1>
                <p className="text-sm sm:text-base md:text-xl mb-3 md:mb-4 text-blue-200 font-light max-w-2xl mx-auto px-2">
                  {merged.subtitle}
                </p>
                <p className="text-sm sm:text-sm md:text-base mb-6 md:mb-8 text-slate-300 max-w-3xl mx-auto leading-relaxed px-2">
                  {merged.content}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
                  <a href={merged.buttonLink} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all transform hover:scale-105 shadow-2xl hover:shadow-blue-500/25 text-center">
                    {merged.buttonText}
                  </a>
                </div>
              </div>
            </div>
          </section>
        );

      case 'features-modern':
        return (
          <section className="py-12 md:py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6 md:gap-8`}>
                {merged.features?.map((feature: any, idx: number) => (
                  <div key={idx} className="group bg-gradient-to-br from-slate-50 to-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 hover:border-blue-200">
                    <div className="text-3xl md:text-4xl mb-3 md:mb-4 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">{feature.title}</h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'pricing-modern':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6 md:gap-8 max-w-6xl mx-auto`}>
                {merged.plans?.map((plan: any, idx: number) => (
                  <div key={idx} className={`relative bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${plan.popular ? 'border-blue-500 scale-105' : 'border-slate-200'}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-bold">
                        MAIS POPULAR
                      </div>
                    )}
                    <div className="text-center mb-4 md:mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="text-3xl md:text-4xl font-black text-blue-600 mb-1">{plan.price}</div>
                      <div className="text-sm md:text-base text-gray-500">{plan.period}</div>
                    </div>
                    <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                      {plan.features?.map((feature: string, featureIdx: number) => (
                        <li key={featureIdx} className="flex items-center text-sm md:text-base text-gray-700">
                          <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <a href="#signup" className={`w-full py-3 px-6 rounded-xl font-bold text-center block transition-all duration-300 text-sm md:text-base ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-blue-500/25' : 'bg-slate-100 text-gray-900 hover:bg-slate-200'}`}>
                      {plan.buttonText}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta-modern':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            {/* Elementos decorativos - ocultos em mobile para performance */}
            <div className="hidden md:block absolute top-0 left-0 w-full h-full">
              <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full opacity-5 animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-24 h-24 bg-white rounded-full opacity-5 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            <div className="relative z-10 container mx-auto text-center px-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4 px-2">{merged.title}</h2>
              <p className="text-sm sm:text-base md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto text-blue-100 px-2">{merged.subtitle}</p>
              <a href={merged.buttonLink} className="bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
                {merged.buttonText}
              </a>
            </div>
          </section>
        );

      case 'hero-luxury':
        return (
          <section className="min-h-screen flex items-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-orange-100/20 to-yellow-100/20"></div>
            <div className="relative z-10 container mx-auto px-4 py-16 md:py-20">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black mb-4 md:mb-6 leading-tight text-gray-900 px-2 break-words">
                  {merged.title}
                </h1>
                <p className="text-sm sm:text-base md:text-xl mb-3 md:mb-4 text-amber-700 font-medium max-w-2xl mx-auto px-2">
                  {merged.subtitle}
                </p>
                <p className="text-sm sm:text-sm md:text-base mb-6 md:mb-8 text-gray-700 max-w-3xl mx-auto leading-relaxed px-2">
                  {merged.content}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
                  <a href={merged.buttonLink} className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all transform hover:scale-105 shadow-2xl hover:shadow-amber-500/25 text-center">
                    {merged.buttonText}
                  </a>
                </div>
              </div>
            </div>
          </section>
        );

      case 'products-showcase':
        return (
          <section className="py-12 md:py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6 md:gap-8`}>
                {merged.products?.map((product: any, idx: number) => (
                  <div key={idx} className="group bg-white p-4 md:p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 hover:border-amber-200">
                    <div className="aspect-square mb-3 md:mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-sm md:text-base text-gray-600 mb-3">{product.description}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm md:text-base font-bold text-amber-600">{product.price}</span>
                        {product.originalPrice && (
                          <span className="text-xs md:text-sm text-gray-500 line-through">{product.originalPrice}</span>
                        )}
                      </div>
                      <button className="bg-amber-600 hover:bg-amber-700 text-white px-3 md:px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base">
                        Comprar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials-luxury':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-br from-amber-50 to-orange-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6 md:gap-8 max-w-4xl mx-auto`}>
                {merged.testimonials?.map((testimonial: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-amber-100">
                    <div className="flex items-center mb-3 md:mb-4">
                      <img src={testimonial.avatar} alt={testimonial.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full mr-3 md:mr-4 border-2 border-amber-200" />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{testimonial.name}</h4>
                        <p className="text-xs md:text-sm text-amber-600">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="text-sm md:text-base text-gray-700 italic leading-relaxed">"{testimonial.content}"</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta-luxury':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-800 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="relative z-10 container mx-auto text-center px-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4 px-2">{merged.title}</h2>
              <p className="text-sm sm:text-base md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto text-amber-100 px-2">{merged.subtitle}</p>
              <a href={merged.buttonLink} className="bg-white text-amber-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:bg-amber-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
                {merged.buttonText}
              </a>
            </div>
          </section>
        );

      case 'hero-disruptive':
        return (
          <section className="min-h-screen flex items-center bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
            {/* Elementos decorativos - ocultos em mobile para performance */}
            <div className="hidden md:block absolute top-20 right-20 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="hidden md:block absolute bottom-20 left-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '3s' }}></div>
            <div className="relative z-10 container mx-auto px-4 py-16 md:py-20">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black mb-4 md:mb-6 leading-tight bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-transparent px-2 break-words">
                  {merged.title}
                </h1>
                <p className="text-sm sm:text-base md:text-xl mb-3 md:mb-4 text-emerald-200 font-light max-w-2xl mx-auto px-2">
                  {merged.subtitle}
                </p>
                <p className="text-sm sm:text-sm md:text-base mb-6 md:mb-8 text-slate-300 max-w-3xl mx-auto leading-relaxed px-2">
                  {merged.content}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
                  <a href={merged.buttonLink} className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all transform hover:scale-105 shadow-2xl hover:shadow-emerald-500/25 text-center">
                    {merged.buttonText}
                  </a>
                </div>
              </div>
            </div>
          </section>
        );

      case 'mission-vision':
        return (
          <section className="py-12 md:py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-8 md:gap-12 max-w-6xl mx-auto`}>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 md:p-8 rounded-2xl border border-emerald-200">
                  <h3 className="text-xl md:text-2xl font-bold text-emerald-800 mb-3 md:mb-4">Missão</h3>
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed">{merged.mission}</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 md:p-8 rounded-2xl border border-cyan-200">
                  <h3 className="text-xl md:text-2xl font-bold text-cyan-800 mb-3 md:mb-4">Visão</h3>
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed">{merged.vision}</p>
                </div>
              </div>
              <div className="mt-8 md:mt-12 text-center">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 px-2">Nossos Valores</h3>
                <div className="flex flex-wrap justify-center gap-3 md:gap-4 px-4">
                  {merged.values?.map((value: string, idx: number) => (
                    <span key={idx} className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white px-3 md:px-4 py-2 rounded-full font-medium text-sm md:text-base">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );

      case 'team-showcase':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-br from-slate-50 to-gray-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6 md:gap-8 max-w-4xl mx-auto`}>
                {merged.team?.map((member: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200">
                    <div className="flex items-center mb-4 md:mb-6">
                      <img src={member.avatar} alt={member.name} className="w-12 h-12 md:w-16 md:h-16 rounded-full mr-3 md:mr-4 border-2 border-emerald-200" />
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-gray-900">{member.name}</h3>
                        <p className="text-sm md:text-base text-emerald-600 font-medium">{member.role}</p>
                      </div>
                    </div>
                    <p className="text-sm md:text-base text-gray-700 leading-relaxed">{member.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta-disruptive':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-800 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="relative z-10 container mx-auto text-center px-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4 px-2">{merged.title}</h2>
              <p className="text-sm sm:text-base md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto text-emerald-100 px-2">{merged.subtitle}</p>
              <a href={merged.buttonLink} className="bg-white text-emerald-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:bg-emerald-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
                {merged.buttonText}
              </a>
            </div>
          </section>
        );

      case 'hero-creative':
        return (
          <section className="min-h-screen flex items-center bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            {/* Elementos decorativos - ocultos em mobile para performance */}
            <div className="hidden md:block absolute top-20 left-20 w-72 h-72 bg-violet-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
            <div className="hidden md:block absolute top-40 right-20 w-72 h-72 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="hidden md:block absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
            <div className="relative z-10 container mx-auto px-4 py-16 md:py-20">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black mb-4 md:mb-6 leading-tight bg-gradient-to-r from-white via-violet-100 to-fuchsia-100 bg-clip-text text-transparent px-2 break-words">
                  {merged.title}
                </h1>
                <p className="text-sm sm:text-base md:text-xl mb-3 md:mb-4 text-violet-200 font-light max-w-2xl mx-auto px-2">
                  {merged.subtitle}
                </p>
                <p className="text-sm sm:text-sm md:text-base mb-6 md:mb-8 text-slate-300 max-w-3xl mx-auto leading-relaxed px-2">
                  {merged.content}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
                  <a href={merged.buttonLink} className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all transform hover:scale-105 shadow-2xl hover:shadow-violet-500/25 text-center">
                    {merged.buttonText}
                  </a>
                </div>
              </div>
            </div>
          </section>
        );

      case 'portfolio-showcase':
        return (
          <section className="py-12 md:py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6 md:gap-8`}>
                {merged.projects?.map((project: any, idx: number) => (
                  <div key={idx} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
                      <img src={project.image} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-4 md:p-6">
                      <div className="flex items-center justify-between mb-2 md:mb-3">
                        <span className="bg-violet-100 text-violet-800 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium">
                          {project.category}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{project.title}</h3>
                      <p className="text-sm md:text-base text-gray-600 leading-relaxed">{project.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'services-creative':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-br from-slate-50 to-violet-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6 md:gap-8`}>
                {merged.services?.map((service: any, idx: number) => (
                  <div key={idx} className="group bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 hover:border-violet-200">
                    <div className="text-3xl md:text-4xl mb-3 md:mb-4 text-violet-600 group-hover:scale-110 transition-transform duration-300">
                      {service.icon}
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">{service.title}</h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">{service.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta-creative':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-800 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="relative z-10 container mx-auto text-center px-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4 px-2">{merged.title}</h2>
              <p className="text-sm sm:text-base md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto text-violet-100 px-2">{merged.subtitle}</p>
              <a href={merged.buttonLink} className="bg-white text-violet-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:bg-violet-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
                {merged.buttonText}
              </a>
            </div>
          </section>
        );

      case 'hero-wellness':
        return (
          <section className="min-h-screen flex items-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-100/20 via-pink-100/20 to-purple-100/20"></div>
            <div className="relative z-10 container mx-auto px-4 py-16 md:py-20">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black mb-4 md:mb-6 leading-tight text-gray-900 px-2 break-words">
                  {merged.title}
                </h1>
                <p className="text-sm sm:text-base md:text-xl mb-3 md:mb-4 text-rose-700 font-medium max-w-2xl mx-auto px-2">
                  {merged.subtitle}
                </p>
                <p className="text-sm sm:text-sm md:text-base mb-6 md:mb-8 text-gray-700 max-w-3xl mx-auto leading-relaxed px-2">
                  {merged.content}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
                  <a href={merged.buttonLink} className="w-full sm:w-auto bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all transform hover:scale-105 shadow-2xl hover:shadow-rose-500/25 text-center">
                    {merged.buttonText}
                  </a>
                </div>
              </div>
            </div>
          </section>
        );

      case 'services-wellness':
        return (
          <section className="py-12 md:py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6 md:gap-8`}>
                {merged.services?.map((service: any, idx: number) => (
                  <div key={idx} className="group bg-gradient-to-br from-rose-50 to-pink-50 p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-rose-200 hover:border-rose-300">
                    <div className="text-3xl md:text-4xl mb-3 md:mb-4 text-rose-600 group-hover:scale-110 transition-transform duration-300">
                      {service.icon}
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">{service.title}</h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">{service.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials-wellness':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-br from-rose-50 to-pink-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6 md:gap-8 max-w-4xl mx-auto`}>
                {merged.testimonials?.map((testimonial: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-rose-100">
                    <div className="flex items-center mb-3 md:mb-4">
                      <img src={testimonial.avatar} alt={testimonial.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full mr-3 md:mr-4 border-2 border-rose-200" />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{testimonial.name}</h4>
                        <p className="text-xs md:text-sm text-rose-600 font-medium">{testimonial.transformation}</p>
                      </div>
                    </div>
                    <p className="text-sm md:text-base text-gray-700 italic leading-relaxed">"{testimonial.content}"</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta-wellness':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-800 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="relative z-10 container mx-auto text-center px-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4 px-2">{merged.title}</h2>
              <p className="text-sm sm:text-base md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto text-rose-100 px-2">{merged.subtitle}</p>
              <a href={merged.buttonLink} className="bg-white text-rose-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:bg-rose-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
                {merged.buttonText}
              </a>
            </div>
          </section>
        );

      case 'hero-financial':
        return (
          <section className="min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            {/* Elementos decorativos - ocultos em mobile para performance */}
            <div className="hidden md:block absolute top-20 right-20 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
            <div className="hidden md:block absolute bottom-20 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '3s' }}></div>
            <div className="relative z-10 container mx-auto px-4 py-16 md:py-20">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black mb-4 md:mb-6 leading-tight bg-gradient-to-r from-white via-emerald-100 to-blue-100 bg-clip-text text-transparent px-2 break-words">
                  {merged.title}
                </h1>
                <p className="text-sm sm:text-base md:text-xl mb-3 md:mb-4 text-emerald-200 font-light max-w-2xl mx-auto px-2">
                  {merged.subtitle}
                </p>
                <p className="text-sm sm:text-sm md:text-base mb-6 md:mb-8 text-slate-300 max-w-3xl mx-auto leading-relaxed px-2">
                  {merged.content}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
                  <a href={merged.buttonLink} className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all transform hover:scale-105 shadow-2xl hover:shadow-emerald-500/25 text-center">
                    {merged.buttonText}
                  </a>
                </div>
              </div>
            </div>
          </section>
        );

      case 'investment-options':
        return (
          <section className="py-12 md:py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6 md:gap-8`}>
                {merged.options?.map((option: any, idx: number) => (
                  <div key={idx} className="group bg-gradient-to-br from-slate-50 to-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 hover:border-emerald-200">
                    <div className="text-center mb-4 md:mb-6">
                      <div className="text-3xl md:text-4xl mb-3 md:mb-4 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                        {option.icon}
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{option.type}</h3>
                      <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">{option.description}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-500">Risco:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.risk === 'Baixo' ? 'bg-green-100 text-green-800' : option.risk === 'Médio-Alto' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {option.risk}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-500">Retorno:</span>
                          <span className="text-emerald-600 font-semibold text-sm md:text-base">{option.return}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'success-stories':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-br from-slate-50 to-emerald-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6 md:gap-8 max-w-4xl mx-auto`}>
                {merged.stories?.map((story: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-emerald-100">
                    <div className="flex items-center mb-3 md:mb-4">
                      <img src={story.avatar} alt={story.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full mr-3 md:mr-4 border-2 border-emerald-200" />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{story.name}</h4>
                        <p className="text-xs md:text-sm text-emerald-600 font-medium">{story.achievement}</p>
                      </div>
                    </div>
                    <p className="text-sm md:text-base text-gray-700 italic leading-relaxed">"{story.content}"</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta-financial':
        return (
          <section className="py-12 md:py-20 bg-gradient-to-r from-emerald-600 via-blue-600 to-emerald-800 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="relative z-10 container mx-auto text-center px-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4 px-2">{merged.title}</h2>
              <p className="text-sm sm:text-base md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto text-emerald-100 px-2">{merged.subtitle}</p>
              <a href={merged.buttonLink} className="bg-white text-emerald-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:bg-emerald-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
                {merged.buttonText}
              </a>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className={previewMode ? "w-full" : "min-h-screen"}>
      {/* Indicador de Preview Mobile */}
      {forceMobilePreview && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Preview Mobile</span>
        </div>
      )}
      
      {template.sections.map(renderSection)}
      
      {/* Footer Padrão */}
      <footer className="bg-gray-900 text-white py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              <p className="text-sm md:text-base">
                © {new Date().getFullYear()} Lead Page. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex gap-4">
              <a href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                Privacidade
              </a>
              <a href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                Termos
              </a>
              <a href="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">
                Contato
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LeadPage;
