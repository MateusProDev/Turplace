import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  doc, 
  getDoc, 
  getDocs,
  collection, 
  serverTimestamp,
  updateDoc,
  increment,
  addDoc,
  query,
  where
} from "firebase/firestore";
import { db, auth } from "../utils/firebase";
import { 
  MapPin, 
  Tag, 
  Clock, 
  Users, 
  Shield, 
  ChevronLeft,
  Share2,
  Eye,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Briefcase,
  Star,
  Lock
} from "lucide-react";

interface ServiceData {
  id: string;
  title: string;
  category: string;
  city: string;
  description: string;
  images: string[];
  whatsapp: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  status: string;
  type?: string;
  price?: string;
  duration?: string;
  capacity?: string;
  includes?: string[];
  views?: number;
  productType?: string;
  billingType?: string;
  priceMonthly?: string;
  stripeProductId?: string;
  priceId?: string;
  priceType?: string;
  rating?: number;
  bookings?: number;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

interface ProviderMiniProfile {
  name: string;
  email: string;
  photoURL?: string;
  since?: string;
  totalServices?: number;
}

// Importar diagnóstico apenas em desenvolvimento
if (import.meta.env.DEV) {
  import("../utils/diagnoseServices");
}

export default function ServiceDetail() {
  const { title } = useParams();
  const [service, setService] = useState<ServiceData | null>(null);
  const [provider, setProvider] = useState<ProviderMiniProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [views, setViews] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!title) {
      console.log("ServiceDetail: No title provided");
      return;
    }
    
    console.log("ServiceDetail: Loading service with title:", title);
    
    const loadService = async () => {
      try {
        setLoading(true);
        const decodedTitle = decodeURIComponent(title);
        console.log("ServiceDetail: Querying for title:", decodedTitle);
        const q = query(collection(db, "services"), where("title", "==", decodedTitle));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          console.log("ServiceDetail: Document found, data:", docSnap.data());
          const rawData = docSnap.data() as any;
          
          // Validar dados essenciais (menos rigoroso)
          if (!rawData.title) {
            console.error("ServiceDetail: Document missing title", rawData);
            setError("Serviço com dados incompletos");
            return;
          }
          
          const data: ServiceData = {
            id: docSnap.id,
            title: rawData.title || "Serviço sem título",
            category: rawData.category || "Geral",
            city: rawData.city || "",
            description: rawData.description || "Sem descrição",
            images: Array.isArray(rawData.images) ? rawData.images : [],
            whatsapp: rawData.whatsapp || "",
            ownerId: rawData.ownerId || "",
            ownerEmail: rawData.ownerEmail || "",
            ownerName: rawData.ownerName || "",
            status: rawData.status || "pending",
            type: rawData.type,
            price: rawData.price,
            duration: rawData.duration,
            capacity: rawData.capacity,
            includes: Array.isArray(rawData.includes) ? rawData.includes : [],
            views: rawData.views || 0,
            productType: rawData.productType,
            billingType: rawData.billingType,
            priceMonthly: rawData.priceMonthly,
            rating: rawData.rating || 0,
            bookings: rawData.bookings || 0
          };
          setService(data);
          setViews(data.views || 0);
          
          // Buscar mini perfil do provider
          if (data.ownerId) {
            console.log("ServiceDetail: Loading provider profile for ownerId:", data.ownerId);
            const userRef = doc(db, "users", data.ownerId);
            const userSnap = await getDoc(userRef);
            let totalServices = 0;
            if (userSnap.exists()) {
              console.log("ServiceDetail: Provider profile found");
              // Buscar quantos serviços esse provider tem
              const servicesSnap = await getDocs(collection(db, "services"));
              totalServices = servicesSnap.docs.filter((s: any) => s.data().ownerId === data.ownerId).length;
              setProvider({
                name: userSnap.data().name || data.ownerName,
                email: userSnap.data().email || data.ownerEmail,
                photoURL: userSnap.data().photoURL || '',
                since: userSnap.data().createdAt ? new Date(userSnap.data().createdAt.seconds * 1000).getFullYear().toString() : undefined,
                totalServices
              });
            } else {
              console.log("ServiceDetail: Provider profile not found, using service data");
              setProvider({
                name: data.ownerName,
                email: data.ownerEmail,
                totalServices: 1
              });
            }
          }
          
          // Incrementar visualizações (opcional - só se autenticado)
          if (auth.currentUser) {
            try {
              console.log("ServiceDetail: Incrementing views");
              await updateDoc(docSnap.ref, {
                views: increment(1),
                lastViewed: serverTimestamp()
              });
            } catch (viewError) {
              console.warn("ServiceDetail: Could not increment views (user not authenticated):", viewError);
              // Não é erro crítico, continua normalmente
            }
          } else {
            console.log("ServiceDetail: Skipping view increment (user not authenticated)");
          }
          
          // Buscar avaliações
          const reviewsRef = collection(db, "services", docSnap.id, "reviews");
          const reviewsSnap = await getDocs(reviewsRef);
          const reviewsData: Review[] = reviewsSnap.docs.map(doc => {
            const reviewData = doc.data();
            return {
              id: doc.id,
              userId: reviewData.userId || "",
              userName: reviewData.userName || "Usuário Anônimo",
              rating: reviewData.rating || 0,
              comment: reviewData.comment,
              createdAt: reviewData.createdAt?.toDate() || new Date()
            };
          });
          setReviews(reviewsData);
          
          // Verificar se o usuário atual já avaliou
          const currentUser = auth.currentUser;
          if (currentUser) {
            const userReview = reviewsData.find(review => review.userId === currentUser.uid);
            if (userReview) {
              setHasUserReviewed(true);
              setUserRating(userReview.rating);
              setUserReview(userReview.comment || '');
            }
          }
        } else {
          console.log("ServiceDetail: Document does not exist");
          setError("Serviço não encontrado");
        }
      } catch (err) {
        console.error("ServiceDetail: Error loading service:", err);
        const error = err as Error;
        console.error("ServiceDetail: Error details:", {
          message: error.message,
          code: (error as any).code,
          stack: error.stack
        });
        setError("Erro ao carregar os detalhes do serviço");
      } finally {
        setLoading(false);
      }
    };
    
    loadService();
  }, [title]);

  const handleContact = async () => {
    if (!service) return;

    setContacting(true);
    try {
      // Para serviços com preço, criar checkout direto sem autenticação
      if (service.price || service.priceMonthly) {
        // Criar sessão de checkout diretamente
        const response = await fetch('/api/create-checkout-session-guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceId: service.id,
            successUrl: `${window.location.origin}/success?serviceId=${service.id}`,
            cancelUrl: window.location.href
          })
        });

        if (!response.ok) {
          throw new Error('Erro ao criar sessão de checkout');
        }

        const { url } = await response.json();
        window.location.href = url;
      } else {
        // Para serviços sem preço, mostrar modal de contato
        setSuccess("Abrindo formulário de contato...");
        setTimeout(() => {
          // Por enquanto, vamos redirecionar para uma página de contato ou mostrar um alert
          alert("Funcionalidade de contato será implementada em breve. Entre em contato diretamente com o prestador.");
          setContacting(false);
          setSuccess(null);
        }, 1000);
      }

    } catch (err) {
      console.error("Erro ao processar contato:", err);
      setError("Erro ao processar. Tente novamente.");
      setContacting(false);
    }
  };

  const handleShare = async () => {
    if (!service) return;
    
    const shareData = {
      title: service.title,
      text: service.description?.substring(0, 100) + "...",
      url: window.location.href,
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setSuccess("Link copiado para a área de transferência!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando serviço...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || "Serviço não encontrado"}
          </h2>
          <p className="text-gray-600 mb-6">
            O serviço que você está procurando não está disponível ou foi removido.
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            <ChevronLeft size={20} />
            Voltar para o catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              to="/catalog"
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition"
            >
              <ChevronLeft size={20} />
              <span className="font-medium">Voltar ao catálogo</span>
            </Link>
            <div className="flex items-center gap-4">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                <Share2 size={18} />
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna da Esquerda - Imagens e Detalhes */}
          <div className="lg:col-span-2">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
              <Link to="/" className="hover:text-blue-600">Home</Link>
              <span>/</span>
              <Link to="/catalog" className="hover:text-blue-600">Catálogo</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{service.category}</span>
            </div>

            {/* Imagem Principal */}
            <div className="mb-6">
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-video">
                {service.images && service.images.length > 0 ? (
                  <img
                    src={service.images[selectedImage]}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Tag className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Sem imagem disponível</p>
                    </div>
                  </div>
                )}
                {service.status === "approved" && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <CheckCircle size={14} />
                      Ativo
                    </span>
                  </div>
                )}
              </div>

              {/* Miniaturas */}
              {service.images && service.images.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {service.images.map((url: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                        selectedImage === index 
                          ? 'border-blue-600 ring-2 ring-blue-100' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Informações Detalhadas */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.title}</h1>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Tag size={18} />
                  <span className="font-medium">{service.category}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={18} />
                  <span>{service.city}</span>
                </div>
                {service.type && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Tag size={18} />
                    <span>{service.type}</span>
                  </div>
                )}
                {views > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Eye size={18} />
                    <span>{views} visualizações</span>
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Descrição</h3>
                <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                  {service.description || "Este serviço não possui descrição detalhada."}
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {service.duration && (
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="text-emerald-600" size={24} />
                      <h4 className="font-bold text-gray-900">Duração</h4>
                    </div>
                    <p className="text-lg text-emerald-700">{service.duration}</p>
                  </div>
                )}

                {service.capacity && (
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="text-purple-600" size={24} />
                      <h4 className="font-bold text-gray-900">Capacidade</h4>
                    </div>
                    <p className="text-lg text-purple-700">{service.capacity}</p>
                  </div>
                )}

                {service.includes && Array.isArray(service.includes) && (
                  <div className="bg-amber-50 rounded-xl p-4 md:col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="text-amber-600" size={24} />
                      <h4 className="font-bold text-gray-900">O que está incluso</h4>
                    </div>
                    <ul className="space-y-1">
                      {service.includes.map((item: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-amber-700">
                          <CheckCircle size={16} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Aviso de Segurança */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Shield className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-bold text-yellow-800 mb-2">Dicas de segurança</h4>
                  <ul className="text-yellow-700 space-y-1 text-sm">
                    <li>• Verifique as avaliações e comentários dos clientes</li>
                    <li>• Leia atentamente a descrição e termos do serviço</li>
                    <li>• Use apenas a plataforma para pagamentos e comunicações</li>
                    <li>• Entre em contato com o suporte se tiver dúvidas</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna da Direita - Contato e Prestador */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card de Contato/Compra */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
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

              {(service.price || service.priceMonthly) && (
                <div className="text-left mb-4">
                  <div className="flex items-center justify-start gap-2 mb-2">
                    <DollarSign className="text-red-600" size={20} />
                    <span className="text-sm font-medium text-gray-600">Valor</span>
                  </div>
                  <div className="text-3xl font-bold text-red-700">
                    R$ {(() => {
                      const displayPrice = service.billingType === 'subscription' ? service.priceMonthly : service.price;
                      return displayPrice ? parseFloat(displayPrice.replace(',', '.'))?.toFixed(2).replace('.', ',') : '0,00';
                    })()}
                  </div>
                  <p className="text-xs text-gray-500">
                    {service.billingType === 'subscription' ? 'por mês' : 'valor único'}
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
                    {service.price || service.priceMonthly ? "Processando..." : "Conectando..."}
                  </>
                ) : (
                  <>
                    {service.price || service.priceMonthly ? "Pagar Agora" : "Contratar Serviço"}
                  </>
                )}
              </button>

              {/* Informações de Segurança */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-600">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">Pagamento 100% Seguro</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Lock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm">Protegido por criptografia SSL</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm">Garantia de reembolso</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <MapPin size={18} />
                    <span className="font-medium">Localização</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {service.city}
                  </p>
                  <p className="text-sm text-gray-600">
                    Atendimento nesta região
                  </p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  <Shield className="inline-block w-4 h-4 mr-1" />
                  {service.price || service.priceMonthly 
                    ? "Pagamento processado de forma segura pela plataforma"
                    : "Entre em contato de forma segura através da plataforma"}
                </p>
              </div>
            </div>

            {/* Mini Perfil do Prestador */}
            {provider && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Sobre o prestador</h3>
                <div className="flex items-center gap-4 mb-4">
                  {provider.photoURL ? (
                    <img src={provider.photoURL} alt={provider.name} className="w-16 h-16 rounded-full object-cover border-2 border-blue-200" />
                  ) : (
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {provider.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-gray-900">{provider.name}</h4>
                    <p className="text-sm text-gray-600">{provider.email}</p>
                    {provider.since && (
                      <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium mt-1">No marketplace desde {provider.since}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Briefcase size={16} className="text-blue-500" />
                  <span className="text-sm">{provider.totalServices || 1} serviço{provider.totalServices === 1 ? '' : 's'} publicado{provider.totalServices === 1 ? '' : 's'} no marketplace</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="text-sm">Prestador verificado</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MessageCircle size={16} className="text-blue-500" />
                    <span className="text-sm">Responde rapidamente</span>
                  </div>
                </div>
              </div>
            )}

            {/* Serviços Similares */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Talvez você também goste</h3>
              <div className="space-y-3">
                <Link
                  to="/catalog"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Tag className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-700">
                      Ver mais serviços em {service.city}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Explore outras opções disponíveis
                    </p>
                  </div>
                </Link>
                
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition group"
                >
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="text-emerald-600" size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-emerald-700">
                      Seja um prestador
                    </h4>
                    <p className="text-sm text-gray-600">
                      Cadastre seus serviços gratuitamente
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Avaliações */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliações dos Clientes</h2>
          
          {/* Formulário de Avaliação */}
          {auth.currentUser && !hasUserReviewed && (
            <div className="mb-8 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Deixe sua avaliação</h3>
              
              {/* Estrelas */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setUserRating(star)}
                    className="p-1 hover:scale-110 transition"
                  >
                    <Star
                      size={24}
                      className={`${
                        star <= userRating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {userRating > 0 && `${userRating} estrela${userRating > 1 ? 's' : ''}`}
                </span>
              </div>
              
              {/* Comentário */}
              <textarea
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                placeholder="Conte sua experiência com este serviço (opcional)"
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              
              {/* Botão de envio */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={async () => {
                    if (userRating === 0) {
                      setError("Por favor, selecione uma avaliação em estrelas");
                      return;
                    }
                    
                    setSubmittingReview(true);
                    try {
                      const reviewData: any = {
                        userId: auth.currentUser!.uid,
                        userName: auth.currentUser!.displayName || "Usuário Anônimo",
                        rating: userRating,
                        createdAt: serverTimestamp()
                      };
                      
                      if (userReview.trim()) {
                        reviewData.comment = userReview.trim();
                      }
                      
                      await addDoc(collection(db, "services", service!.id, "reviews"), reviewData);
                      
                      // Atualizar rating do serviço
                      const newReviews = [...reviews, { ...reviewData, id: 'temp', createdAt: new Date() }];
                      const avgRating = newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length;
                      
                      await updateDoc(doc(db, "services", service!.id), {
                        rating: avgRating,
                        bookings: newReviews.length
                      });
                      
                      setReviews(newReviews);
                      setHasUserReviewed(true);
                      setSuccess("Avaliação enviada com sucesso!");
                      
                      // Limpar campos
                      setUserRating(0);
                      setUserReview('');
                    } catch (err) {
                      console.error("Erro ao enviar avaliação:", err);
                      setError("Erro ao enviar avaliação. Tente novamente.");
                    } finally {
                      setSubmittingReview(false);
                    }
                  }}
                  disabled={submittingReview}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? "Enviando..." : "Enviar Avaliação"}
                </button>
              </div>
            </div>
          )}
          
          {hasUserReviewed && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">✓ Você já avaliou este serviço</p>
            </div>
          )}
          
          {/* Lista de Avaliações */}
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <Star className="mx-auto text-gray-300" size={48} />
                <p className="text-gray-500 mt-2">Nenhuma avaliação ainda</p>
                <p className="text-sm text-gray-400">Seja o primeiro a avaliar este serviço!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {review.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{review.userName}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={`${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {review.createdAt.toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 text-sm">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}