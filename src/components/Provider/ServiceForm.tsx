import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../utils/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from "firebase/firestore";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { useAuth } from "../../hooks/useAuth";
import { 
  Camera, 
  MapPin, 
  Tag, 
  Phone, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Image as ImageIcon,
  Edit2,
  Trash2
} from "lucide-react";

interface Service {
  id: string;
  title: string;
  type: string;
  category: string;
  city: string;
  description: string;
  whatsapp: string;
  images: string[];
  status: string;
  createdAt: Timestamp;
}

export default function ServiceForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    type: "Turismo",
    category: "",
    city: "",
    description: "",
    whatsapp: "",
    price: ""
  });
  
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [myServices, setMyServices] = useState<Service[]>([]);

  // Buscar serviços do usuário
  useEffect(() => {
    async function fetchMyServices() {
      if (!user) return;
      try {
        const q = query(collection(db, "services"), where("ownerId", "==", user.uid));
        const snap = await getDocs(q);
        const services = snap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Service[];
        setMyServices(services);
      } catch (err) {
        console.error("Erro ao buscar serviços:", err);
      }
    }
    fetchMyServices();
  }, [user, success]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Limitar a 5 imagens
    if (files.length > 5) {
      setError("Máximo de 5 imagens permitido.");
      return;
    }
    
    // Validar tamanho das imagens (max 5MB cada)
    const oversized = files.find(file => file.size > 5 * 1024 * 1024);
    if (oversized) {
      setError("Algumas imagens são muito grandes (máximo 5MB cada).");
      return;
    }
    
    setImages(files);
    setImagePreviews(files.map(file => URL.createObjectURL(file)));
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const validateForm = () => {
    // Campos obrigatórios
    if (!form.title || !form.type || !form.category || !form.city || !form.description || !form.whatsapp) {
      setError("Preencha todos os campos obrigatórios (*).");
      return false;
    }
    
    // Validação do WhatsApp
    const whatsappClean = form.whatsapp.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(whatsappClean)) {
      setError("Informe um WhatsApp válido (apenas números, com DDD).");
      return false;
    }
    
    // Limite de caracteres
    if (form.title.length > 100) {
      setError("O título deve ter no máximo 100 caracteres.");
      return false;
    }
    
    if (form.description.length > 2000) {
      setError("A descrição deve ter no máximo 2000 caracteres.");
      return false;
    }
    
    // Formatação do WhatsApp
    setForm(prev => ({
      ...prev,
      whatsapp: whatsappClean
    }));
    
    setError(null);
    return true;
  };

  // Lista expandida de palavras proibidas
  const forbiddenWords = [
    "palavrão", "ofensa", "idiota", "burro", "merda", "porra", "caralho", 
    "puta", "bosta", "fdp", "otário", "vagabundo", "lixo", "desgraça", 
    "imbecil", "palhaço", "corno", "macaco", "viado", "racista", "preconceito",
    "shit", "fuck", "asshole", "bitch", "ass", "nigga", "nigger", "bastard"
  ];

  const containsForbidden = (text: string) => {
    const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return forbiddenWords.some(w => lower.includes(w));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!validateForm()) return;
    
    // Análise de conteúdo
    const allText = `${form.title} ${form.category} ${form.city} ${form.description}`;
    if (containsForbidden(allText)) {
      setError("Seu anúncio contém conteúdo inadequado. Revise as informações.");
      return;
    }
    
    setLoading(true);
    
    try {
      if (!user) {
        alert("Você precisa estar logado para cadastrar um serviço.");
        navigate("/login");
        return;
      }
      
      let imageUrls: string[] = [];
      
      // Upload das imagens
      if (images.length > 0) {
        imageUrls = await Promise.all(
          images.map(async (file) => {
            try {
              return await uploadToCloudinary(file);
            } catch (err) {
              console.error("Erro no upload da imagem:", err);
              return "";
            }
          })
        );
        
        // Filtrar URLs vazias
        imageUrls = imageUrls.filter(url => url !== "");
      }
      
      // Preparar dados para o Firestore
      const serviceData = {
        ...form,
        images: imageUrls,
        ownerId: user.uid,
        ownerEmail: user.email,
        ownerName: user.displayName || "Anônimo",
        status: "approved",
        views: 0,
        leads: 0,
        featured: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        price: form.price || "Sob consulta"
      };
      
      // Salvar no Firestore
      await addDoc(collection(db, "services"), serviceData);
      
      // Limpar formulário
      setForm({
        title: "",
        type: "Turismo",
        category: "",
        city: "",
        description: "",
        whatsapp: "",
        price: ""
      });
      setImages([]);
      setImagePreviews([]);
      
      setSuccess("Serviço cadastrado com sucesso! Agora ele está disponível na plataforma.");
      setLoading(false);
      
      // Scroll para o topo
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (err: any) {
      console.error("Erro ao cadastrar serviço:", err);
      setError(err.message || "Erro ao cadastrar serviço. Tente novamente.");
      setLoading(false);
    }
  };

  // Categorias sugeridas para turismo
  const tourismCategories = [
    "Passeios Guiados", "Transporte Turístico", "Hospedagem", "Gastronomia",
    "Aventura", "Ecoturismo", "Cultura Local", "City Tour", "Tour Fotográfico",
    "Eventos", "Roteiros Personalizados", "Traslados", "Aluguel de Equipamentos"
  ];

  const types = [
    { value: "Turismo", label: "🏖️ Turismo" },
    { value: "Artes", label: "🎨 Artes" },
    { value: "Criação de Sites", label: "💻 Criação de Sites" },
    { value: "Consultoria", label: "📊 Consultoria" },
    { value: "Gastronomia", label: "🍽️ Gastronomia" },
    { value: "Transporte", label: "🚗 Transporte" },
    { value: "Hospedagem", label: "🏨 Hospedagem" },
    { value: "Outro", label: "🔧 Outro" }
  ];

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-8 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Acesso Restrito</h2>
        <p className="text-gray-600 mb-6">
          Você precisa estar logado para cadastrar um serviço.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Fazer Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Cadastrar Novo Serviço
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Preencha os dados do seu serviço para aparecer no marketplace. 
          <span className="text-blue-600 font-semibold"> Gratuito e sem mensalidade!</span>
        </p>
      </div>

      {/* Formulário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-gray-100"
          >
            {/* Feedback Messages */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="text-green-600" size={24} />
                <div>
                  <p className="font-semibold text-green-800">{success}</p>
                  <p className="text-green-600 text-sm mt-1">
                    Seu serviço já está disponível no catálogo.
                  </p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="text-red-600" size={24} />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="inline-block w-4 h-4 mr-2" />
                  Título do Serviço *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Ex: Tour Gastronômico em São Paulo"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  maxLength={100}
                  required
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {form.title.length}/100 caracteres
                </div>
              </div>

              {/* Tipo e Categoria */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Tag className="inline-block w-4 h-4 mr-2" />
                  Tipo de Serviço *
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                >
                  {types.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Tag className="inline-block w-4 h-4 mr-2" />
                  Categoria *
                </label>
                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  list="categories"
                  placeholder="Escolha ou digite uma categoria"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
                <datalist id="categories">
                  {tourismCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Localização */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="inline-block w-4 h-4 mr-2" />
                  Cidade/Estado *
                </label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Ex: São Paulo, SP"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="inline-block w-4 h-4 mr-2" />
                  WhatsApp *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    +55
                  </div>
                  <input
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
                    placeholder="11999999999"
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Apenas números, com DDD
                </p>
              </div>

              {/* Preço */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  💰 Valor (opcional)
                </label>
                <input
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="Ex: R$ 150 por pessoa | A partir de R$ 300 | Sob consulta"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              {/* Descrição */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="inline-block w-4 h-4 mr-2" />
                  Descrição Detalhada *
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Descreva seu serviço em detalhes: o que inclui, duração, público-alvo, diferenciais..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition min-h-[150px] resize-none"
                  maxLength={2000}
                  required
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {form.description.length}/2000 caracteres
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  💡 Dica: Seja detalhado! Inclua horários, localização, o que está incluso, etc.
                </div>
              </div>

              {/* Upload de Imagens */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Camera className="inline-block w-4 h-4 mr-2" />
                  Imagens do Serviço
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium text-gray-700">
                      Clique para adicionar imagens
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Formatos: JPG, PNG, WEBP • Máximo: 5MB cada • Recomendado: 3-5 imagens
                    </p>
                  </label>
                </div>
                
                {/* Pré-visualização das imagens */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {imagePreviews.length} imagem(ns) selecionada(s):
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {imagePreviews.map((src, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={src}
                            alt={`Preview ${i + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botão de Envio */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Cadastrar Serviço
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                Ao cadastrar, você concorda com nossos Termos de Uso e Políticas da plataforma.
              </p>
            </div>
          </form>
        </div>

        {/* Sidebar - Meus Serviços */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 pb-3 border-b flex items-center gap-2">
              <Edit2 size={20} />
              Meus Serviços ({myServices.length})
            </h3>
            
            {myServices.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Tag className="text-gray-400" size={24} />
                </div>
                <p className="text-gray-600">
                  Você ainda não possui serviços cadastrados
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {myServices.map((service) => (
                  <div 
                    key={service.id} 
                    className="border rounded-lg p-4 hover:border-blue-300 transition cursor-pointer"
                    onClick={() => navigate(`/service/${service.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 line-clamp-1">
                          {service.title}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Tag size={12} />
                          <span>{service.category}</span>
                          <MapPin size={12} className="ml-2" />
                          <span>{service.city}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            service.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : service.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {service.status === 'approved' ? '✓ Ativo' : 
                             service.status === 'rejected' ? '✗ Rejeitado' : 
                             '⏳ Pendente'}
                          </span>
                          {service.images && service.images.length > 0 && (
                            <span className="text-xs text-gray-500">
                              📷 {service.images.length} imagem(ns)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  📈 Dicas para seu anúncio
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Use imagens de alta qualidade</li>
                  <li>• Descreva todos os detalhes do serviço</li>
                  <li>• Responda rapidamente aos contatos</li>
                  <li>• Mantenha seu WhatsApp ativo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}