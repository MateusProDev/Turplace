import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../hooks/useAuth";
import { CreditCard, Shield, CheckCircle, AlertCircle } from "lucide-react";

interface ServiceData {
  id: string;
  title: string;
  price?: string;
  priceMonthly?: string;
  billingType?: string;
  stripeProductId?: string;
  priceId?: string;
  ownerId: string;
  ownerName: string;
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceId = searchParams.get('serviceId');

  useEffect(() => {
    if (!serviceId) {
      navigate('/');
      return;
    }

    const loadService = async () => {
      try {
        const ref = doc(db, "services", serviceId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setService({ id: snap.id, ...snap.data() } as ServiceData);
        } else {
          setError("Serviço não encontrado");
        }
      } catch (err) {
        console.error("Erro ao carregar serviço:", err);
        setError("Erro ao carregar serviço");
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [serviceId, navigate]);

  const handlePayment = async () => {
    if (!service || !user) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: service.id,
          agencyId: service.ownerId, // Usando ownerId como agencyId
          quantity: 1
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao criar sessão de checkout');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error("Erro no pagamento:", err);
      setError("Erro ao processar pagamento. Tente novamente.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600 mb-6">{error || "Serviço não encontrado"}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const price = service.billingType === 'subscription' ? service.priceMonthly : service.price;
  const billingText = service.billingType === 'subscription' ? 'por mês' : 'único';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Finalizar Compra</h1>
            <p className="text-blue-100">Pagamento seguro processado pelo Stripe</p>
          </div>

          {/* Service Info */}
          <div className="px-8 py-6 border-b">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo da Compra</h2>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{service.title}</h3>
                <p className="text-gray-600 text-sm">Por {service.ownerName}</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-blue-600">{price}</span>
                  <span className="text-gray-600 ml-2">{billingText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="px-8 py-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-green-600" size={24} />
              <span className="font-semibold text-gray-900">Pagamento Seguro</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                Protegido pelo Stripe
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                Aceitamos cartões de crédito e débito
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                Reembolso garantido em caso de problemas
              </li>
            </ul>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard size={24} />
                  Pagar com Cartão
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Ao clicar em "Pagar com Cartão", você será redirecionado para o Stripe para completar o pagamento de forma segura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}