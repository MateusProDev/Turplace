import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Menu, X, Grid, List, ChevronDown, Sparkles, Zap, Users, Shield, CheckCircle } from "lucide-react";
import iconLogo from '../assets/iconlogo.png';
import { getCategoriesWithProducts } from "../utils/getCategoriesWithProducts";
import { getTopRatedProducts, type Product } from "../utils/getTopRatedProducts";
import { generateSlug } from "../utils/slug";
import { collection, getDocs, query, where, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "../utils/firebase";
import {
  Star,
  Search,
  Briefcase,
  ChevronRight,
  ArrowRight,
  Eye,
  Heart,
  BookOpen,
  ShoppingCart
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

export default function Marketplace() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [isSearching, setIsSearching] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const [categoriesData, topProductsData] = await Promise.all([
        getCategoriesWithProducts(12), // Mais categorias para marketplace
        getTopRatedProducts(0) // Todos os produtos aprovados
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
      
      // Animação parallax no hero
      if (heroRef.current) {
        const scrollY = window.scrollY;
        const heroHeight = heroRef.current.offsetHeight;
        const opacity = Math.max(0.3, 1 - (scrollY / heroHeight) * 0.7);
        heroRef.current.style.opacity = opacity.toString();
      }
    };

    // Recarregar dados quando o usuário volta para a página (navegação com botão voltar)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Marketplace] Página ficou visível, recarregando dados...');
        loadData();
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Função helper para remover acentos e normalizar texto para busca
  const normalizeText = (text: string | undefined): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .trim();
  };

  // Filtrar produtos baseado na busca e categoria - busca aprimorada com normalização
  const filteredProducts = topProducts.filter(product => {
    const searchNormalized = normalizeText(searchTerm);
    
    // Busca em múltiplos campos com normalização (sem acentos, case insensitive)
    const matchesSearch = !searchNormalized || 
      normalizeText(product.title).includes(searchNormalized) ||
      normalizeText(product.name).includes(searchNormalized) ||
      normalizeText(product.description).includes(searchNormalized) ||
      normalizeText(product.category).includes(searchNormalized) ||
      normalizeText(product.author).includes(searchNormalized) ||
      product.tags?.some((tag: string) => normalizeText(tag).includes(searchNormalized));
    
    const matchesCategory = selectedCategory === 'todos' || product.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Filtrar cursos baseado na busca - busca aprimorada com normalização
  const filteredCourses = courses.filter(course => {
    const searchNormalized = normalizeText(searchTerm);
    
    // Busca em múltiplos campos com normalização (sem acentos, case insensitive)
    return !searchNormalized ||
      normalizeText(course.title).includes(searchNormalized) ||
      normalizeText(course.name).includes(searchNormalized) ||
      normalizeText(course.description).includes(searchNormalized) ||
      normalizeText(course.category).includes(searchNormalized) ||
      normalizeText(course.instructor).includes(searchNormalized) ||
      normalizeText(course.author).includes(searchNormalized) ||
      course.tags?.some((tag: string) => normalizeText(tag).includes(searchNormalized));
  });

  const trackUniqueView = async (opts: { kind: 'course' | 'service'; id: string }) => {
    const { kind, id } = opts;
    const sessionKey = kind === 'course' ? 'viewedCoursesSession' : 'viewedServicesSession';
    const collectionName = kind === 'course' ? 'courses' : 'services';

    console.log(`[Marketplace] trackUniqueView called for ${kind}:`, id);

    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
      if (!Array.isArray(seen)) seen = [];
    } catch {
      seen = [];
    }

    // Se já foi visto nesta sessão, não incrementa
    if (seen.includes(id)) {
      console.log(`[Marketplace] ${kind} ${id} já foi visto nesta sessão, pulando`);
      return;
    }

    // Marca como visto antes de incrementar para evitar duplicação
    seen.push(id);
    sessionStorage.setItem(sessionKey, JSON.stringify(seen));
    console.log(`[Marketplace] Marcado como visto no sessionStorage:`, sessionKey, seen);

    // Atualiza o estado local IMEDIATAMENTE para refletir no UI
    if (kind === 'course') {
      setCourses(prev => prev.map(course => 
        course.id === id ? { ...course, views: (course.views || 0) + 1 } : course
      ));
    } else {
      setTopProducts(prev => prev.map(product => 
        product.id === id ? { ...product, views: (product.views || 0) + 1 } : product
      ));
    }

    // Incrementa no Firestore em background sem bloquear a navegação
    try {
      const docRef = doc(db, collectionName, id);
      console.log(`[Marketplace] Tentando incrementar views em ${collectionName}/${id}`);
      await updateDoc(docRef, { views: increment(1) });
      console.log(`[Marketplace] ✓ Views incrementado com sucesso para ${kind} ${id}`);
    } catch (e) {
      console.error(`[Marketplace] ✗ Falha ao incrementar views para ${kind} ${id}:`, e);
      // Reverte a alteração local em caso de erro
      if (kind === 'course') {
        setCourses(prev => prev.map(course => 
          course.id === id ? { ...course, views: (course.views || 1) - 1 } : course
        ));
      } else {
        setTopProducts(prev => prev.map(product => 
          product.id === id ? { ...product, views: (product.views || 1) - 1 } : product
        ));
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Marketplace Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/98 backdrop-blur-xl shadow-soft py-3' : 'bg-white/80 backdrop-blur-md py-4 border-b border-white/20'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 py-0">
              <img src={iconLogo} alt="Lucrazi" className="h-11 w-auto object-contain transition-all" />
              <span className="text-xl font-bold bg-gradient-to-r from-[#0097b2] to-[#7ed957] bg-clip-text text-transparent">Lucrazi</span>
            </Link>

            {/* Desktop menu */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link to="/" className="text-gray-700 font-medium hover:text-[#0097b2] transition-colors">Início</Link>
              <Link to="/marketplace" className="text-[#0097b2] font-semibold">Marketplace</Link>
              <Link to="/catalog" className="text-gray-700 font-medium hover:text-[#0097b2] transition-colors">Catálogo</Link>
              <div className="flex items-center gap-3 ml-4">
                <Link
                  to="/client-login"
                  className="px-5 py-2.5 text-gray-700 font-medium hover:text-[#0097b2] transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  to="/client"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white font-semibold rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  Minha Conta
                </Link>
              </div>
            </nav>

            {/* Mobile menu button */}
            <button
              className={`lg:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${scrolled ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X className="text-gray-700" size={28} />
              ) : (
                <Menu className="text-gray-700" size={28} />
              )}
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {menuOpen && (
            <div className="lg:hidden mt-4 bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 animate-slide-down">
              <div className="space-y-4">
                <Link
                  to="/"
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-[#0097b2]/10 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Início
                </Link>
                <Link
                  to="/marketplace"
                  className="block px-4 py-3 text-[#0097b2] font-medium bg-[#0097b2]/10 rounded-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  Marketplace
                </Link>
                <Link
                  to="/catalog"
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-[#0097b2]/10 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Catálogo
                </Link>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <Link
                    to="/client-login"
                    className="block px-4 py-3 text-[#0097b2] font-medium hover:bg-[#0097b2]/10 rounded-xl transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/client"
                    className="block px-4 py-3 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white font-semibold text-center rounded-xl hover:opacity-90 transition-all"
                    onClick={() => setMenuOpen(false)}
                  >
                    Minha Conta
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section - Estilo Hotmart */}
      <div ref={heroRef} className="relative min-h-[90vh] bg-gradient-to-br from-[#0097b2]/10 via-white to-[#7ed957]/10 overflow-hidden pt-20">
        {/* Decorative Background */}
        <div className="absolute inset-0 overflow-hidden opacity-40">
          <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-br from-[#0097b2]/20 to-[#7ed957]/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-0 w-96 h-96 bg-gradient-to-tr from-[#7ed957]/20 to-[#0097b2]/20 rounded-full blur-3xl"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content - Texto à esquerda em mobile */}
            <div className="space-y-8 text-left lg:pr-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0097b2]/10 to-[#7ed957]/10 text-[#0097b2] px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                São mais de {topProducts.length + courses.length} cursos e produtos
              </div>

              {/* Main Heading */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  O que você quer{' '}
                  <span className="relative inline-block">
                    <span className="relative z-10 bg-gradient-to-r from-[#0097b2] via-[#0097b2] to-[#7ed957] bg-clip-text text-transparent">
                      aprender
                    </span>
                    <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 200 12" fill="none">
                      <path d="M2 10C60 2 140 2 198 10" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round"/>
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#0097b2" />
                          <stop offset="50%" stopColor="#0097b2" />
                          <stop offset="100%" stopColor="#7ed957" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                  {' '}hoje?
                </h1>
                
                <p className="text-xl text-gray-600 max-w-xl">
                  Pesquise um tema e escolha cursos perfeitos para você.
                  <br />
                  <span className="text-gray-500">Tente "marketing" ou "culinária"</span>
                </p>
              </div>

              {/* Search Bar - Destaque */}
              <div className="max-w-xl">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#0097b2] via-[#0097b2] to-[#7ed957] rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                  <div className="relative flex items-center">
                    <Search className="absolute left-5 text-gray-400 pointer-events-none" size={22} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="O que você quer aprender? Ex: Marketing Digital, Programação, Tráfego..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsSearching(e.target.value.length > 0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Scroll para resultados
                          const productsSection = document.getElementById('products-section');
                          productsSection?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="w-full pl-14 pr-32 py-5 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0097b2] focus:ring-4 focus:ring-[#0097b2]/20 transition-all duration-300 shadow-xl relative z-10"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setIsSearching(false);
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-28 text-gray-400 hover:text-gray-600 transition-colors z-20"
                        title="Limpar busca"
                      >
                        <X size={20} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        const productsSection = document.getElementById('products-section');
                        productsSection?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="absolute right-2 px-6 py-3 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 z-20"
                    >
                      Buscar
                    </button>
                  </div>
                </div>
                {isSearching && (
                  <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-[#0097b2] rounded-full animate-pulse"></span>
                    Buscando em produtos, serviços e cursos...
                  </div>
                )}
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Certificado Válido</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Shield className="w-5 h-5 text-[#0097b2]" />
                  <span className="text-sm font-medium">Garantia de 7 Dias</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Users className="w-5 h-5 text-[#7ed957]" />
                  <span className="text-sm font-medium">Milhares de Alunos</span>
                </div>
              </div>
            </div>

            {/* Right Content - Imagens em camadas (pétalas/paleta) */}
            <div className="relative hidden lg:block h-[600px]">
              {/* Imagem 1 - Fundo (maior, mais para direita) */}
              <div className="absolute top-0 right-0 w-72 h-80 transform rotate-6 transition-all duration-700 hover:rotate-3 hover:scale-105">
                <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=800&fit=crop"
                    alt="Curso de Programação"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0097b2]/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="text-sm font-bold mb-1">Programação</div>
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">4.9</span>
                      <span className="opacity-80">(2.4k)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Imagem 2 - Meio (sobreposta à esquerda) */}
              <div className="absolute top-24 left-8 w-64 h-72 transform -rotate-6 transition-all duration-700 hover:rotate-0 hover:scale-105 z-10">
                <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=700&fit=crop"
                    alt="Marketing Digital"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#7ed957]/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="text-sm font-bold mb-1">Marketing</div>
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">4.8</span>
                      <span className="opacity-80">(1.8k)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Imagem 3 - Frente (mais baixo, central-direita) */}
              <div className="absolute bottom-12 right-20 w-60 h-64 transform rotate-3 transition-all duration-700 hover:-rotate-3 hover:scale-105 z-20">
                <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src="https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&h=700&fit=crop"
                    alt="Design Gráfico"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#7ed957]/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="text-sm font-bold mb-1">Design</div>
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">5.0</span>
                      <span className="opacity-80">(1.2k)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge flutuante */}
              <div className="absolute top-12 left-0 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white px-4 py-2.5 rounded-full shadow-xl animate-bounce z-30">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-bold">Tendência</span>
                </div>
              </div>
            </div>

            {/* Mobile: Banner simples em vez das imagens sobrepostas */}
            <div className="lg:hidden w-full h-64 rounded-2xl overflow-hidden shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop"
                alt="Cursos Online"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0097b2]/60 via-transparent to-transparent"></div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-gray-400 animate-bounce">
            <span className="text-sm font-medium">Explorar cursos</span>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <section className="py-6 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('todos')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  selectedCategory === 'todos'
                    ? 'bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    selectedCategory === cat.category
                      ? 'bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.category}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-[#7ed957]/10 text-[#0097b2]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-[#7ed957]/10 text-[#0097b2]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products-section" className="py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Produtos e Serviços <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0097b2] to-[#7ed957]">Digitais</span>
                </h2>
                {searchTerm && (
                  <p className="text-gray-600">
                    Encontrados <span className="font-bold text-[#0097b2]">{filteredProducts.length}</span> produtos para "{searchTerm}"
                  </p>
                )}
              </div>
            </div>
            {!searchTerm && (
              <p className="text-gray-600 max-w-2xl">
                Explore nossa coleção completa de infoprodutos, serviços digitais e soluções para seu negócio.
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-2xl"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-[#0097b2]/10 to-[#7ed957]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-[#0097b2]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Nenhum produto encontrado
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Não encontramos produtos para "{searchTerm}". Tente buscar com outras palavras-chave.
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-3 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white font-semibold rounded-xl hover:opacity-90 transition-all"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1'
            }`}>
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/service/${generateSlug(product.title || '')}`}
                  onClick={() => {
                    // 1 view por sessão por serviço
                    void trackUniqueView({ kind: 'service', id: product.id });
                  }}
                  className={`group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden border border-gray-100 ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                >
                  <div className={`flex ${viewMode === 'list' ? 'flex-row' : 'flex-col'}`}>
                    {/* Image */}
                    <div className={`${viewMode === 'list' ? 'w-48 h-32' : 'h-48'} overflow-hidden relative`}>
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {/* Badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`px-2.5 py-1 text-xs font-bold text-white rounded-full ${
                          product.badge === 'Mais Procurado' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                          product.badge === 'Em Alta' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
                          product.badge === 'Oferta Especial' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                          'bg-gradient-to-r from-[#0097b2] to-[#7ed957]'
                        }`}>
                          {product.badge || 'Produto'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-[#0097b2] bg-[#7ed957]/10 px-2.5 py-1 rounded-full">
                          {product.category}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-sm font-bold">{product.rating}</span>
                          <span className="text-gray-400 text-xs">({product.bookings} vendas)</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#0097b2] transition-colors line-clamp-2">
                        {product.title}
                      </h3>

                      <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                        Por <span className="font-medium text-gray-900">{product.author}</span>
                      </p>

                      {/* Price and CTA */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xl font-bold text-gray-900">
                            R$ {(product.price || 0).toFixed(2).replace('.', ',')}
                          </div>
                          <p className="text-xs text-gray-500">
                            {product.billingType === 'subscription' ? 'por mês' : 'valor único'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-[#0097b2] group-hover:text-[#7ed957] transition-colors">
                          <ShoppingCart className="w-5 h-5" />
                          <span className="text-sm font-medium">Comprar</span>
                          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{product.views?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-xs font-medium">{product.bookings}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Courses Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Cursos <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0097b2] to-[#7ed957]">Online</span>
                </h2>
                {searchTerm && (
                  <p className="text-gray-600">
                    Encontrados <span className="font-bold text-[#0097b2]">{filteredCourses.length}</span> cursos para "{searchTerm}"
                  </p>
                )}
              </div>
            </div>
            {!searchTerm && (
              <p className="text-gray-600 max-w-2xl">
                Aprenda novas habilidades com nossos cursos especializados.
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-2xl"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-[#0097b2]/10 to-[#7ed957]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-12 h-12 text-[#0097b2]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Nenhum curso encontrado
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Não encontramos cursos para "{searchTerm}". Tente buscar com outras palavras-chave.
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-3 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white font-semibold rounded-xl hover:opacity-90 transition-all"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${generateSlug(course.title || '')}`}
                  onClick={() => {
                    // 1 view por sessão por curso (evita duplicar com CourseDetail)
                    void trackUniqueView({ kind: 'course', id: course.id });
                  }}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden border border-gray-100"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={course.thumbnail || course.coverImage || course.imageUrl || course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop'}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop';
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 text-xs font-bold text-white rounded-full bg-gradient-to-r from-[#0097b2] to-[#7ed957]">
                        Curso
                      </span>
                    </div>
                    {course.category && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 text-xs font-medium text-white bg-black/50 backdrop-blur-sm rounded-full">
                          {course.category}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#0097b2] transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                      {course.description || course.shortDescription || 'Curso completo e atualizado'}
                    </p>

                    {course.instructor && (
                      <p className="text-sm text-gray-500 mb-3">
                        Por <span className="font-medium text-gray-700">{course.instructor || course.author || course.providerName}</span>
                      </p>
                    )}

                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-gray-500">
                        <div className="flex items-center gap-1" title={`${Number(course.rating ?? course.averageRating ?? 0).toFixed(1)} de 5 estrelas`}>
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-medium text-gray-700">
                            {Number(course.rating ?? course.averageRating ?? 0).toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" title={`${Number(course.views ?? course.viewCount ?? 0).toLocaleString()} visualizações`}>
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-medium">
                            {Number(course.views ?? course.viewCount ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" title={`${Number(course.totalLessons ?? course.lessonsCount ?? 0)} aulas`}>
                          <BookOpen className="w-4 h-4 text-[#7ed957]" />
                          <span className="text-xs font-medium">
                            {Number(course.totalLessons ?? course.lessonsCount ?? 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700 shrink-0">
                        <span className="text-sm font-medium">
                          {course.instructor || course.author || 'Instrutor'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-gray-900">
                          R$ {(() => {
                            const price = course.price;
                            if (typeof price === 'number') return price.toFixed(2).replace('.', ',');
                            if (typeof price === 'string') {
                              const cleaned = price.replace(/[^\d,.-]/g, '').replace(',', '.');
                              const parsed = parseFloat(cleaned);
                              return isNaN(parsed) ? '0,00' : parsed.toFixed(2).replace('.', ',');
                            }
                            return '0,00';
                          })()}
                        </div>
                        <p className="text-xs text-gray-500">
                          {course.billingType === 'subscription' ? 'Assinatura mensal' : 'Acesso vitalício'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-[#0097b2] group-hover:text-[#7ed957] transition-colors">
                        <BookOpen className="w-5 h-5" />
                        <span className="text-sm font-medium">Ver Curso</span>
                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Categorias em <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0097b2] to-[#7ed957]">Destaque</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore produtos organizados por categoria para encontrar exatamente o que você precisa.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((categoryData) => (
              <Link
                key={categoryData.category}
                to={`/catalog?category=${encodeURIComponent(categoryData.category)}`}
                className="group bg-white rounded-2xl border border-gray-200 hover:border-[#0097b2] p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0097b2] to-[#7ed957] flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-[#0097b2] transition-colors" size={20} />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#0097b2] transition-colors">
                  {categoryData.category}
                </h3>

                <p className="text-gray-600 text-sm mb-4">
                  {categoryData.products.length} produtos disponíveis
                </p>

                <div className="flex items-center gap-2 text-[#0097b2] group-hover:text-[#7ed957] transition-colors">
                  <span className="text-sm font-medium">Explorar</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-[#0097b2] to-[#7ed957]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Pronto para Começar sua Jornada?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Crie sua conta gratuita e tenha acesso a milhares de infoprodutos, cursos e serviços digitais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="px-8 py-4 bg-white text-[#0097b2] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
              >
                Criar Conta Gratuita
              </Link>
              <Link
                to="/catalog"
                className="px-8 py-4 bg-white/10 text-white border border-white/30 font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                Explorar Catálogo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}