import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, Grid, List } from "lucide-react";
import iconLogo from '../assets/iconlogo.png';
import { getCategoriesWithProducts } from "../utils/getCategoriesWithProducts";
import { getTopRatedProducts, type Product } from "../utils/getTopRatedProducts";
import { generateSlug } from "../utils/slug";
import { collection, getDocs, query, where } from "firebase/firestore";
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
  ShoppingCart,
  PlayCircle
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
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filtrar produtos baseado na busca e categoria
  const filteredProducts = topProducts.filter(product => {
    const matchesSearch = product.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || product.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Filtrar cursos baseado na busca
  const filteredCourses = courses.filter(course => {
    return course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           course.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Navigation - Marketplace Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-lg py-3' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 py-0">
              <img src={iconLogo} alt="Lucrazi" className={`h-12 w-auto object-contain transition-all`} />
              <span className={`text-xl font-bold ${scrolled ? 'text-gray-700' : 'text-white/90'}`}>Lucrazi</span>
            </Link>

            {/* Desktop menu */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link
                to="/"
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'}`}
              >
                Início
              </Link>
              <Link
                to="/marketplace"
                className={`font-medium transition-colors ${scrolled ? 'text-blue-600' : 'text-white'}`}
              >
                Marketplace
              </Link>
              <Link
                to="/catalog"
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'}`}
              >
                Catálogo
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  to="/client-login"
                  className={`px-5 py-2.5 font-medium rounded-xl transition-all ${scrolled ? 'text-blue-600 hover:text-blue-700' : 'text-white/90 hover:text-white'}`}
                >
                  Entrar
                </Link>
                <Link
                  to="/client"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
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
                  to="/"
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-blue-50 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Início
                </Link>
                <Link
                  to="/marketplace"
                  className="block px-4 py-3 text-blue-600 font-medium bg-blue-50 rounded-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  Marketplace
                </Link>
                <Link
                  to="/catalog"
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-blue-50 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Catálogo
                </Link>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <Link
                    to="/client-login"
                    className="block px-4 py-3 text-blue-600 font-medium hover:bg-blue-50 rounded-xl transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/client"
                    className="block px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-center rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all"
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

      {/* Hero Section - Marketplace */}
      <section className="relative pt-24 pb-12 bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-lg text-white px-4 py-2 rounded-full mb-6">
              <ShoppingCart size={18} />
              <span className="font-medium">Marketplace Lucrazi</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Descubra e Compre <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">Infoprodutos</span>
            </h1>

            <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Cursos online, produtos digitais, serviços especializados e muito mais. Tudo que você precisa para aprender, crescer e empreender.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar cursos, produtos, serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/95 backdrop-blur-lg border border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4">
                <div className="text-2xl font-bold text-white">{topProducts.length}+</div>
                <div className="text-sm text-blue-100">Produtos</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4">
                <div className="text-2xl font-bold text-white">{courses.length}+</div>
                <div className="text-sm text-blue-100">Cursos</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4">
                <div className="text-2xl font-bold text-white">50+</div>
                <div className="text-sm text-blue-100">Criadores</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-sm text-blue-100">Acesso</div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
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
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
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
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Produtos e Serviços <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Digitais</span>
            </h2>
            <p className="text-gray-600 max-w-2xl">
              Explore nossa coleção completa de infoprodutos, serviços digitais e soluções para seu negócio.
            </p>
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
                          'bg-gradient-to-r from-blue-500 to-cyan-500'
                        }`}>
                          {product.badge || 'Produto'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                          {product.category}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-sm font-bold">{product.rating}</span>
                          <span className="text-gray-400 text-xs">({product.bookings} vendas)</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
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

                        <div className="flex items-center gap-2 text-blue-600 group-hover:text-blue-700 transition-colors">
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Cursos <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Online</span>
            </h2>
            <p className="text-gray-600 max-w-2xl">
              Aprenda com os melhores profissionais e desenvolva suas habilidades com cursos completos e atualizados.
            </p>
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${generateSlug(course.title || '')}`}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden border border-gray-100"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={course.imageUrl || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop'}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 text-xs font-bold text-white rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                        Curso
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                      {course.description}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <PlayCircle className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-gray-500">{course.duration || 'Duração variável'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-sm font-bold">{course.rating || '4.8'}</span>
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
                        <p className="text-xs text-gray-500">Acesso vitalício</p>
                      </div>

                      <div className="flex items-center gap-2 text-purple-600 group-hover:text-purple-700 transition-colors">
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
              Categorias em <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Destaque</span>
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
                className="group bg-white rounded-2xl border border-gray-200 hover:border-blue-300 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-blue-500 transition-colors" size={20} />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {categoryData.category}
                </h3>

                <p className="text-gray-600 text-sm mb-4">
                  {categoryData.products.length} produtos disponíveis
                </p>

                <div className="flex items-center gap-2 text-blue-600 group-hover:text-blue-700 transition-colors">
                  <span className="text-sm font-medium">Explorar</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Pronto para Começar sua Jornada?
            </h2>
            <p className="text-lg text-blue-100 mb-8">
              Crie sua conta gratuita e tenha acesso a milhares de infoprodutos, cursos e serviços digitais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
              >
                Criar Conta Gratuita
              </Link>
              <Link
                to="/catalog"
                className="px-8 py-4 bg-blue-500/20 text-white border border-white/30 font-semibold rounded-xl hover:bg-blue-500/30 transition-all"
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