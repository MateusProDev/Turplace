import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  doc, 
  getDoc, 
  addDoc, 
  collection, 
  serverTimestamp,
  updateDoc,
  increment 
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { 
  Phone, 
  MapPin, 
  Tag, 
  Clock, 
  Users, 
  Shield, 
  Star, 
  ChevronLeft,
  Share2,
  Eye,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  DollarSign
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
}

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [views, setViews] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const loadService = async () => {
      try {
        setLoading(true);
        const ref = doc(db, "services", id);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          const data = { 
            id: snap.id, 
            ...snap.data() 
          } as ServiceData;
          
          setService(data);
          setViews(data.views || 0);
          
          // Incrementar visualizações
          await updateDoc(ref, {
            views: increment(1),
            lastViewed: serverTimestamp()
          });
        } else {
          setError("Serviço não encontrado");
        }
      } catch (err) {
        console.error("Erro ao carregar serviço:", err);
        setError("Erro ao carregar os detalhes do serviço");
      } finally {
        setLoading(false);
      }
    };
    
    loadService();
  }, [id]);

  const handleContact = async () => {
    if (!service) return;
    
    setContacting(true);
    try {
      // Registrar lead
      await addDoc(collection(db, "leads"), {
        serviceId: service.id,
        serviceTitle: service.title,
        ownerId: service.ownerId,
        ownerEmail: service.ownerEmail,
        ownerName: service.ownerName,
        origem: "service_detail",
        status: "pending",
        createdAt: serverTimestamp(),
        contactedAt: null,
        viewed: false
      });

      // Formatar mensagem do WhatsApp
      const message = `Olá! Vi seu serviço "${service.title}" no Turplace e gostaria de mais informações.`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappNumber = service.whatsapp.replace(/\D/g, '');
      const waUrl = `https://wa.me/55${whatsappNumber}?text=${encodedMessage}`;
      
      setSuccess("Redirecionando para o WhatsApp...");
      setTimeout(() => {
        window.open(waUrl, "_blank");
        setContacting(false);
        setSuccess(null);
      }, 1000);
      
    } catch (err) {
      console.error("Erro ao registrar lead:", err);
      setError("Erro ao iniciar contato. Tente novamente.");
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

  const whatsappNumber = service.whatsapp?.replace(/\D/g, '');
  const formattedWhatsApp = whatsappNumber 
    ? `(${whatsappNumber.substring(0,2)}) ${whatsappNumber.substring(2,7)}-${whatsappNumber.substring(7)}`
    : "Não informado";

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
                {service.price && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="text-blue-600" size={24} />
                      <h4 className="font-bold text-gray-900">Valor</h4>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{service.price}</p>
                  </div>
                )}

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
                    <li>• Combine encontros em locais públicos</li>
                    <li>• Verifique as referências do prestador</li>
                    <li>• Não faça pagamentos antecipados sem garantias</li>
                    <li>• Desconfie de valores muito abaixo do mercado</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna da Direita - Contato e Prestador */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card de Contato */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Entre em contato</h3>
                <p className="text-gray-600">
                  Respondemos rapidamente pelo WhatsApp
                </p>
              </div>

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

              <button
                onClick={handleContact}
                disabled={contacting}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg mb-4"
              >
                {contacting ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Conectando...
                  </>
                ) : (
                  <>
                    <Phone size={24} />
                    Falar no WhatsApp
                  </>
                )}
              </button>

              <div className="space-y-4 mb-6">
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Phone size={18} />
                    <span className="font-medium">WhatsApp</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {formattedWhatsApp}
                  </p>
                </div>

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
                  Seu contato está protegido e só será compartilhado após sua autorização
                </p>
              </div>
            </div>

            {/* Card do Prestador */}
            {service.ownerName && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Sobre o prestador</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {service.ownerName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{service.ownerName}</h4>
                    <p className="text-sm text-gray-600">{service.ownerEmail}</p>
                  </div>
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
                  <div className="flex items-center gap-2 text-gray-600">
                    <Star size={16} className="text-yellow-500" />
                    <span className="text-sm">Participa do marketplace desde 2024</span>
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
    </div>
  );
}