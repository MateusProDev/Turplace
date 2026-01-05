import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import iconLogo from '../assets/iconlogo.png';
import { 
  Star, 
  Briefcase,
  ChevronRight,
  Sparkles,
  Zap,
  Users2,
  Award,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Shield,
  TrendingUp,
  DollarSign,
  Globe,
  MessageSquare,
  CheckCircle,
  Target,
  BarChart3,
  Heart,
  Clock,
  Smartphone,
  Headphones
} from "lucide-react";

// Site default gradient (nova paleta)
const siteGradient = 'from-[#0097b2] to-[#7ed957]';

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
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
                to="/como-funciona" 
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-[#0097b2]' : 'text-white/90 hover:text-white'}`}
              >
                Como Funciona
              </Link>
              <Link 
                to="/marketplace" 
                className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-[#0097b2]' : 'text-white/90 hover:text-white'}`}
              >
                Marketplace
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
                  Criar Conta
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
                  to="/como-funciona" 
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-[#0097b2]/10 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Como Funciona
                </Link>
                <Link 
                  to="/marketplace" 
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-[#0097b2]/10 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Marketplace
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
                    Criar Conta
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
                <span className="font-medium">Plataforma para Vendedores Digitais</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
                Venda Seus <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7ed957] to-[#0097b2]">Serviços Digitais</span> com Facilidade
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Conecte-se com milhares de clientes, gerencie seus serviços e receba pagamentos seguros em uma única plataforma.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center mb-16">
                <Link
                  to="/dashboard"
                  className="group relative px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-[#7ed957] to-[#0097b2] text-white rounded-2xl font-bold text-base sm:text-lg hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl hover:shadow-[#0097b2]/30 hover:scale-105 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <Briefcase size={22} />
                  <span>Criar Minha Conta</span>
                  <ArrowRight className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" size={20} />
                </Link>
                
                <Link
                  to="/como-funciona"
                  className="group px-8 sm:px-10 py-4 sm:py-5 bg-white/10 backdrop-blur-lg border-2 border-white/30 text-white rounded-2xl font-bold text-base sm:text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105"
                >
                  <MessageSquare size={22} />
                  <span>Saiba Como Funciona</span>
                  <ExternalLink className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" size={20} />
                </Link>
              </div>
            </div>
            
            {/* Stats - Professional Design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-24">
              {[
                { value: '0% Comissão', label: 'Na Primeira Venda', icon: <DollarSign className="text-[#7ed957]" />, color: siteGradient },
                { value: '+1000', label: 'Clientes Ativos', icon: <Users2 className="text-emerald-400" />, color: 'from-emerald-500 to-teal-600' },
                { value: '24/7', label: 'Suporte Online', icon: <Headphones className="text-amber-400" />, color: 'from-amber-500 to-orange-600' },
                { value: 'Seguro', label: 'Pagamentos', icon: <Shield className="text-[#0097b2]" />, color: siteGradient }
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
            <span className="text-white/60 text-sm font-medium">Saiba mais</span>
            <ChevronDown className="text-white/60" size={28} />
          </div>
        </div>
      </section>

      {/* Seção: Como Funciona */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0097b2]/10 to-[#7ed957]/10 text-[#0097b2] px-6 py-3 rounded-full mb-6">
              <Zap size={20} />
              <span className="font-semibold">Processo Simples</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Comece a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0097b2] to-[#7ed957]">Vender em 4 Passos</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Tudo que você precisa para iniciar sua jornada de vendas online
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                number: '01',
                icon: <UserPlus size={32} className="text-[#0097b2]" />,
                title: 'Crie sua Conta',
                description: 'Cadastro gratuito e rápido. Complete seu perfil profissional em minutos.',
                color: 'blue'
              },
              {
                number: '02',
                icon: <Briefcase size={32} className="text-[#7ed957]" />,
                title: 'Cadastre Serviços',
                description: 'Adicione seus serviços, defina preços e descreva suas ofertas.',
                color: 'green'
              },
              {
                number: '03',
                icon: <Globe size={32} className="text-[#0097b2]" />,
                title: 'Exponha seu Trabalho',
                description: 'Sua vitrine online vista por milhares de clientes potenciais.',
                color: 'blue'
              },
              {
                number: '04',
                icon: <DollarSign size={32} className="text-[#7ed957]" />,
                title: 'Receba Pedidos',
                description: 'Gerencie vendas, entregue serviços e receba pagamentos seguros.',
                color: 'green'
              }
            ].map((step, index) => (
              <div 
                key={index}
                className="group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <div className="relative">
                  <div className="text-5xl font-bold text-gray-100 mb-4">{step.number}</div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0097b2]/10 to-[#7ed957]/10 flex items-center justify-center mb-6">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color === 'blue' ? 'from-[#0097b2] to-[#7ed957]' : 'from-[#7ed957] to-[#0097b2]'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção: Vantagens da Lucrazi */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 px-6 py-3 rounded-full mb-6">
                <Award size={20} />
                <span className="font-semibold">Por que Escolher a Lucrazi</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Tudo que Você <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Precisa para Vender Online</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Shield className="text-[#0097b2]" size={32} />,
                  title: 'Pagamentos Seguros',
                  description: 'Sistema de pagamento integrado e protegido. Receba direto na sua conta.',
                  features: ['Proteção antifraude', 'Pagamentos automáticos', 'Extrato detalhado']
                },
                {
                  icon: <TrendingUp className="text-[#7ed957]" size={32} />,
                  title: 'Crescimento Garantido',
                  description: 'Ferramentas para aumentar suas vendas e fidelizar clientes.',
                  features: ['Análises de desempenho', 'Ferramentas de marketing', 'Clientes recorrentes']
                },
                {
                  icon: <Smartphone className="text-[#0097b2]" size={32} />,
                  title: 'Plataforma Mobile',
                  description: 'Gerencie seus negócios de qualquer lugar pelo celular.',
                  features: ['App dedicado', 'Notificações em tempo real', 'Gestão na palma da mão']
                },
                {
                  icon: <Headphones className="text-[#7ed957]" size={32} />,
                  title: 'Suporte Dedicado',
                  description: 'Equipe especializada para ajudar no seu sucesso.',
                  features: ['Suporte 24/7', 'Treinamentos online', 'Comunidade ativa']
                },
                {
                  icon: <BarChart3 className="text-[#0097b2]" size={32} />,
                  title: 'Dashboard Completo',
                  description: 'Controle total sobre suas vendas, clientes e finanças.',
                  features: ['Métricas detalhadas', 'Relatórios personalizados', 'Insights valiosos']
                },
                {
                  icon: <Target className="text-[#7ed957]" size={32} />,
                  title: 'Alcance Ampliado',
                  description: 'Conecte-se com milhares de clientes em busca de serviços.',
                  features: ['Vitrine visível', 'Busca otimizada', 'Recomendações inteligentes']
                }
              ].map((benefit, index) => (
                <div 
                  key={index}
                  className="group bg-gradient-to-br from-white to-gray-50 rounded-3xl p-8 border border-gray-200 hover:border-[#0097b2]/30 transition-all duration-300 hover:shadow-xl"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0097b2]/10 to-[#7ed957]/10 flex items-center justify-center mb-6">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                  <p className="text-gray-600 mb-6">{benefit.description}</p>
                  <div className="space-y-3">
                    {benefit.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <CheckCircle className="text-[#7ed957] flex-shrink-0" size={18} />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Depoimentos */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 px-6 py-3 rounded-full mb-6">
              <Heart size={20} />
              <span className="font-semibold">Histórias de Sucesso</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              O que Nossos <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">Vendedores Dizem</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: 'Ana Silva',
                role: 'Designer Gráfica',
                content: 'A Lucrazi transformou meu negócio. Em 3 meses, aumentei minhas vendas em 200%. A plataforma é intuitiva e os clientes chegam direto!',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop'
              },
              {
                name: 'Carlos Mendes',
                role: 'Consultor de Marketing',
                content: 'O dashboard de analytics é incrível. Consigo entender melhor meu público e otimizar meus serviços. Suporte excelente!',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop'
              },
              {
                name: 'Beatriz Costa',
                role: 'Desenvolvedora Web',
                content: 'Como freelancer, organização era meu maior desafio. A Lucrazi automatizou processos e agora dedico mais tempo aos projetos.',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop'
              }
            ].map((testimonial, index) => (
              <div 
                key={index}
                className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-6">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-[#0097b2] font-medium">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="text-amber-400 fill-current" size={18} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção: Perguntas Frequentes */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0097b2]/10 to-[#7ed957]/10 text-[#0097b2] px-6 py-3 rounded-full mb-6">
                <MessageSquare size={20} />
                <span className="font-semibold">Tire suas Dúvidas</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Perguntas <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0097b2] to-[#7ed957]">Frequentes</span>
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  question: 'A Lucrazi é gratuita?',
                  answer: 'Sim! O cadastro e uso básico da plataforma são gratuitos. Cobramos uma pequena comissão apenas sobre as vendas realizadas.'
                },
                {
                  question: 'Quais tipos de serviços posso vender?',
                  answer: 'Qualquer serviço digital: design, programação, marketing, consultoria, redação, tradução, edição de vídeo, e muito mais.'
                },
                {
                  question: 'Como recebo os pagamentos?',
                  answer: 'Os pagamentos são processados de forma segura e depositados diretamente na sua conta bancária, conforme sua preferência.'
                },
                {
                  question: 'Preciso ter experiência com tecnologia?',
                  answer: 'Não! Nossa plataforma foi desenvolvida para ser intuitiva. Além disso, oferecemos suporte e tutoriais para ajudar você.'
                },
                {
                  question: 'Posso usar no celular?',
                  answer: 'Sim! Temos aplicativo mobile e versão responsiva para você gerenciar suas vendas de qualquer lugar.'
                }
              ].map((faq, index) => (
                <div 
                  key={index}
                  className="group bg-gray-50 rounded-2xl p-6 hover:bg-gradient-to-r hover:from-[#0097b2]/5 hover:to-[#7ed957]/5 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">{faq.question}</h3>
                    <ChevronRight className="text-[#0097b2] transform group-hover:rotate-90 transition-transform" size={20} />
                  </div>
                  <p className="mt-4 text-gray-600 hidden group-hover:block animate-fade-in">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
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
              <span className="font-semibold">Oportunidade Única</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-8">
              Comece a Vender Hoje Mesmo!
            </h2>
            
            <p className="text-lg sm:text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
              Cadastro gratuito. Sem custos iniciais. Aproveite a promoção de 0% de comissão na primeira venda!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link
                to="/dashboard"
                className="group px-8 sm:px-12 py-4 sm:py-6 bg-white text-[#0097b2] rounded-2xl font-bold text-lg sm:text-xl hover:bg-gray-50 transition-all shadow-2xl hover:shadow-white/30 hover:scale-105 flex items-center justify-center gap-3"
              >
                <Briefcase size={24} />
                <span>Criar Conta Gratuita</span>
                <ArrowUpRight className="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={24} />
              </Link>
              
              <Link
                to="/como-funciona"
                className="group px-8 sm:px-12 py-4 sm:py-6 bg-transparent border-2 border-white text-white rounded-2xl font-bold text-lg sm:text-xl hover:bg-white/10 transition-all backdrop-blur-sm hover:scale-105 flex items-center justify-center gap-3"
              >
                <Clock size={24} />
                <span>Agendar Demonstração</span>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { icon: <CheckCircle className="text-[#7ed957]" size={24} />, text: "Cadastro em 5 minutos" },
                { icon: <Shield className="text-white" size={24} />, text: "Segurança garantida" },
                { icon: <Headphones className="text-amber-300" size={24} />, text: "Suporte especializado" }
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
                A plataforma para vendedores de serviços digitais.
              </p>
            </div>
            
            {/* Para Vendedores */}
            <div>
              <h3 className="text-lg font-bold mb-6">Para Vendedores</h3>
              <ul className="space-y-4">
                <li><Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">Criar Conta <ArrowRight size={14} /></Link></li>
                <li><Link to="/como-funciona" className="text-gray-400 hover:text-white transition-colors">Como Funciona</Link></li>
                <li><Link to="/success" className="text-gray-400 hover:text-white transition-colors">Casos de Sucesso</Link></li>
              </ul>
            </div>
            
            {/* Recursos */}
            <div>
              <h3 className="text-lg font-bold mb-6">Recursos</h3>
              <ul className="space-y-4">
                <li><Link to="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors">Central de Ajuda</Link></li>
                <li><Link to="/tutorials" className="text-gray-400 hover:text-white transition-colors">Tutoriais</Link></li>
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h3 className="text-lg font-bold mb-6">Legal</h3>
              <ul className="space-y-4">
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacidade</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contato</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-sm mb-4">
              © {new Date().getFullYear()} Lucrazi. Todos os direitos reservados.
            </p>
            <p className="text-gray-600 text-sm">
              Transformando ideias em negócios digitais de sucesso.
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

// Componente auxiliar para ícones
function UserPlus({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}