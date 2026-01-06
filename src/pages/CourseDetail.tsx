import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { generateSlug } from '../utils/slug';
import ShareContentService from '../services/shareContentService';
import { generateCustomDomainUrl } from '../utils/leadpage';
import {
  ArrowLeft,
  Clock,
  Users,
  Star,
  Play,
  BookOpen,
  CheckCircle,
  ShoppingCart,
  Heart,
  DollarSign,
  Share2
} from 'lucide-react';

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
  price?: string;
  priceMonthly?: string;
  billingType?: 'one-time' | 'subscription';
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

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacting, setContacting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!slug) {
        setError('Slug não fornecido');
        setLoading(false);
        return;
      }

      try {
        // Buscar todos os cursos publicados
        const coursesRef = collection(db, 'courses');
        const q = query(coursesRef, where('status', '==', 'published'));
        const snapshot = await getDocs(q);

        // Encontrar o curso pelo slug do título
        const courseDoc = snapshot.docs.find(doc => {
          const courseData = doc.data() as Course;
          const courseSlug = generateSlug(courseData.title);
          return courseSlug === slug;
        });

        if (courseDoc) {
          const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
          setCourse(courseData);
          
          console.log('[CourseDetail] Curso carregado:', courseDoc.id, 'views atuais:', courseData.views);
          
          // Incrementar views apenas 1x por sessão (sessionStorage)
          // Essa lógica garante contagem mesmo quando o usuário acessa diretamente
          const sessionKey = 'viewedCoursesSession';
          let viewedCourses: string[] = [];
          try {
            viewedCourses = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
            if (!Array.isArray(viewedCourses)) viewedCourses = [];
          } catch {
            viewedCourses = [];
          }

          if (!viewedCourses.includes(courseDoc.id)) {
            try {
              const courseRef = doc(db, 'courses', courseDoc.id);
              // Se views não existe, inicializa com 0 antes de incrementar
              if (typeof courseData.views !== 'number') {
                console.log('[CourseDetail] Inicializando campo views para curso:', courseDoc.id);
                await updateDoc(courseRef, { views: 1 });
              } else {
                console.log('[CourseDetail] Incrementando views para curso:', courseDoc.id);
                await updateDoc(courseRef, { views: increment(1) });
              }
              viewedCourses.push(courseDoc.id);
              sessionStorage.setItem(sessionKey, JSON.stringify(viewedCourses));
              setCourse((prev) => (prev ? { ...prev, views: (prev.views || 0) + 1 } : prev));
              console.log('[CourseDetail] ✓ Views incrementado com sucesso');
            } catch (e) {
              console.error('[CourseDetail] ✗ Falha ao incrementar views:', e);
            }
          } else {
            console.log('[CourseDetail] Curso já visualizado nesta sessão:', courseDoc.id);
          }
        } else {
          setError('Curso não encontrado');
        }
      } catch (err) {
        console.error('Erro ao carregar o curso:', err);
        setError('Erro ao carregar o curso');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [slug]);

  const handleContact = async () => {
    if (!course) return;

    setContacting(true);
    try {
      // Para cursos com preço, redirecionar para checkout
      if (course.price || course.priceMonthly) {
        window.location.href = `/checkout?courseId=${course.id}`;
        return;
      } else {
        // Para cursos sem preço, mostrar mensagem
        setSuccess("Este curso será gratuito em breve!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Erro ao processar:", err);
      setError("Erro ao processar. Tente novamente.");
    } finally {
      setContacting(false);
    }
  };

  const handleShare = async () => {
    if (!course) return;

    try {
      const shareContentService = new ShareContentService();
      let shareUrl;

      // Se temos o instructorId, tentar gerar URL personalizada nativa
      if (course.instructorId) {
        try {
          shareUrl = await generateCustomDomainUrl(course.instructorId, `curso/${generateSlug(course.title)}`);
        } catch (customDomainError) {
          console.warn('Erro ao gerar URL personalizada, usando URL padrão:', customDomainError);
          shareUrl = window.location.href;
        }
      } else {
        // Fallback para URL padrão se não temos instructorId
        shareUrl = window.location.href;
      }

      // Tentar criar link curto com ShareContent (opcional)
      let shortLink;
      try {
        shortLink = await shareContentService.createShortLink(
          shareUrl,
          course.title,
          `curso-${generateSlug(course.title)}`,
          true // useFallback = true
        );
      } catch (shareContentError) {
        console.warn('ShareContent não disponível, usando URL nativa:', shareContentError);
        shortLink = { short_url: shareUrl };
      }

      const shareData = {
        title: course.title,
        text: course.description?.substring(0, 100) + "...",
        url: shortLink.short_url,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shortLink.short_url || window.location.href);
        setSuccess("Link copiado para a área de transferência!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
      // Fallback
      try {
        if (navigator.share) {
          await navigator.share({
            title: course.title,
            text: course.description?.substring(0, 100) + "...",
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          setSuccess("Link copiado para a área de transferência!");
          setTimeout(() => setSuccess(null), 3000);
        }
      } catch (fallbackErr) {
        console.error("Erro no fallback:", fallbackErr);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Curso não encontrado</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/catalog"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Voltar ao Catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={20} />
            Voltar ao catálogo
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conteúdo Principal */}
          <div className="lg:col-span-2">
            {/* Imagem do Curso */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
              {course.image ? (
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <BookOpen className="text-blue-400" size={64} />
                </div>
              )}
            </div>

            {/* Informações do Curso */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="text-yellow-400 fill-current" size={16} />
                  <span className="font-semibold">{course.rating || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Users size={16} />
                  <span>{course.views || 0} visualizações</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock size={16} />
                  <span>{course.modules?.reduce((total, module) => total + module.sections.length, 0) || 0} aulas</span>
                </div>
              </div>

              <div className="prose max-w-none">
                <div className={`text-gray-700 leading-relaxed ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
                  {course.description}
                </div>
                {course.description && course.description.length > 200 && (
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 transition-colors"
                  >
                    {isDescriptionExpanded ? 'Ver menos' : 'Ver mais'}
                  </button>
                )}
              </div>
            </div>

            {/* Módulos do Curso */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Conteúdo do Curso</h2>

              <div className="space-y-6">
                {course.modules?.map((module, moduleIndex) => (
                  <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-lg">
                        {moduleIndex + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                        {module.description && (
                          <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 ml-13">
                      {module.sections.map((section, sectionIndex) => (
                        <div
                          key={section.id}
                          className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center font-semibold text-xs">
                            {moduleIndex + 1}.{sectionIndex + 1}
                          </div>

                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{section.title}</h4>
                            {section.description && (
                              <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                            )}
                          </div>

                          {section.duration && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock size={14} />
                              {section.duration}
                            </div>
                          )}

                          <Play className="text-blue-600" size={18} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {success}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {(course.price || course.priceMonthly) && (
                <div className="text-left mb-4">
                  <div className="flex items-center justify-start gap-2 mb-2">
                    <DollarSign className="text-red-600" size={20} />
                    <span className="text-sm font-medium text-gray-600">Valor</span>
                  </div>
                  <div className="text-3xl font-bold text-red-700">
                    R$ {(() => {
                      const displayPrice = course.billingType === 'subscription' ? course.priceMonthly : course.price;
                      return displayPrice ? parseFloat(String(displayPrice).replace(',', '.'))?.toFixed(2).replace('.', ',') : '0,00';
                    })()}
                  </div>
                  <p className="text-xs text-gray-500">
                    {course.billingType === 'subscription' ? 'por mês' : 'valor único'}
                  </p>
                </div>
              )}

              <button
                onClick={handleContact}
                disabled={contacting}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg mb-4"
              >
                {contacting ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    {course.price || course.priceMonthly ? "Comprar Agora" : "Acessar Curso"}
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2 mb-4"
              >
                <Share2 size={20} />
                Compartilhar
              </button>

              <button className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2">
                <Heart size={20} />
                Adicionar aos Favoritos
              </button>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Este curso inclui:</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm">Acesso vitalício</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm">{course.modules?.reduce((total, module) => total + module.sections.length, 0) || 0} aulas em vídeo</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm">Certificado de conclusão</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm">Suporte do instrutor</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}