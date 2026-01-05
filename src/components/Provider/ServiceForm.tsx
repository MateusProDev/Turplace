import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../utils/firebase";
import { generateSlug } from "../../utils/slug";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  Timestamp,
  updateDoc,
  doc
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
  slug?: string;
  type: string;
  category: string;
  city: string;
  description: string;
  whatsapp: string;
  images: string[];
  status: string;
  createdAt: Timestamp;
  price?: string;
  productType?: string;
  billingType?: string;
  priceMonthly?: string;
  views?: number;
  leads?: number;
  featured?: boolean;
}

interface ServiceFormProps {
  editMode?: boolean;
  serviceData?: Service;
  onClose?: () => void;
}

export default function ServiceForm({ editMode = false, serviceData, onClose }: ServiceFormProps) {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: editMode && serviceData ? serviceData.title || "" : "",
    type: editMode && serviceData ? serviceData.type || "Turismo" : "Turismo",
    category: editMode && serviceData ? serviceData.category || "" : "",
    city: editMode && serviceData ? serviceData.city || "" : "",
    description: editMode && serviceData ? serviceData.description || "" : "",
    whatsapp: editMode && serviceData ? serviceData.whatsapp || "" : "",
    price: editMode && serviceData ? serviceData.price || "" : "",
    productType: editMode && serviceData ? serviceData.productType || "service" : "service",
    billingType: editMode && serviceData ? serviceData.billingType || "one-time" : "one-time",
    priceMonthly: editMode && serviceData ? serviceData.priceMonthly || "" : ""
  });
  
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(editMode && serviceData ? serviceData.images || [] : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [myServices, setMyServices] = useState<Service[]>([]);

  // Verificar se o prestador está configurado para receber pagamentos
  const isMPConnected = userData?.mpConnected === true;
  const hasPixKey = userData?.chavePix && userData.chavePix.length > 0;
  const canCreateProducts = isMPConnected && hasPixKey;

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
    const { name, value } = e.target;

    if (name === 'type') {
      // Limpar categoria quando o tipo muda
      setForm({ ...form, [name]: value, category: "" });
    } else {
      setForm({ ...form, [name]: value });
    }
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
    "shit", "fuck", "asshole", "bitch", "nigga", "nigger", "bastard"
  ];

  const containsForbidden = (text: string) => {
    const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const word of forbiddenWords) {
      if (lower.includes(word)) {
        return word;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!validateForm()) return;
    
    // Análise de conteúdo
    const allText = `${form.title} ${form.category} ${form.city} ${form.description}`;
    const forbiddenWord = containsForbidden(allText);
    if (forbiddenWord) {
      setError(`Seu anúncio contém conteúdo inadequado. Palavra detectada: "${forbiddenWord}". Revise as informações.`);
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
      const cleanTitle = form.title.includes('%') ? decodeURIComponent(form.title) : form.title;
      let slug = cleanTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .trim()
        .replace(/\s+/g, '-') // Substitui espaços por hífens
        .replace(/-+/g, '-') // Remove hífens consecutivos
        .replace(/^-|-$/g, ''); // Remove hífens no início/fim

      // Garantir slug único
      const existingServices = await getDocs(query(collection(db, "services"), where("slug", "==", slug)));
      if (!existingServices.empty && (!editMode || existingServices.docs[0].id !== serviceData?.id)) {
        // Adicionar timestamp se houver conflito
        slug = `${slug}-${Date.now()}`;
      }

      const firestoreData = {
        ...form,
        title: cleanTitle,
        slug,
        images: imageUrls,
        ownerId: user.uid,
        ownerEmail: user.email,
        ownerName: user.displayName || "Anônimo",
        status: "approved",
        views: editMode && serviceData ? serviceData.views || 0 : 0,
        leads: editMode && serviceData ? serviceData.leads || 0 : 0,
        featured: editMode && serviceData ? serviceData.featured || false : false,
        createdAt: editMode && serviceData ? serviceData.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
        price: form.price || "Sob consulta"
      };
      
      // Salvar no Firestore
      let serviceId: string;
      
      if (editMode && serviceData) {
        // Atualizar serviço existente
        await updateDoc(doc(db, "services", serviceData.id), {
          ...form,
          title: cleanTitle,
          slug,
          images: imageUrls,
          ownerName: user.displayName || "Anônimo",
          updatedAt: serverTimestamp(),
          price: form.price || "Sob consulta"
        });
        serviceId = serviceData.id;
        setSuccess("Serviço atualizado com sucesso!");
      } else {
        // Criar novo serviço
        const docRef = await addDoc(collection(db, "services"), firestoreData);
        serviceId = docRef.id;
        setSuccess("Serviço cadastrado com sucesso! Agora ele está disponível na plataforma.");
      }

      // Criar produto no Stripe
      try {
        const stripeResponse = await fetch('/api/create-stripe-product', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceId,
            productType: form.productType,
            billingType: form.billingType,
            price: form.price,
            priceMonthly: form.priceMonthly,
            title: cleanTitle,
            description: form.description
          })
        });

        if (!stripeResponse.ok) {
          console.warn('Erro ao criar produto no Stripe:', await stripeResponse.text());
          // Não falhar o cadastro por causa do Stripe
        }
      } catch (stripeError) {
        console.warn('Erro na chamada do Stripe:', stripeError);
        // Não falhar o cadastro
      }
      
      // Limpar formulário apenas se não estiver em modo de edição
      if (!editMode) {
        setForm({
          title: "",
          type: "Turismo", // Mantém turismo como padrão, mas agora temos mais opções
          category: "",
          city: "",
          description: "",
          whatsapp: "",
          price: "",
          productType: "service",
          billingType: "one-time",
          priceMonthly: ""
        });
        setImages([]);
        setImagePreviews([]);
      }
      
      setLoading(false);
      
      // Scroll para o topo
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Chamar onClose se existir (para fechar modal)
      if (editMode && onClose) {
        setTimeout(() => onClose(), 2000);
      }
      
    } catch (err: unknown) {
      console.error("Erro ao cadastrar serviço:", err);
      const error = err as { message?: string };
      setError(error.message || "Erro ao cadastrar serviço. Tente novamente.");
      setLoading(false);
    }
  };

  // Categorias organizadas por tipo de serviço
  const serviceCategories = {
    "Turismo": [
      "Passeios Guiados", "Transporte Turístico", "Hospedagem", "Gastronomia",
      "Aventura", "Ecoturismo", "Cultura Local", "City Tour", "Tour Fotográfico",
      "Eventos", "Roteiros Personalizados", "Traslados", "Aluguel de Equipamentos",
      "Pacotes Turísticos", "Experiências Locais", "Guias Turísticos"
    ],
    "Marketing Digital": [
      "Tráfego Pago", "Social Media", "Gestão de Redes Sociais", "Criação de Conteúdo",
      "SEO", "Google Ads", "Facebook Ads", "Instagram Ads", "TikTok Ads",
      "Marketing de Influência", "Email Marketing", "Análise de Dados"
    ],
    "Design e Criativos": [
      "Criação de Logos", "Design Gráfico", "Branding", "Identidade Visual",
      "Criação de Artes", "Ilustrações", "Motion Graphics", "UI/UX Design",
      "Fotografia", "Vídeos Promocionais", "Materiais Impressos"
    ],
    "Tecnologia": [
      "Criação de Sites", "Desenvolvimento Web", "Apps Mobile", "E-commerce",
      "Sistemas Personalizados", "Automação", "Consultoria Tech", "SEO Técnico",
      "Otimização de Performance", "Manutenção de Sites"
    ],
    "Consultoria": [
      "Consultoria Empresarial", "Planejamento Estratégico", "Marketing Consultoria",
      "Consultoria Financeira", "Gestão de Projetos", "Coaching", "Mentoria",
      "Análise de Mercado", "Planejamento de Negócios"
    ],
    "Transporte e Mobilidade": [
      "Transfer Aeroporto", "Transporte Executivo", "Aluguel de Veículos",
      "Passeios e Transfers", "Transporte para Eventos", "Mobilidade Urbana",
      "Motoristas Profissionais", "Logística Local"
    ],
    "Gastronomia": [
      "Experiências Gastronômicas", "Cursos de Culinária", "Degustações",
      "Jantares Temáticos", "Food Tours", "Consultoria Gastronômica",
      "Eventos Gastronômicos", "Catering"
    ],
    "Educação e Capacitação": [
      "Cursos Online", "Workshops", "Treinamentos", "Palestras", "Mentoria",
      "Consultoria Educacional", "Capacitação Profissional", "Aulas Particulares", "Cursos"
    ],
    "Saúde e Bem-estar": [
      "Massagens", "Terapias Alternativas", "Consultoria Nutricional",
      "Aulas de Yoga", "Meditação", "Bem-estar Mental", "Coaching de Vida"
    ],
    "Outro": [
      "Serviços Gerais", "Consultoria Especializada", "Produtos Digitais",
      "Infoprodutos", "Cursos e Treinamentos", "Serviços Personalizados"
    ]
  };

  const types = [
    { value: "Turismo", label: "🏖️ Turismo & Experiências" },
    { value: "Marketing Digital", label: "📱 Marketing Digital" },
    { value: "Design e Criativos", label: "🎨 Design & Criativos" },
    { value: "Tecnologia", label: "💻 Tecnologia & Desenvolvimento" },
    { value: "Consultoria", label: "📊 Consultoria & Assessoria" },
    { value: "Transporte e Mobilidade", label: "🚗 Transporte & Mobilidade" },
    { value: "Gastronomia", label: "🍽️ Gastronomia & Experiências" },
    { value: "Educação e Capacitação", label: "📚 Educação & Capacitação" },
    { value: "Saúde e Bem-estar", label: "🧘 Saúde & Bem-estar" },
    { value: "Outro", label: "🔧 Outros Serviços" }
  ];

  // Obter categorias do tipo selecionado
  const getCategoriesForType = (type: string) => {
    return serviceCategories[type as keyof typeof serviceCategories] || serviceCategories["Outro"];
  };

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

  // Bloquear criação se não tiver MP conectado e chave PIX
  if (!canCreateProducts && !editMode) {
    return (
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-8 text-center">
        <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Configure seus Pagamentos</h2>
        <p className="text-gray-600 mb-6">
          Para criar produtos e receber pagamentos, você precisa:
        </p>
        
        <div className="space-y-4 mb-8">
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${isMPConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {isMPConnected ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
            <div className="text-left">
              <p className="font-medium text-gray-900">Mercado Pago Conectado</p>
              <p className="text-sm text-gray-600">Para receber pagamentos por cartão</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-4 rounded-lg border ${hasPixKey ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {hasPixKey ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
            <div className="text-left">
              <p className="font-medium text-gray-900">Chave PIX Cadastrada</p>
              <p className="text-sm text-gray-600">Para receber pagamentos via PIX e saques</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/provider")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Ir para Configurações
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          {editMode ? "Editar Serviço" : "Cadastrar Novo Serviço"}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {editMode 
            ? "Atualize os dados do seu serviço no marketplace."
            : "Preencha os dados do seu serviço para aparecer no marketplace."
          }
          {!editMode && <span className="text-blue-600 font-semibold"> Gratuito e sem mensalidade!</span>}
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
                    {editMode ? "As alterações foram salvas." : "Seu serviço já está disponível no catálogo."}
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
                  {getCategoriesForType(form.type).map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  Categorias sugeridas para {form.type.toLowerCase()}
                </p>
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

              {/* Tipo de Produto */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Tipo de Produto *
                </label>
                <select
                  name="productType"
                  value={form.productType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                >
                  <option value="service">Serviço</option>
                  <option value="infoproduct">Infoproduto</option>
                </select>
              </div>

              {/* Tipo de Cobrança */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  💳 Tipo de Cobrança *
                </label>
                <select
                  name="billingType"
                  value={form.billingType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                >
                  <option value="one-time">Pagamento Único</option>
                  <option value="subscription">Assinatura</option>
                </select>
              </div>

              {/* Preço Mensal (para assinaturas) */}
              {form.billingType === 'subscription' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💰 Valor Mensal da Assinatura *
                  </label>
                  <input
                    name="priceMonthly"
                    value={form.priceMonthly}
                    onChange={handleChange}
                    placeholder="Ex: R$ 29,90 por mês"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required={form.billingType === 'subscription'}
                  />
                </div>
              )}

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
                    <div className="relative">
                      <div className="w-5 h-5 border-2 border-white/30 rounded-full"></div>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
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
                    onClick={() => navigate(`/service/${generateSlug(service.title)}`)}
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