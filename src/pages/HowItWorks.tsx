import { Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  Search,
  CheckCircle,
  Star,
  Shield,
  Zap,
  Target,
  TrendingUp,
  MessageCircle,
  Calendar,
  CreditCard,
  Award, 
  MapPin,
  Camera,
  Coffee,
  Car,
  Building,
  Compass
} from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              <img src="/vite.svg" alt="Turplace" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-900">Turplace</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">Início</Link>
              <Link to="/catalog" className="text-gray-600 hover:text-blue-600 transition-colors">Catálogo</Link>
              <Link to="/how-it-works" className="text-blue-600 font-semibold">Como Funciona</Link>
              <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Entrar
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full mb-6">
              <Zap size={18} />
              <span className="font-medium">Guia Completo</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Como <span className="text-cyan-200">Funciona</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Entenda passo a passo como nossa plataforma conecta prestadores de serviços,
              agências de viagem e clientes em uma experiência premium.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {/* Para Prestadores */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 px-6 py-3 rounded-full mb-6">
                <Briefcase size={20} />
                <span className="font-semibold">Para Prestadores de Serviços</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Comece seu Negócio no Turismo
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Transforme seu conhecimento local em renda extra ou negócio principal
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Cadastre-se Gratuitamente",
                  description: "Crie seu perfil profissional em poucos minutos. Adicione suas especialidades, experiência e localização.",
                  icon: <Users className="text-blue-600" size={32} />,
                  features: ["Perfil verificado", "Sem custos iniciais", "Suporte dedicado"]
                },
                {
                  step: "2",
                  title: "Configure seus Serviços",
                  description: "Adicione fotos, descrições detalhadas, preços e disponibilidade dos seus serviços turísticos.",
                  icon: <Camera className="text-emerald-600" size={32} />,
                  features: ["Galeria de fotos", "Descrições ricas", "Preços flexíveis"]
                },
                {
                  step: "3",
                  title: "Receba Solicitações",
                  description: "Agências e clientes encontram seus serviços. Receba propostas e feche negócios diretamente pela plataforma.",
                  icon: <MessageCircle className="text-amber-600" size={32} />,
                  features: ["Notificações instantâneas", "Sistema de propostas", "Avaliações e feedback"]
                }
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">{item.step}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{item.description}</p>
                  <div className="space-y-2">
                    {item.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <CheckCircle className="text-green-500" size={16} />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Para Agências */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 px-6 py-3 rounded-full mb-6">
                <Building size={20} />
                <span className="font-semibold">Para Agências de Viagem</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Expanda seu Portfólio de Serviços
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Ofereça experiências únicas e serviços especializados aos seus clientes
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Explore o Catálogo",
                  description: "Navegue por centenas de serviços turísticos verificados e experiências exclusivas.",
                  icon: <Search className="text-blue-600" size={32} />,
                  features: ["Busca avançada", "Filtros por categoria", "Avaliações reais"]
                },
                {
                  step: "2",
                  title: "Entre em Contato",
                  description: "Conecte-se diretamente com prestadores. Negocie condições especiais para seus clientes.",
                  icon: <MessageCircle className="text-emerald-600" size={32} />,
                  features: ["Chat integrado", "Negociação direta", "Contratos digitais"]
                },
                {
                  step: "3",
                  title: "Ofereça Experiências Premium",
                  description: "Inclua serviços exclusivos nos seus pacotes turísticos e aumente o valor percebido.",
                  icon: <Star className="text-amber-600" size={32} />,
                  features: ["Pacotes personalizados", "Comissões atrativas", "Suporte 24/7"]
                }
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-bold text-emerald-600">{item.step}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{item.description}</p>
                  <div className="space-y-2">
                    {item.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <CheckCircle className="text-green-500" size={16} />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefícios Gerais */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 px-6 py-3 rounded-full mb-6">
                <Award size={20} />
                <span className="font-semibold">Benefícios da Plataforma</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Por que escolher o Turplace?
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Shield className="text-blue-600" size={28} />,
                  title: "Segurança e Confiança",
                  description: "Todos os prestadores são verificados e as transações são protegidas."
                },
                {
                  icon: <TrendingUp className="text-emerald-600" size={28} />,
                  title: "Crescimento Garantido",
                  description: "Aumente sua visibilidade e alcance novos clientes todos os dias."
                },
                {
                  icon: <Target className="text-amber-600" size={28} />,
                  title: "Foco no Turismo Local",
                  description: "Conectamos experiências autênticas e conhecimento local valioso."
                },
                {
                  icon: <Zap className="text-blue-600" size={28} />,
                  title: "Processo Simplificado",
                  description: "Interface intuitiva e ferramentas que facilitam seu trabalho."
                },
                {
                  icon: <CreditCard className="text-emerald-600" size={28} />,
                  title: "Pagamentos Seguros",
                  description: "Receba seus pagamentos de forma segura e transparente."
                },
                {
                  icon: <Calendar className="text-amber-600" size={28} />,
                  title: "Flexibilidade Total",
                  description: "Gerencie sua agenda e disponibilidade como preferir."
                }
              ].map((benefit, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center mb-4">
                    {benefit.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Categorias Populares */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Categorias <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Populares</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Descubra os tipos de serviços mais procurados na nossa plataforma
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <Compass className="text-blue-600" />, name: "Passeios e Tours", count: "150+ serviços" },
                { icon: <Users className="text-emerald-600" />, name: "Guias Locais", count: "80+ profissionais" },
                { icon: <Car className="text-amber-600" />, name: "Transporte", count: "60+ opções" },
                { icon: <Coffee className="text-blue-600" />, name: "Gastronomia", count: "90+ experiências" },
                { icon: <Building className="text-emerald-600" />, name: "Hospedagem", count: "40+ parceiros" },
                { icon: <Camera className="text-amber-600" />, name: "Fotografia", count: "35+ fotógrafos" },
                { icon: <Star className="text-blue-600" />, name: "Experiências", count: "120+ atividades" },
                { icon: <MapPin className="text-emerald-600" />, name: "Turismo Local", count: "200+ destinos" }
              ].map((category, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    {category.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Final */}
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl p-12 text-white">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Pronto para Começar?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Junte-se à nossa comunidade de profissionais do turismo e descubra novas oportunidades de negócio.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/login"
                  className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105"
                >
                  Começar Agora
                </Link>
                <Link
                  to="/catalog"
                  className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-2xl font-bold hover:bg-white/10 transition-all hover:scale-105"
                >
                  Explorar Serviços
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 mb-4">
            © 2025 Turplace. Todos os direitos reservados.
          </p>
          <p className="text-gray-500 text-sm">
            Plataforma profissional para o turismo local.
          </p>
        </div>
      </footer>
    </div>
  );
}
