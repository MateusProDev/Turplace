import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceText: 'Gratuito',
    priceId: 'price_1SeyezKlR2RHdJ4pFFVMA5fb',
    features: ['Sem destaque', 'Sem analytics'],
  },
  {
    id: 'professional',
    name: 'Profissional',
    priceText: 'R$9,90 / mês',
    priceId: 'price_1Seyf0KlR2RHdJ4ptJNmAuKi',
    features: ['Destaque no catálogo', 'Perfil verificado'],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceText: 'R$19,90 / mês',
    priceId: 'price_1Seyf1KlR2RHdJ4psFoH3WrA',
    features: ['Topo da categoria', 'Leads prioritários', 'Analytics avançado'],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | false>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(priceId: string) {
    if (loading) return;
    setError(null);
    setLoading(priceId);
    try {
      // In production use relative /api so the same origin (Vercel) works.
      const apiBase = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE || 'http://localhost:3000');
      const res = await fetch(`${apiBase}/api/create-subscription-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const txt = await res.text();
        try { data = JSON.parse(txt); } catch (e) { data = { error: txt || 'Resposta inválida do servidor' }; }
      }

      if (!res.ok) {
        setError(data && data.error ? data.error : `Erro ${res.status}: ${res.statusText}`);
        return;
      }

      if (data && data.sessionId) {
        // Carrega Stripe.js dinamicamente
        const pubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || (window as any).__STRIPE_PUB_KEY;
        if (pubKey) {
          const stripe = await loadStripe(pubKey);
          if (stripe) {
            await (stripe as any).redirectToCheckout({ sessionId: data.sessionId });
            return;
          }
        }
        // Fallback para checkoutUrl
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
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Planos</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLANS.map(p => (
          <div key={p.id} className="border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="text-gray-600 mt-2">{p.priceText}</p>
            <ul className="mt-4 list-disc list-inside text-sm text-gray-700">
              {p.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <div className="mt-6">
              <button onClick={() => handleSubscribe(p.priceId)} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center justify-center min-w-[100px]" disabled={!!loading}>
                {loading === p.priceId ? (
                  <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Processando...</span>
                ) : 'Assinar'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-600">Voltar</button>
      </div>
    </div>
  );
}

