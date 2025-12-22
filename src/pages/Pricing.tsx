import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { loadStripe } from '@stripe/stripe-js';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Star, Zap, Crown, TrendingUp, Users, BarChart3, Shield } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceText: 'Gratuito',
    priceId: 'price_1SeyezKlR2RHdJ4pFFVMA5fb',
    commission: '12%',
    icon: Shield,
    color: 'gray',
    description: 'Perfeito para começar',
    features: [
      'Taxa de 12% por transação',
      'Acesso completo à plataforma',
      'Até 10 serviços cadastrados',
      'Lead page personalizada',
      'Suporte básico'
    ],
  },
  {
    id: 'professional',
    name: 'Pro',
    priceText: 'R$9,99 / mês',
    priceId: 'price_1Seyf0KlR2RHdJ4ptJNmAuKi',
    commission: '8%',
    icon: Star,
    color: 'blue',
    description: 'Para profissionais estabelecidos',
    features: [
      'Taxa reduzida de 8% por transação',
      'Destaque no catálogo',
      'Perfil verificado',
      'Até 20 serviços cadastrados',
      '3 modelos de lead page',
      'Domínio personalizado',
      'Suporte prioritário'
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceText: 'R$19,99 / mês',
    priceId: 'price_1Seyf1KlR2RHdJ4psFoH3WrA',
    commission: '3,99%',
    icon: Crown,
    color: 'purple',
    description: 'Máximo desempenho',
    features: [
      'Taxa mínima de 3,99% por transação',
      'Topo da categoria',
      'Leads prioritários',
      'Até 100 serviços cadastrados',
      '5 modelos de lead page',
      'Domínio personalizado',
      'Analytics avançado',
      'Suporte VIP 24/7',
      'Relatórios personalizados'
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | false>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  async function handleSubscribe(priceId: string) {
    if (loading) return;
    setError(null);
    setLoading(priceId);
    try {
      const apiBase = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE || 'http://localhost:3000');
      const body: Record<string, unknown> = { priceId };
      if (user) {
        body.userId = user.uid;
        body.customerEmail = user.email || null;
      }
      const res = await fetch(`${apiBase}/api/create-subscription-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const txt = await res.text();
        try { data = JSON.parse(txt); } catch { data = { error: txt || 'Resposta inválida do servidor' }; }
      }

      if (!res.ok) {
        setError(data && data.error ? data.error : `Erro ${res.status}: ${res.statusText}`);
        return;
      }

      if (data && data.sessionId) {
        const pubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || (window as unknown as { __STRIPE_PUB_KEY?: string }).__STRIPE_PUB_KEY;
        if (pubKey) {
          const stripe = await loadStripe(pubKey);
          if (stripe) {
            await (stripe as unknown as { redirectToCheckout: (options: { sessionId: string }) => Promise<unknown> }).redirectToCheckout({ sessionId: data.sessionId });
            return;
          }
        }
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        setError('Sessão criada, mas não foi possível redirecionar automaticamente.');
      } else if (data && data.error) {
        setError(data.error);
      } else {
        setError('Erro inesperado ao criar sessão de pagamento.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao iniciar checkout. Verifique sua conexão ou tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha seu Plano
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Todos os planos incluem acesso completo à plataforma Turplace.
            A diferença está na taxa cobrada por transação - quanto mais você investe mensalmente,
            menos paga por venda realizada.
          </p>

          {/* Tax Comparison */}
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-4xl mx-auto mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Comparação de Taxas</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-600 mb-2">12%</div>
                <div className="text-sm text-gray-600">Plano Free</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">8%</div>
                <div className="text-sm text-blue-600">Plano Pro</div>
                <div className="text-xs text-blue-500 mt-1">Economia de 4%</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-2">3,99%</div>
                <div className="text-sm text-purple-600">Plano Premium</div>
                <div className="text-xs text-purple-500 mt-1">Economia de 8,01%</div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              * Taxas calculadas sobre o valor de cada transação realizada na plataforma<br/>
              <strong>Sem taxa fixa por venda. Sem surpresa. Sem letra miúda.</strong>
            </p>
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Comparação com o Mercado</h3>
              <p className="text-sm text-green-700">
                Hotmart/Eduzz: ~11% a 14%<br/>
                Turplace Pro: ~12,4%<br/>
                Turplace Premium: ~8,3% ✅
              </p>
              <p className="text-xs text-green-600 mt-2">
                Para venda de R$100 no cartão, incluindo taxa do Stripe (~2,9% + R$0,30).
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200 max-w-2xl mx-auto">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {PLANS.map(p => {
            const IconComponent = p.icon;
            const isPopular = p.id === 'professional';
            return (
              <div
                key={p.id}
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                  isPopular ? 'border-blue-500 scale-105' : 'border-gray-200'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-lg ${
                      p.color === 'gray' ? 'bg-gray-100' :
                      p.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        p.color === 'gray' ? 'text-gray-600' :
                        p.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{p.name}</h3>
                      <p className="text-gray-600">{p.description}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="text-4xl font-bold text-gray-900 mb-2">{p.priceText}</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      p.color === 'gray' ? 'bg-gray-100 text-gray-700' :
                      p.color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      <TrendingUp size={14} />
                      Taxa: {p.commission}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {p.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(p.priceId)}
                    disabled={!!loading}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                      p.color === 'gray'
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : p.color === 'blue'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === p.priceId ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        Processando...
                      </>
                    ) : (
                      <>
                        {p.id === 'free' ? 'Começar Grátis' : 'Assinar Agora'}
                        <Zap size={20} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Recursos Avançados</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Modelos de Lead Pages
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Free:</span>
                    <span className="font-semibold">1 modelo</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profissional:</span>
                    <span className="font-semibold text-blue-600">3 modelos</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Premium:</span>
                    <span className="font-semibold text-purple-600">5 modelos</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Domínio Personalizado
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Use seu próprio domínio nas lead pages (planos Pro e Premium)
                </p>
                <div className="text-xs text-gray-500">
                  Ex: minhapagina.com ao invés de turplace.com/seu-servico
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Por que escolher um plano pago?</h3>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Mais Lucro</h4>
                <p className="text-gray-600 text-sm">
                  Reduza suas taxas de transação e aumente seus ganhos por serviço prestado.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Mais Visibilidade</h4>
                <p className="text-gray-600 text-sm">
                  Apareça em posições privilegiadas no catálogo e atraia mais clientes.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Melhor Controle</h4>
                <p className="text-gray-600 text-sm">
                  Acesse analytics avançados e tome decisões baseadas em dados reais.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

