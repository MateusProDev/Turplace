import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import logo from '../assets/logosemfundo.png';
import iconLogo from '../assets/iconlogo.png';
import { getCategoriesWithProducts } from "../utils/getCategoriesWithProducts";
import { 
  MapPin, 
  Users, 
  Star, 
  TrendingUp, 
  Search, 
  Shield, 
  Camera,
  Briefcase,
  Car,
  Coffee,
  Compass,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Users2,
  Building,
  CheckCircle,
  Award,
  Heart,
  MessageCircle,
  Filter,
  ArrowUpRight,
  ExternalLink
} from "lucide-react";

interface CategoryData {
  category: string;
  products: Array<{
    id: string;
    name?: string;
    title?: string;
    imageUrl?: string;
    price?: number;
  }>;
}

// Mapeamento de ícones para categorias
const getCategoryIcon = (category: string) => {
  const categoryMap: Record<string, React.ReactNode> = {
    'passeio': <Compass className="w-8 h-8" />,
    'guias': <Users2 className="w-8 h-8" />,
    'transporte': <Car className="w-8 h-8" />,
    'gastronomia': <Coffee className="w-8 h-8" />,
    'hospedagem': <Building className="w-8 h-8" />,
    'fotografia': <Camera className="w-8 h-8" />,
    'aventura': <Zap className="w-8 h-8" />,
    'cultura': <Sparkles className="w-8 h-8" />,
    'artesanato': <Target className="w-8 h-8" />,
    'turismo': <MapPin className="w-8 h-8" />,
    'experiencias': <Briefcase className="w-8 h-8" />,
    'consultoria': <BarChart3 className="w-8 h-8" />,
    'designer': <Award className="w-8 h-8" />,
  };

  const normalize = (str: string) => 
    str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  
  const normalizedCategory = normalize(category);
  
  for (const key in categoryMap) {
    if (normalizedCategory.includes(key)) {
      return categoryMap[key];
    }
  }
  
  return <Briefcase className="w-8 h-8" />;
};

// Cores de fundo profissionais para categorias
const getCategoryBackground = (category: string) => {
  const backgrounds: Record<string, { gradient: string, light: string }> = {
    'passeio': { gradient: 'from-blue-500 to-indigo-600', light: 'bg-blue-50' },
    'guias': { gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50' },
    'transporte': { gradient: 'from-amber-500 to-orange-600', light: 'bg-amber-50' },
    'gastronomia': { gradient: 'from-rose-500 to-pink-600', light: 'bg-rose-50' },
    'hospedagem': { gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50' },
    'fotografia': { gradient: 'from-fuchsia-500 to-purple-600', light: 'bg-fuchsia-50' },
    'aventura': { gradient: 'from-green-500 to-emerald-600', light: 'bg-green-50' },
    'cultura': { gradient: 'from-indigo-500 to-blue-600', light: 'bg-indigo-50' },
    'artesanato': { gradient: 'from-orange-500 to-amber-600', light: 'bg-orange-50' },
    'turismo': { gradient: 'from-cyan-500 to-blue-600', light: 'bg-cyan-50' },
    'experiencias': { gradient: 'from-rose-500 to-red-600', light: 'bg-rose-50' },
    'consultoria': { gradient: 'from-slate-600 to-gray-700', light: 'bg-slate-50' },
    'designer': { gradient: 'from-purple-500 to-indigo-600', light: 'bg-purple-50' },
  };

  const normalize = (str: string) => 
    str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  
  const normalizedCategory = normalize(category);
  
  for (const key in backgrounds) {
    if (normalizedCategory.includes(key)) {
      return backgrounds[key];
    }
  }
  
  return { gradient: 'from-slate-600 to-gray-700', light: 'bg-slate-50' };
};

export default function Landing() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    getCategoriesWithProducts(6).then((data) => {
      setCategories(data as CategoryData[]);
      setLoading(false);
    });

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
              <img src={iconLogo} alt="Turplace" className={`h-12 w-auto object-contain transition-all`} />
              <span className={`text-xl font-bold ${scrolled ? 'text-gray-700' : 'text-white/90'}`}>Turplace</span>
            </div>

            {/* Desktop menu */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link 
                to="/catalog" 
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'}`}
              >
                Catálogo
              </Link>
              <Link 
                to="/how-it-works" 
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'}`}
              >
                Como Funciona
              </Link>
              <Link 
                to="/pricing" 
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'}`}
              >
                Planos
              </Link>
              <div className="flex items-center gap-4">
                <Link 
                  to="/login" 
                  className={`px-5 py-2.5 font-medium rounded-xl transition-all ${scrolled ? 'text-blue-600 hover:text-blue-700' : 'text-white/90 hover:text-white'}`}
                >
                  Entrar
                </Link>
                <Link 
                  to="/dashboard" 
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
                >
                  Começar Agora
                </Link>
              </div>
            </nav>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-blue-50 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Catálogo
                </Link>
                <Link 
                  to="/how-it-works" 
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-blue-50 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Como Funciona
                </Link>
                <Link 
                  to="/pricing" 
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-blue-50 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Planos
                </Link>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <Link 
                    to="/login" 
                    className="block px-4 py-3 text-blue-600 font-medium hover:bg-blue-50 rounded-xl transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                  <Link 
                    to="/dashboard" 
                    className="block px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-center rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all"
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
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full blur-3xl"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg border border-white/20 text-white px-3 py-2 rounded-full mb-8 mt-8 animate-pulse">
                <Sparkles size={18} />
                <span className="font-medium">Conectando você as Agências</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
                O <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Marketplace</span> Profissional
                <br />
                <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-light text-gray-300 mt-4 block">
                  para o Turismo Local
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Conectamos prestadores de serviços turísticos e
                <span className="text-cyan-300 font-semibold">  agências de viagens em uma plataforma premium.</span>
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center mb-16">
                <Link
                  to="/catalog"
                  className="group relative px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold text-base sm:text-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl hover:shadow-cyan-500/30 hover:scale-105 overflow-hidden"
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { value: '100+', label: 'Prestadores Ativos', icon: <Users2 className="text-cyan-400" />, color: 'from-cyan-500 to-blue-600' },
                { value: '200+', label: 'Experiências Únicas', icon: <Compass className="text-emerald-400" />, color: 'from-emerald-500 to-teal-600' },
                { value: '50+', label: 'Agências Parceiras', icon: <Building className="text-amber-400" />, color: 'from-amber-500 to-orange-600' },
                { value: '15+', label: 'Cidades Ativas', icon: <MapPin className="text-rose-400" />, color: 'from-rose-500 to-pink-600' }
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
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <span className="text-white/60 text-sm font-medium">Explore mais</span>
            <ChevronDown className="text-white/60" size={28} />
          </div>
        </div>
      </section>

      {/* Categories Section - Professional */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 px-6 py-3 rounded-full mb-6">
              <Award size={20} />
              <span className="font-semibold">Destaques do Marketplace</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Categorias <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Premium</span>
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
                  <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                </div>
                <p className="mt-6 text-gray-500 font-medium">Carregando categorias...</p>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="text-blue-400" size={48} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Em construção
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Estamos preparando as melhores categorias para você.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl font-bold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
              >
                <Briefcase size={24} />
                Cadastrar Primeiro Serviço
              </Link>
            </div>
          ) : (
            <>
              {/* Grid de Categorias - Primeira Linha */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {categories.slice(0, 3).map((cat) => {
                  const bg = getCategoryBackground(cat.category);
                  return (
                    <div 
                      key={cat.category}
                      className="group relative overflow-hidden rounded-3xl bg-white border border-gray-200 hover:border-gray-300 shadow-xl hover:shadow-2xl transition-all duration-500"
                    >
                      {/* Header Gradient */}
                      <div className={`h-2 bg-gradient-to-r ${bg.gradient}`}></div>
                      
                      <div className="p-8">
                        {/* Categoria Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${bg.light}`}>
                              <div className={`text-gradient bg-gradient-to-r ${bg.gradient} bg-clip-text text-transparent`}>
                                {getCategoryIcon(cat.category)}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                                {cat.category}
                              </h3>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                  {cat.products.length} serviços
                                </span>
                                <div className="flex items-center gap-1 text-amber-500">
                                  <Star size={14} fill="currentColor" />
                                  <Star size={14} fill="currentColor" />
                                  <Star size={14} fill="currentColor" />
                                  <Star size={14} fill="currentColor" />
                                  <Star size={14} fill="currentColor" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-2 transition-all" size={24} />
                        </div>
                        
                        {/* Produtos em Destaque */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-4">Serviços em Destaque</h4>
                          <div className="space-y-3">
                            {cat.products.slice(0, 2).map((prod) => (
                              <div 
                                key={prod.id}
                                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all group/item"
                              >
                                <div className={`w-12 h-12 rounded-xl ${bg.light} flex items-center justify-center`}>
                                  <span className={`font-bold text-lg bg-gradient-to-r ${bg.gradient} bg-clip-text text-transparent`}>
                                    {prod.name?.charAt(0) || prod.title?.charAt(0) || 'P'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-gray-900 truncate">
                                    {prod.name || prod.title || "Serviço Profissional"}
                                  </h5>
                                  <div className="flex items-center justify-between mt-1">
                                    {typeof prod.price === 'number' && !isNaN(prod.price) ? (
                                      <span className="text-lg font-bold text-green-600">
                                        R$ {prod.price.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-500">Sob consulta</span>
                                    )}
                                    <Heart size={16} className="text-gray-400 group-hover/item:text-rose-500 transition-colors" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* CTA */}
                        <Link
                          to={`/catalog?category=${encodeURIComponent(cat.category)}`}
                          className={`block w-full py-4 text-center font-semibold rounded-xl bg-gradient-to-r ${bg.gradient} text-white hover:shadow-lg transition-all hover:scale-[1.02]`}
                        >
                          Explorar Categoria
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Segunda Linha (se houver mais categorias) */}
              {categories.length > 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.slice(3, 6).map((cat) => {
                    const bg = getCategoryBackground(cat.category);
                    return (
                      <Link 
                        key={cat.category}
                        to={`/catalog?category=${encodeURIComponent(cat.category)}`}
                        className="group bg-white rounded-2xl border border-gray-200 hover:border-gray-300 p-6 hover:shadow-xl transition-all"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`p-3 rounded-xl ${bg.light}`}>
                            <div className={`text-gradient bg-gradient-to-r ${bg.gradient} bg-clip-text text-transparent`}>
                              {getCategoryIcon(cat.category)}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{cat.category}</h3>
                            <p className="text-sm text-gray-600">{cat.products.length} serviços</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <span className="text-blue-600 font-medium">Ver serviços</span>
                          <ArrowRight className="text-blue-600 transform group-hover:translate-x-2 transition-transform" size={16} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              
              {/* Ver todas as categorias */}
              {categories.length > 0 && (
                <div className="text-center mt-16">
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl font-bold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-xl hover:shadow-2xl group"
                  >
                    <Filter size={22} />
                    <span>Ver Todas as Categorias</span>
                    <ArrowRight className="transform group-hover:translate-x-2 transition-transform" size={22} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

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
                icon: <Briefcase className="text-blue-600" size={32} />,
                title: "Para Prestadores",
                description: "Crie seu perfil profissional, cadastre serviços premium e receba solicitações qualificadas.",
                features: ["Perfil Verificado", "Dashboard Analytics", "Pagamentos Seguros"],
                gradient: "from-blue-50 to-cyan-50",
                color: "blue"
              },
              {
                icon: <Users className="text-emerald-600" size={32} />,
                title: "Para Agências",
                description: "Encontre os melhores profissionais e experiências únicas para seus clientes.",
                features: ["Busca Avançada", "Avaliações Reais", "Suporte Dedicado"],
                gradient: "from-emerald-50 to-teal-50",
                color: "emerald"
              },
              {
                icon: <Camera className="text-purple-600" size={32} />,
                title: "Para Criadores",
                description: "Monetize seu conhecimento local com conteúdo exclusivo e parcerias estratégicas.",
                features: ["Conteúdo Premium", "Comunidade Ativa", "Monetização Flexível"],
                gradient: "from-purple-50 to-pink-50",
                color: "purple"
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
                        <CheckCircle className={`text-${item.color}-500`} size={18} />
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

      {/* Services Showcase - Professional */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 px-6 py-3 rounded-full mb-6">
              <Compass size={20} />
              <span className="font-semibold">Soluções Completas</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Tudo para o <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">Turismo</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Serviços especializados para todos os aspectos do turismo profissional
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Compass className="text-blue-600" size={28} />,
                title: "Guias e Tours",
                description: "Guias locais certificados, roteiros personalizados e tours temáticos exclusivos.",
                stats: "150+ profissionais",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: <Car className="text-emerald-600" size={28} />,
                title: "Transportes",
                description: "Transfer executivo, frota premium, motoristas qualificados e logística completa.",
                stats: "80+ veículos",
                gradient: "from-emerald-500 to-teal-500"
              },
              {
                icon: <Coffee className="text-amber-600" size={28} />,
                title: "Experiências",
                description: "Gastronomia autêntica, aventura, cultura local e workshops especializados.",
                stats: "200+ experiências",
                gradient: "from-amber-500 to-orange-500"
              },
              {
                icon: <Building className="text-purple-600" size={28} />,
                title: "Hospedagem",
                description: "Hotéis boutique, pousadas charmosas e acomodações premium.",
                stats: "50+ parcerias",
                gradient: "from-purple-500 to-pink-500"
              },
              {
                icon: <Camera className="text-rose-600" size={28} />,
                title: "Fotografia",
                description: "Fotógrafos profissionais, tours fotográficos e cobertura de eventos.",
                stats: "30+ especialistas",
                gradient: "from-rose-500 to-red-500"
              },
              {
                icon: <Users2 className="text-indigo-600" size={28} />,
                title: "Eventos",
                description: "Organização de eventos corporativos, casamentos e experiências VIP.",
                stats: "Planejamento completo",
                gradient: "from-indigo-500 to-blue-500"
              }
            ].map((service, index) => (
              <div 
                key={index}
                className="group bg-white rounded-2xl border border-gray-200 hover:border-gray-300 p-8 hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.gradient} bg-opacity-10 flex items-center justify-center mb-6`}>
                  {service.icon}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
                <p className="text-gray-600 mb-6">{service.description}</p>
                
                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-500">{service.stats}</span>
                  <Link
                    to={`/catalog?category=${encodeURIComponent(service.title)}`}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                  >
                    Explorar
                    <ArrowRight size={16} />
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700">
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
              Transforme seu Negócio no Turismo
            </h2>
            
            <p className="text-lg sm:text-xl text-blue-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Cadastro gratuito para prestadores. Alcance milhares de agências e viajantes, 
              aumente suas vendas e cresça no mercado de turismo local.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-16">
              <Link
                to="/login"
                className="group px-8 sm:px-12 py-4 sm:py-6 bg-white text-blue-700 rounded-2xl font-bold text-base sm:text-lg hover:bg-gray-50 transition-all shadow-2xl hover:shadow-white/30 hover:scale-105 flex items-center justify-center gap-3"
              >
                <Briefcase size={24} />
                <span>Cadastrar-se Gratuitamente</span>
                <ArrowUpRight className="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={24} />
              </Link>
              
              <Link
                to="/catalog"
                className="group px-8 sm:px-12 py-4 sm:py-6 bg-transparent border-2 border-white text-white rounded-2xl font-bold text-base sm:text-lg hover:bg-white/10 transition-all backdrop-blur-sm hover:scale-105 flex items-center justify-center gap-3"
              >
                <Search size={24} />
                <span>Explorar Catálogo Premium</span>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { icon: <Shield className="text-cyan-300" />, text: "Segurança e Confiança" },
                { icon: <TrendingUp className="text-emerald-300" />, text: "Aumento de Renda" },
                { icon: <MapPin className="text-amber-300" />, text: "Foco no Turismo Local" }
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                    {item.icon}
                  </div>
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
              <div className="flex items-center mb-6">
                <img src={logo} alt="Turplace" className="h-12 w-auto" />
              </div>
              <p className="text-gray-400 mb-8">
                O marketplace premium para o turismo local. Conectando profissionais e experiências únicas.
              </p>
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer">
                  <MessageCircle size={20} />
                </div>
                <div className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer">
                  <Users size={20} />
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
                <li><Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">Cadastrar serviços <ArrowRight size={14} /></Link></li>
                <li><Link to="/how-it-works" className="text-gray-400 hover:text-white transition-colors">Como funciona</Link></li>
                <li><Link to="/pricing" className="text-gray-400 hover:text-white transition-colors">Planos Premium</Link></li>
                <li><Link to="/success" className="text-gray-400 hover:text-white transition-colors">Casos de Sucesso</Link></li>
              </ul>
            </div>
            
            {/* Para Agências */}
            <div>
              <h3 className="text-lg font-bold mb-6">Para Agências</h3>
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
              © {new Date().getFullYear()} Turplace. Todos os direitos reservados.
            </p>
            <p className="text-gray-600 text-sm">
              MVP Beta — Plataforma profissional para turismo local.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Action Button */}
      <Link
        to="/dashboard"
        className="fixed bottom-8 right-8 z-40 w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-cyan-500/30 hover:scale-110 transition-all group"
      >
        <Briefcase size={24} />
        <div className="absolute -top-12 right-0 bg-gray-900 text-white px-4 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Começar Agora
        </div>
      </Link>
    </div>
  );
}
