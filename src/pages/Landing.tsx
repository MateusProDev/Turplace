import { Link } from "react-router-dom";
import { 
  MapPin, 
  Users, 
  Star, 
  TrendingUp, 
  Search, 
  Shield, 
  Globe, 
  Camera,
  Briefcase,
  Car,
  Coffee,
  Compass
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/src/assets/logosemfundo.png" alt="Turplace" className="w-40 h-14 object-cover" style={{objectPosition: 'center 60%'}} />
          </div>
          <div className="flex gap-4">
            <Link 
              to="/catalog" 
              className="px-4 py-2 text-blue-700 font-medium hover:text-blue-900 transition"
            >
              Catálogo
            </Link>
            <Link 
              to="/login" 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Star size={16} /> MVP Beta - Seja um dos primeiros a participar!
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            O <span className="text-blue-600">marketplace</span> de turismo local
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Conectamos criadores de experiências, prestadores de serviços turísticos e agências de viagens em uma única plataforma. 
            Cadastre seu serviço, ganhe visibilidade e cresça no turismo local!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/catalog"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition flex items-center justify-center gap-3 shadow-lg"
            >
              <Search size={20} /> Encontrar serviços turísticos
            </Link>
            <Link
              to="/dashboard"
              className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-semibold text-lg hover:bg-emerald-700 transition flex items-center justify-center gap-3 shadow-lg"
            >
              <Briefcase size={20} /> Cadastrar meu serviço
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl font-bold text-blue-700">100+</div>
              <div className="text-gray-500">Prestadores</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl font-bold text-blue-700">50+</div>
              <div className="text-gray-500">Agências</div>
            </div>
            <div className="bg-white p-6 rounded-xl rounded-xl shadow-sm">
              <div className="text-3xl font-bold text-blue-700">200+</div>
              <div className="text-gray-500">Experiências</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl font-bold text-blue-700">15+</div>
              <div className="text-gray-500">Cidades</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Como funciona</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="text-blue-600" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Para Prestadores</h3>
              <p className="text-gray-600">
                Crie seu perfil, cadastre serviços e produtos turísticos, receba solicitações e aumente sua renda.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="text-emerald-600" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Para Agências</h3>
              <p className="text-gray-600">
                Encontre guias, transportes, hospedagens e experiências únicas para oferecer aos seus clientes.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="text-purple-600" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Para Criadores</h3>
              <p className="text-gray-600">
                Divulgue roteiros, tours fotográficos, conteúdo exclusivo e monetize seu conhecimento local.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Showcase */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Encontre tudo para seu negócio turístico</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Compass className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-lg font-bold">Guias e Tours</h3>
                </div>
                <p className="text-gray-600 mb-4">Guias locais, roteiros personalizados, tours temáticos e passeios exclusivos.</p>
                <Link to="/catalog?category=guides" className="text-blue-600 font-medium hover:text-blue-800">
                  Explorar →
                </Link>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-emerald-100 p-3 rounded-lg">
                    <Car className="text-emerald-600" size={24} />
                  </div>
                  <h3 className="text-lg font-bold">Transportes</h3>
                </div>
                <p className="text-gray-600 mb-4">Transfer aeroporto, aluguel de veículos, motoristas particulares e táxis turísticos.</p>
                <Link to="/catalog?category=transport" className="text-blue-600 font-medium hover:text-blue-800">
                  Explorar →
                </Link>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Coffee className="text-purple-600" size={24} />
                  </div>
                  <h3 className="text-lg font-bold">Experiências</h3>
                </div>
                <p className="text-gray-600 mb-4">Gastronomia, aventura, cultura, workshops fotográficos e imersões locais.</p>
                <Link to="/catalog?category=experiences" className="text-blue-600 font-medium hover:text-blue-800">
                  Explorar →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-emerald-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Comece a usar agora mesmo</h2>
          <p className="text-blue-100 text-xl mb-10 max-w-2xl mx-auto">
            Cadastro gratuito para prestadores. Aumente suas vendas e alcance novos clientes no turismo local.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-2xl"
            >
              Cadastrar-se gratuitamente
            </Link>
            <Link
              to="/catalog"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition"
            >
              Explorar catálogo
            </Link>
          </div>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-blue-100">
            <div className="flex items-center gap-2">
              <Shield size={20} /> Segurança e confiança
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={20} /> Aumento de renda
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={20} /> Foco no turismo local
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={24} className="text-blue-400" />
                <h2 className="text-xl font-bold">Turplace</h2>
              </div>
              <p className="text-gray-400">Marketplace de turismo local</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 md:gap-12">
              <div>
                <h3 className="font-bold mb-3">Para Prestadores</h3>
                <ul className="text-gray-400 space-y-2">
                  <li><Link to="/register" className="hover:text-white">Cadastrar serviços</Link></li>
                  <li><Link to="/how-it-works" className="hover:text-white">Como funciona</Link></li>
                  <li><Link to="/pricing" className="hover:text-white">Planos</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold mb-3">Para Agências</h3>
                <ul className="text-gray-400 space-y-2">
                  <li><Link to="/catalog" className="hover:text-white">Encontrar serviços</Link></li>
                  <li><Link to="/partnerships" className="hover:text-white">Parcerias</Link></li>
                  <li><Link to="/contact" className="hover:text-white">Contato</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} Turplace. Todos os direitos reservados.</p>
            <p className="mt-2">MVP Beta — Foco em catálogo e geração de leads.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}