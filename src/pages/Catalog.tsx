import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import { generateSlug } from "../utils/slug";
import { 
  Search, 
  MapPin, 
  Tag, 
  Image as ImageIcon, 
  Filter, 
  X, 
  Eye,
  TrendingUp,
  ChevronRight,
  Star,
  Heart
} from "lucide-react";

interface Service {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  city?: string;
  views?: number;
  leads?: number;
  images?: string[];
  price?: string;
  status?: string;
  userId?: string;
  slug?: string;
  rating?: number;
  bookings?: number;
  ownerName?: string;
  billingType?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  image?: string;
  sections: any[];
  status: 'draft' | 'published';
  createdAt: any;
  updatedAt: any;
  instructorId: string;
  totalStudents?: number;
  rating?: number;
  views?: number;
}

interface CatalogItem extends Service {
  type: 'service' | 'course';
  courseData?: Course;
}

export default function Catalog() {
  const [services, setServices] = useState<Service[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<{category?: string, city?: string}>({});
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filtered, setFiltered] = useState<CatalogItem[]>([]);

  useEffect(() => {
    const servicesQuery = query(collection(db, "services"), where("status", "==", "approved"));
    const coursesQuery = query(collection(db, "courses"), where("status", "==", "published"));
    
    const unsubServices = onSnapshot(servicesQuery, snapshot => {
      const servicesData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        views: doc.data().views || 0,
        leads: doc.data().leads || 0
      })) as Service[];
      setServices(servicesData);
    });

    const unsubCourses = onSnapshot(coursesQuery, snapshot => {
      const coursesData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data()
      })) as Course[];
      setCourses(coursesData);
    });

    // Aguardar ambos os snapshots iniciais
    setTimeout(() => setLoading(false), 1000);

    return () => {
      unsubServices();
      unsubCourses();
    };
  }, []);

  // Extrair categorias e cidades únicas
  useEffect(() => {
    const serviceCategories = [...new Set(services.map((s: Service) => s.category).filter((c): c is string => c !== undefined))];
    const courseCategories = courses.length > 0 ? ["Cursos"] : [];
    const uniqueCategories = [...new Set([...serviceCategories, ...courseCategories])];
    
    const uniqueCities = [...new Set(services.map((s: Service) => s.city).filter((c): c is string => c !== undefined))];
    
    // Ordenar alfabeticamente
    setCategories(uniqueCategories.sort());
    setCities(uniqueCities.sort());
  }, [services, courses]);

  useEffect(() => {
    // Combinar serviços e cursos
    const allItems: CatalogItem[] = [
      ...services.map(service => ({ ...service, type: 'service' as const })),
      ...courses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        category: 'Cursos',
        images: course.image ? [course.image] : [],
        price: course.price?.toString(),
        billingType: 'one-time',
        type: 'course' as const,
        courseData: course,
        views: course.views || 0,
        rating: course.rating || 0
      }))
    ];
    
    let result = allItems;
    
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((item: CatalogItem) =>
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower)
      );
    }
    
    if (category) {
      result = result.filter((item: CatalogItem) => item.category === category);
    }
    
    if (city) {
      result = result.filter((item: CatalogItem) => item.city === city);
    }
    
    // Ordenar por visualizações (mais populares primeiro)
    result = result.sort((a: CatalogItem, b: CatalogItem) => (b.views || 0) - (a.views || 0));
    
    setFiltered(result);
    setActiveFilters({ category, city });
  }, [services, courses, search, category, city]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setCity("");
    setActiveFilters({});
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Catálogo de Serviços Turísticos
            </h1>
            <p className="text-lg opacity-90 max-w-3xl mx-auto">
              Encontre os melhores prestadores, guias e experiências para seu negócio ou viagem
            </p>
          </div>
          
          {/* Barra de busca principal */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
              <input
                type="text"
                placeholder="Buscar serviços, guias, tours, experiências..."
                className="w-full pl-14 pr-4 py-4 rounded-xl border-0 text-gray-900 text-lg focus:ring-3 focus:ring-blue-300 focus:outline-none shadow-lg"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          {/* Estatísticas rápidas minimalistas */}
          <div className="flex justify-center items-center gap-2 sm:gap-4 md:gap-6 text-center flex-row flex-nowrap mb-2 mt-4">
            <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 min-w-[80px]">
              <Eye className="text-blue-100 mb-1" size={20} />
              <span className="text-lg font-bold leading-none">{services.length + courses.length}</span>
              <span className="text-xs opacity-90 leading-none">Serviços & Cursos</span>
            </div>
            <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 min-w-[80px]">
              <Tag className="text-blue-100 mb-1" size={20} />
              <span className="text-lg font-bold leading-none">{categories.length}</span>
              <span className="text-xs opacity-90 leading-none">Categorias</span>
            </div>
            <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-lg px-2 py-2 min-w-[80px]">
              <MapPin className="text-blue-100 mb-1" size={20} />
              <span className="text-lg font-bold leading-none">{cities.length}</span>
              <span className="text-xs opacity-90 leading-none">Cidades</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header com filtros e ações */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Serviços e Cursos Disponíveis
              {search && ` para "${search}"`}
            </h2>
            
            {/* Filtros ativos */}
            {(activeFilters.category || activeFilters.city) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {activeFilters.category && (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    <Tag size={14} />
                    {activeFilters.category}
                    <button onClick={() => setCategory("")}>
                      <X size={14} className="ml-1" />
                    </button>
                  </span>
                )}
                {activeFilters.city && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm">
                    <MapPin size={14} />
                    {activeFilters.city}
                    <button onClick={() => setCity("")}>
                      <X size={14} className="ml-1" />
                    </button>
                  </span>
                )}
                <button 
                  onClick={clearFilters}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Limpar todos
                </button>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Botão filtros mobile */}
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter size={20} />
              Filtros
            </button>
            
            <Link 
              to="/dashboard" 
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition"
            >
              <TrendingUp size={20} />
              Cadastrar meu serviço
            </Link>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar de Filtros */}
          <div className={`lg:w-1/4 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 lg:sticky lg:top-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Filter size={20} />
                  Filtros
                </h3>
                <button 
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Limpar tudo
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Categorias */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Tag size={18} />
                    Categoria
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                {/* Cidades */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MapPin size={18} />
                    Localização
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                  >
                    <option value="">Todas as cidades</option>
                    {cities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                
                {/* Status */}
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3">Dica</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      💡 Serviços com mais visualizações aparecem primeiro
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Categorias populares */}
            <div className="hidden lg:block bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Categorias Populares</h3>
              <div className="space-y-2">
                {categories.slice(0, 6).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat === category ? "" : cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${category === cat ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="lg:w-3/4">
            {/* Contador e ordenação */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="text-gray-600">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Carregando serviços...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{filtered.length}</span>
                    <span>serviço(s) encontrado(s)</span>
                    {search && (
                      <span className="text-blue-600">para "{search}"</span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600">
                Ordenado por: <span className="font-semibold text-gray-900">Mais populares</span>
              </div>
            </div>

            {/* Grid de serviços */}
            {filtered.length === 0 && !loading ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-gray-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Nenhum serviço ou curso encontrado
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Tente ajustar seus filtros de busca ou explore outras categorias.
                </p>
                <button 
                  onClick={clearFilters}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((item: CatalogItem) => (
                  <Link
                    key={item.id}
                    to={item.type === 'course' ? `/course/${generateSlug(item.title || '')}` : `/service/${generateSlug(item.title || '')}`}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 group block"
                  >
                    {/* Imagem do item */}
                    <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images?.[0]}
                          alt={item.title || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="text-gray-300" size={48} />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {item.views && item.views > 100 && (
                          <span className="bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                            <Eye size={10} />
                            {formatNumber(item.views || 0)}
                          </span>
                        )}
                        <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                          {item.category}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="absolute top-3 right-3">
                        <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Disponível
                        </span>
                      </div>
                    </div>

                    {/* Conteúdo do card */}
                    <div className="p-5 flex flex-col h-[calc(100%-12rem)]">
                      <div className="mb-3">
                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-700 transition">
                          {item.title}
                        </h3>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            {item.category}
                          </span>
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-xs font-bold">{item.rating || 0}</span>
                            <span className="text-gray-400 text-xs">({item.bookings || item.courseData?.totalStudents || 0})</span>
                          </div>
                        </div>

                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                          Por <span className="font-medium text-gray-900">{item.ownerName || 'Instrutor'}</span>
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Eye className="w-3 h-3" />
                            <span className="text-xs font-medium">{item.views?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Heart className="w-3 h-3 text-rose-500" />
                            <span className="text-xs font-medium">{item.bookings || item.courseData?.totalStudents || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Preço e CTA */}
                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-lg font-bold text-gray-900">
                              R$ {item.price ? parseFloat(item.price.replace(',', '.'))?.toFixed(2).replace('.', ',') : '0,00'}
                            </div>
                            <p className="text-xs text-gray-500">
                              {item.billingType === 'subscription' ? 'por mês' : 'valor único'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium rounded-lg shadow-sm text-xs opacity-90 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver detalhes</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            
            {/* Paginação simples */}
            {filtered.length > 0 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 bg-white rounded-lg shadow px-4 py-2">
                  <span className="text-gray-600">Mostrando</span>
                  <span className="font-semibold text-gray-900">{Math.min(filtered.length, 9)}</span>
                  <span className="text-gray-600">de</span>
                  <span className="font-semibold text-gray-900">{filtered.length}</span>
                  <span className="text-gray-600">serviços e cursos</span>
                </div>
              </div>
            )}
            
            {/* CTA final */}
            <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-4">Seu serviço ou curso não está aqui?</h3>
              <p className="text-lg mb-6 opacity-90">
                Cadastre gratuitamente e alcance centenas de agências, viajantes e alunos
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-blue-700 rounded-xl font-bold hover:bg-gray-100 transition text-lg shadow-lg"
              >
                Cadastrar meu serviço
                <ChevronRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}