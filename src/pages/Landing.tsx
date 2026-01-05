import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import iconLogo from '../assets/iconlogo.png';
import { getCategoriesWithProducts } from "../utils/getCategoriesWithProducts";
import { getTopRatedProducts, type Product } from "../utils/getTopRatedProducts";
import { generateSlug } from "../utils/slug";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import { 
  MapPin, 
  Star, 
  Search, 
  Camera,
  Briefcase,
  Car,
  Coffee,
  Compass,
  ChevronRight,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Users2,
  Building,
  Award,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Eye,
  Heart,
  BookOpen,
  TrendingUp as TrendingUpIcon,
  Flame
} from "lucide-react";

interface CategoryData {
  category: string;
  products: Array<{
    id: string;
    name?: string;
    title?: string;
    imageUrl?: string;
    price?: number;
    rating?: number;
    views?: number;
    bookings?: number;
  }>;
}

// Dados fictícios removidos - agora usa dados dinâmicos

// Mapeamento de ícones para categorias
const getCategoryIcon = (category: string) => {
  const categoryMap: Record<string, React.ReactNode> = {
    'passeio': <Compass className="w-6 h-6" />,
    'guias': <Users2 className="w-6 h-6" />,
    'transporte': <Car className="w-6 h-6" />,
    'gastronomia': <Coffee className="w-6 h-6" />,
    'hospedagem': <Building className="w-6 h-6" />,
    'fotografia': <Camera className="w-6 h-6" />,
    'aventura': <Zap className="w-6 h-6" />,
    'cultura': <Sparkles className="w-6 h-6" />,
    'artesanato': <Target className="w-6 h-6" />,
    'experiencias': <Briefcase className="w-6 h-6" />,
    'consultoria': <BarChart3 className="w-6 h-6" />,
    'designer': <Award className="w-6 h-6" />,
  };

  const normalize = (str: string) => 
    str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  
  const normalizedCategory = normalize(category);
  
  for (const key in categoryMap) {
    if (normalizedCategory.includes(key)) {
      return categoryMap[key];
    }
  }
  
  return <Briefcase className="w-6 h-6" />;
};

// Retorna uma imagem temática para cada categoria
const getCategoryImageUrl = (category: string) => {
  const normalize = (str: string) => str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const normalizedCategory = normalize(category);
  
  const categoryImages: Record<string, string> = {
    'passeio': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
    'guias': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    'transporte': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop',
    'gastronomia': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    'hospedagem': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
    'fotografia': 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&h=600&fit=crop',
    'aventura': 'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=800&h=600&fit=crop',
    'cultura': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop',
    'artesanato': 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&h=600&fit=crop',
    'experiencias': 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
    'consultoria': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    'designer': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
    'criacao de artes': 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
    'trafego pago': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    'artes': 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
    'marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    'ads': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop'
  };

  for (const key in categoryImages) {
    if (normalizedCategory.includes(key)) {
      return categoryImages[key];
    }
  }

  return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop';
};

// Site default gradient (nova paleta)
const siteGradient = 'from-[#0097b2] to-[#7ed957]';

export default function Landing() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [topProducts, setTopProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [categoriesData, topProductsData] = await Promise.all([
        getCategoriesWithProducts(6),
        getTopRatedProducts(5)
      ]);
      setCategories(categoriesData as CategoryData[]);
      setTopProducts(topProductsData);

      // Fetch courses
      try {
        const coursesQuery = query(collection(db, 'courses'), where('status', '==', 'published'));
        const coursesSnap = await getDocs(coursesQuery);
        const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCourses(coursesData);
      } catch (error) {
        console.error('Erro ao carregar cursos:', error);
      }

      setLoading(false);
    };

    loadData();

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Navigation - Professional Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-lg py-3' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 py-0">
              <img src={iconLogo} alt="Lucrazi" className={`h-12 w-auto object-contain transition-all`} />
              <span className={`text-xl font-bold ${scrolled ? 'text-gray-700' : 'text-white/90'}`}>Lucrazi</span>
            </div>

            {/* Desktop menu */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link 
                to="/catalog" 
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-[#0097b2]' : 'text-white/90 hover:text-white'}`}
              >
                Catálogo
              </Link>
              <Link 
                to="/marketplace" 
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-[#0097b2]' : 'text-white/90 hover:text-white'}`}
              >
                Marketplace
              </Link>
              <Link 
                to="/how-it-works" 
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-[#0097b2]' : 'text-white/90 hover:text-white'}`}
              >
                Como Funciona
              </Link>
              <div className="flex items-center gap-4">
                <Link 
                  to="/login" 
                  className={`px-5 py-2.5 font-medium rounded-xl transition-all ${scrolled ? 'text-[#0097b2] hover:text-[#7ed957]' : 'text-white/90 hover:text-white'}`}
                >
                  Entrar
                </Link>
                <Link 
                  to="/dashboard" 
                  className="px-5 py-2.5 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
                >
                  Começar Agora
                </Link>
              </div>
            </nav>

            {/* Mobile menu button */}
            <button
              className={`lg:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${scrolled ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X className={scrolled ? "text-gray-700" : "text-white"} size={28} />
              ) : (
                <Menu className={scrolled ? "text-gray-700" : "text-white"} size={28} />
              )}
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {menuOpen && (
            <div className="lg:hidden mt-4 bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 animate-slide-down">
              <div className="space-y-4">
                <Link 
                  to="/catalog" 
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-[#0097b2]/10 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Catálogo
                </Link>
                <Link 
                  to="/marketplace" 
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-[#0097b2]/10 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Marketplace
                </Link>
                <Link 
                  to="/how-it-works" 
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-[#0097b2]/10 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Como Funciona
                </Link>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <Link 
                    to="/login" 
                    className="block px-4 py-3 text-[#0097b2] font-medium hover:bg-[#0097b2]/10 rounded-xl transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                  <Link 
                    to="/dashboard" 
                    className="block px-4 py-3 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white font-semibold text-center rounded-xl hover:opacity-90 transition-all"
                    onClick={() => setMenuOpen(false)}
                  >
                    Começar Agora
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section - Professional */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 pt-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#7ed957] to-[#0097b2] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-[#7ed957] to-[#0097b2] rounded-full blur-3xl"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg border border-white/20 text-white px-3 py-2 rounded-full mb-8 mt-8 animate-pulse">
                <Sparkles size={18} />
                <span className="font-medium">Conectando Profissionais e Clientes</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
                O <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7ed957] to-[#0097b2]">Marketplace</span> Profissional para Serviços Digitais
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Conectamos prestadores de serviços digitais e clientes em uma plataforma premium.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center mb-16">
                <Link
                  to="/catalog"
                  className="group relative px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-[#7ed957] to-[#0097b2] text-white rounded-2xl font-bold text-base sm:text-lg hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl hover:shadow-[#0097b2]/30 hover:scale-105 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <Search size={22} />
                  <span>Explorar Serviços</span>
                  <ArrowRight className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" size={20} />
                </Link>
                
                <Link
                  to="/dashboard"
                  className="group px-8 sm:px-10 py-4 sm:py-5 bg-white/10 backdrop-blur-lg border-2 border-white/30 text-white rounded-2xl font-bold text-base sm:text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105"
                >
                  <Briefcase size={22} />
                  <span>Cadastrar Serviço</span>
                  <ExternalLink className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" size={20} />
                </Link>
              </div>
            </div>
            
            {/* Stats - Professional Design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-24">
              {[
                { value: '25+', label: 'Prestadores Ativos', icon: <Users2 className="text-[#7ed957]" />, color: siteGradient },
                { value: '45+', label: 'Experiências Únicas', icon: <Compass className="text-emerald-400" />, color: 'from-emerald-500 to-teal-600' },
                { value: '12+', label: 'Empresas Parceiras', icon: <Building className="text-amber-400" />, color: 'from-amber-500 to-orange-600' },
                { value: '8+', label: 'Cidades Ativas', icon: <MapPin className="text-[#0097b2]" />, color: siteGradient }
              ].map((stat, idx) => (
                <div 
                  key={idx}
                  className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:border-white/40 transition-all duration-300 cursor-default hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                      {stat.icon}
                    </div>
                    <ChevronRight className="text-white/40 group-hover:text-white/60 transition-colors" size={20} />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <span className="text-white/60 text-sm font-medium">Explore mais</span>
            <ChevronDown className="text-white/60" size={28} />
          </div>
        </div>
      </section>

      {/* Nova Seção: Conteúdos Mais Acessados - Hotmart Style */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header da Seção */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 px-5 py-2.5 rounded-full mb-4">
                  <Flame className="w-5 h-5" />
                  <span className="font-semibold text-sm">Destaques da Semana</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                  Conteúdos mais <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">acessados</span>
                </h2>
                <p className="text-gray-600 mt-3 max-w-2xl">
                  Os serviços premium mais visualizados e contratados por clientes
                </p>
              </div>
              
              {/* Filtros de Produtos */}
              <div className="flex flex-wrap gap-3">
                <button 
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeFilter === 'todos' 
                    ? 'bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setActiveFilter('todos')}
                >
                  Todos os produtos
                </button>
                <button 
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeFilter === 'bem-avaliados' 
                    ? 'bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setActiveFilter('bem-avaliados')}
                >
                  Produtos bem avaliados
                </button>
                <button 
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeFilter === 'novidades' 
                    ? 'bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setActiveFilter('novidades')}
                >
                  Novidades
                </button>
              </div>
            </div>
            
            {/* Contador de Produtos */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <p className="text-gray-600 font-medium">
                Mostrando <span className="text-[#0097b2] font-bold">{topProducts.length}</span> produtos premium
              </p>
              <div className="flex items-center gap-2 text-gray-500">
                <TrendingUpIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Ordenar por: Mais acessados</span>
              </div>
            </div>
          </div>

          {/* Grid de Conteúdos Acessados */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {topProducts.map((content) => (
              <Link
                key={content.id}
                to={`/service/${generateSlug(content.title || '')}`}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden border border-gray-100"
              >
                <div className="flex flex-col">
                  {/* Imagem do Conteúdo */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={content.imageUrl} 
                      alt={content.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {/* Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 text-xs font-bold text-white rounded-full ${
                        content.badge === 'Mais Procurado' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                        content.badge === 'Em Alta' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
                        content.badge === 'Oferta Especial' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                        'bg-gradient-to-r from-[#0097b2] to-[#7ed957]'
                      }`}>
                        {content.badge}
                      </span>
                    </div>
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  
                  {/* Preço e CTA - Logo abaixo da imagem */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div>
                      <div className="text-xl font-bold text-gray-900">
                        R$ {content.price ? Number(content.price).toFixed(2).replace('.', ',') : '0,00'}
                      </div>
                      <p className="text-xs text-gray-500">
                        {content.billingType === 'subscription' ? 'por mês' : 'valor único'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-green-600 group-hover:text-green-700 transition-colors">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-sm font-medium">Ver detalhes</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  
                  {/* Informações do Conteúdo */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-[#0097b2] bg-[#0097b2]/10 px-2.5 py-1 rounded-full">
                        {content.category}
                      </span>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-sm font-bold">{content.rating}</span>
                        <span className="text-gray-400 text-xs">({content.bookings} vendas)</span>
                      </div>
                    </div>
                    
                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-[#0097b2] transition-colors line-clamp-2">
                      {content.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                      Por <span className="font-medium text-gray-900">{content.author}</span>
                    </p>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{content.views?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-xs font-medium">{content.bookings}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section - Horizontal Rectangular Layout */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0097b2]/10 to-[#7ed957]/10 text-[#0097b2] px-6 py-3 rounded-full mb-6">
              <Award size={20} />
              <span className="font-semibold">Destaques do Marketplace</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Categorias <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0097b2] to-[#7ed957]">Premium</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Explore nossos serviços mais requisiados por categoria profissional
            </p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="text-center">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
                  <div className="w-20 h-20 border-4 border-[#0097b2] border-t-transparent rounded-full animate-spin absolute top-0"></div>
                </div>
                <p className="mt-6 text-gray-500 font-medium">Carregando categorias...</p>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-32 h-32 bg-gradient-to-br from-[#0097b2]/10 to-[#7ed957]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="text-[#0097b2]" size={48} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Em construção
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Estamos preparando as melhores categorias para você.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
              >
                <Briefcase size={24} />
                Cadastrar Primeiro Serviço
              </Link>
            </div>
          ) : (
            <>
              {/* Masonry Grid Layout - Rectangular Horizontal Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {categories.map((cat) => {
                  return (
                    <Link
                      key={cat.category}
                      to={`/catalog?category=${encodeURIComponent(cat.category)}`}
                      className={`group relative overflow-hidden rounded-2xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] bg-white shadow-lg h-56 md:h-64`}
                    >
                      {/* Background gradient subtle */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${siteGradient} opacity-25 group-hover:opacity-40 transition-opacity duration-500`}></div>
                      
                      {/* Content container */}
                      <div className="relative h-full flex items-center">
                        {/* Category image on left */}
                        <div className={`h-full w-1/3 flex-shrink-0 relative overflow-hidden`}>
                          {cat.products[0]?.imageUrl ? (
                            <img 
                              src={cat.products[0].imageUrl} 
                              alt={cat.category}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <img
                              src={getCategoryImageUrl(cat.category)}
                              alt={cat.category}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-90"
                            />
                          )}
                          {/* Overlay gradient */}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent opacity-30"></div>
                          
                        </div>
                        
                        {/* Content on right */}
                        <div className={`flex-1 p-6 pr-6 flex flex-col justify-center`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${siteGradient}`}>
                                {cat.category}
                              </h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                  {cat.products.length} serviços
                                </span>
                                <div className="flex items-center gap-1 text-amber-500">
                                  <Star size={12} fill="currentColor" />
                                  <Star size={12} fill="currentColor" />
                                  <Star size={12} fill="currentColor" />
                                  <Star size={12} fill="currentColor" />
                                  <Star size={12} fill="currentColor" />
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="text-gray-400 group-hover:text-[#0097b2] transform group-hover:translate-x-2 transition-all flex-shrink-0" size={20} />
                          </div>
                          
                          {/* Product preview */}
                          <div className="mt-4">
                            <div className="flex items-center -space-x-3">
                              {cat.products.slice(0, 4).map((prod, prodIndex) => (
                                <div 
                                  key={prod.id}
                                  className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-lg flex items-center justify-center overflow-hidden"
                                  style={{ zIndex: 4 - prodIndex }}
                                  title={prod.name || prod.title || 'Serviço'}
                                >
                                      {prod.imageUrl ? (
                                        <img 
                                          src={prod.imageUrl} 
                                          alt={prod.name || prod.title || ''}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <img
                                          src={`https://picsum.photos/seed/${encodeURIComponent(prod.id)}/64/64`}
                                          alt={prod.name || prod.title || 'Serviço'}
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                </div>
                              ))}
                              {cat.products.length > 4 && (
                                <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-800 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                  +{cat.products.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Price info */}
                          <div className="mt-4 flex items-center justify-between">
                            {(() => {
                              const validPrices = cat.products
                                .map(p => typeof p.price === 'number' && !isNaN(p.price) && p.price > 0 ? p.price : null)
                                .filter((v): v is number => v !== null);
                              
                              if (validPrices.length > 0) {
                                const minPrice = Math.min(...validPrices);
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">A partir de</span>
                                    <span className="text-lg font-bold text-green-600">R$ {minPrice.toFixed(2)}</span>
                                  </div>
                                );
                              }
                              return <span className="text-sm text-gray-500">Valores sob consulta</span>;
                            })()}
                            
                            <div className="flex items-center gap-2">
                              <TrendingUpIcon size={14} className="text-green-500" />
                              <span className="text-xs text-gray-600">Alta procura</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-white/5 opacity-0 group-hover:opacity-40 transition-opacity duration-500"></div>
                    </Link>
                  );
                })}
              </div>
              
              {/* Alternative Grid Layout for smaller screens */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                {categories.slice(0, 4).map((cat) => {
                  return (
                    <Link
                      key={cat.category}
                      to={`/catalog?category=${encodeURIComponent(cat.category)}`}
                      className="group bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex items-center gap-4"
                    >
                      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${siteGradient} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>
                        <div className={`text-gradient bg-gradient-to-r ${siteGradient} bg-clip-text text-transparent`}>{getCategoryIcon(cat.category)}</div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{cat.category}</h3>
                        <p className="text-sm text-gray-600">{cat.products.length} serviços</p>
                      </div>
                      <ArrowRight className="text-gray-400 group-hover:text-[#0097b2] transform group-hover:translate-x-1 transition-transform" size={16} />
                    </Link>
                  );
                })}
              </div>
              
              {/* Ver todas as categorias */}
              {categories.length > 0 && (
                <div className="text-center mt-16">
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl hover:shadow-2xl group"
                  >
                    <span>Ver Todas as Categorias</span>
                    <ArrowRight className="transform group-hover:translate-x-2 transition-transform" size={22} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Courses Section */}
      {courses.length > 0 && (
        <section className="py-16 sm:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0097b2]/10 to-[#7ed957]/10 text-[#0097b2] px-6 py-3 rounded-full mb-6">
                <BookOpen size={20} />
                <span className="font-semibold">Aprenda e Evolua</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Cursos <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0097b2] to-[#7ed957]">Online</span>
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                Desenvolva suas habilidades com nossos cursos especializados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {courses.slice(0, 6).map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${generateSlug(course.title)}`}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:scale-105"
                >
                  <div className="aspect-video bg-gradient-to-br from-[#0097b2] to-[#7ed957] flex items-center justify-center">
                    {course.image ? (
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="text-yellow-400 fill-current" size={16} />
                        <span className="text-sm font-medium">{course.rating || 0}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {course.views || 0} visualizações
                      </div>
                    </div>
                    {(course.price || course.priceMonthly) && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-lg font-bold text-[#0097b2]">
                          R$ {(() => {
                            const displayPrice = course.billingType === 'subscription' ? course.priceMonthly : course.price;
                            return displayPrice ? parseFloat(String(displayPrice).replace(',', '.'))?.toFixed(2).replace('.', ',') : '0,00';
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {courses.length > 6 && (
              <div className="text-center mt-12">
                <Link
                  to="/catalog?type=course"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl hover:shadow-2xl group"
                >
                  <span>Ver Todos os Cursos</span>
                  <ArrowRight className="transform group-hover:translate-x-2 transition-transform" size={20} />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How It Works - Professional */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 px-6 py-3 rounded-full mb-6">
              <Zap size={20} />
              <span className="font-semibold">Funcionalidade Simplificada</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Como <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Funciona</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Um processo simples e eficiente para todos os perfis profissionais
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Briefcase className="text-[#0097b2]" size={32} />,
                title: "Para Prestadores",
                description: "Crie seu perfil profissional, cadastre serviços premium e receba solicitações qualificadas.",
                features: ["Perfil Verificado", "Dashboard Analytics", "Pagamentos Seguros"],
                gradient: "from-[#0097b2]/10 to-[#7ed957]/10",
                color: "blue"
              },
              {
                icon: <Users2 className="text-emerald-600" size={32} />,
                title: "Para Empresas",
                description: "Encontre os melhores profissionais e soluções para seus projetos.",
                features: ["Busca Avançada", "Avaliações Reais", "Suporte Dedicado"],
                gradient: "from-emerald-50 to-teal-50",
                color: "emerald"
              },
                {
                icon: <Camera className="text-[#0097b2]" size={32} />,
                title: "Para Criadores",
                description: "Monetize seu conhecimento local com conteúdo exclusivo e parcerias estratégicas.",
                features: ["Conteúdo Premium", "Comunidade Ativa", "Monetização Flexível"],
                gradient: "from-[#0097b2]/10 to-[#7ed957]/10",
                color: "blue"
              }
            ].map((item, index) => (
              <div 
                key={index}
                className="group relative bg-white rounded-3xl border border-gray-200 hover:border-gray-300 p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`}></div>
                
                <div className="relative">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-8`}>
                    {item.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                  <p className="text-gray-600 mb-8 leading-relaxed">{item.description}</p>
                  
                  <div className="space-y-3 mb-8">
                    {item.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0097b2]"></div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Link
                    to="/how-it-works"
                    className={`inline-flex items-center gap-2 text-${item.color}-600 font-semibold hover:text-${item.color}-700 transition-colors`}
                  >
                    Saiba mais
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Professional */}
      <section className="relative py-20 sm:py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0097b2] via-[#7ed957] to-[#0097b2]">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
        </div>
        
        {/* Content */}
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-lg text-white px-6 py-3 rounded-full mb-8">
              <Star size={20} />
              <span className="font-semibold">Comece Agora</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-8">
              Transforme seu Negócio Digital
            </h2>
            
            <p className="text-lg sm:text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
              Cadastro gratuito para prestadores. Alcance milhares de clientes, 
              aumente suas vendas e cresça no mercado digital.
            </p>
            
            <div className="flex flex-row gap-3 sm:gap-6 justify-center mb-16 flex-wrap">
              <Link
                to="/login"
                className="group px-6 sm:px-12 py-3 sm:py-6 bg-white text-[#0097b2] rounded-2xl font-bold text-sm sm:text-lg hover:bg-gray-50 transition-all shadow-2xl hover:shadow-white/30 hover:scale-105 flex items-center justify-center gap-2 sm:gap-3 flex-shrink-0"
              >
                <Briefcase size={20} className="sm:w-6 sm:h-6" />
                <span>Cadastrar-se Gratuitamente</span>
                <ArrowUpRight className="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform sm:w-6 sm:h-6" size={20} />
              </Link>
              
              <Link
                to="/catalog"
                className="group px-6 sm:px-12 py-3 sm:py-6 bg-transparent border-2 border-white text-white rounded-2xl font-bold text-sm sm:text-lg hover:bg-white/10 transition-all backdrop-blur-sm hover:scale-105 flex items-center justify-center gap-2 sm:gap-3 flex-shrink-0"
              >
                <Search size={20} className="sm:w-6 sm:h-6" />
                <span>Explorar Catálogo Premium</span>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { icon: <div className="w-10 h-10 rounded-full bg-[#7ed957]/20 flex items-center justify-center"><div className="w-6 h-6 rounded-full bg-[#7ed957]"></div></div>, text: "Segurança e Confiança" },
                { icon: <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center"><TrendingUpIcon className="text-emerald-300" /></div>, text: "Aumento de Renda" },
                { icon: <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"><MapPin className="text-amber-300" /></div>, text: "Foco no Mercado Digital" }
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center gap-3">
                  {item.icon}
                  <span className="text-white/90 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Professional */}
      <footer className="bg-gray-900 text-white py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-16">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img src={iconLogo} alt="Lucrazi" className="h-16 w-auto" />
                <span className="text-xl font-bold text-white">Lucrazi</span>
              </div>
              <p className="text-gray-400 mb-8">
                O marketplace premium para serviços digitais. Conectando profissionais e clientes.
              </p>
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-[#0097b2]"></div>
                </div>
                <div className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer">
                  <Users2 size={20} />
                </div>
                <div className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer">
                  <Briefcase size={20} />
                </div>
              </div>
            </div>
            
            {/* Para Prestadores */}
            <div>
              <h3 className="text-lg font-bold mb-6">Para Prestadores</h3>
              <ul className="space-y-4">
                <li><Link to="/provider-login" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">Área do Prestador <ArrowRight size={14} /></Link></li>
                <li><Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">Cadastrar serviços <ArrowRight size={14} /></Link></li>
                <li><Link to="/how-it-works" className="text-gray-400 hover:text-white transition-colors">Como funciona</Link></li>
                <li><Link to="/success" className="text-gray-400 hover:text-white transition-colors">Casos de Sucesso</Link></li>
              </ul>
            </div>
            
            {/* Para Empresas */}
            <div>
              <h3 className="text-lg font-bold mb-6">Para Empresas</h3>
              <ul className="space-y-4">
                <li><Link to="/catalog" className="text-gray-400 hover:text-white transition-colors">Encontrar serviços</Link></li>
                <li><Link to="/partnerships" className="text-gray-400 hover:text-white transition-colors">Parcerias</Link></li>
                <li><Link to="/enterprise" className="text-gray-400 hover:text-white transition-colors">Soluções Corporativas</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contato Comercial</Link></li>
              </ul>
            </div>
            
            {/* Recursos */}
            <div>
              <h3 className="text-lg font-bold mb-6">Recursos</h3>
              <ul className="space-y-4">
                <li><Link to="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors">Central de Ajuda</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacidade</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-sm mb-4">
              © {new Date().getFullYear()} Lucrazi. Todos os direitos reservados.
            </p>
            <p className="text-gray-600 text-sm">
              MVP Beta — Plataforma profissional para serviços digitais.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Action Button */}
      <Link
        to="/dashboard"
        className="fixed bottom-8 right-8 z-40 w-16 h-16 bg-gradient-to-br from-[#0097b2] to-[#7ed957] text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-[#0097b2]/30 hover:scale-110 transition-all group"
      >
        <Briefcase size={24} />
        <div className="absolute -top-12 right-0 bg-gray-900 text-white px-4 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Começar Agora
        </div>
      </Link>
    </div>
  );
}