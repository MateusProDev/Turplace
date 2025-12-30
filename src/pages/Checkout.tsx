import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../hooks/useAuth";
import { CreditCard, Shield, CheckCircle, AlertCircle, QrCode, User, Sparkles, Lock, ArrowLeft, Loader2, Copy, Smartphone } from "lucide-react";
import { iniciarPagamentoCheckout } from "../services/mercadoPagoCheckoutService";

// Declaração para MercadoPago
declare global {
  interface Window {
    MercadoPago: any;
  }
}

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
  images?: string[];
  description?: string;
  type?: 'service' | 'course';
}

interface CustomerData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // @ts-ignore
  const [service, setService] = useState<ServiceData | null>(null);
  // @ts-ignore
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<'cartao' | 'pix'>('pix');
  const [qrCodePix, setQrCodePix] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [aguardandoPix, setAguardandoPix] = useState(false);
  const [pixStatus, setPixStatus] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pixAttempts, setPixAttempts] = useState(0);
  const [copied, setCopied] = useState(false);

  // Dados do cartão
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [installments, setInstallments] = useState(1);

  // Dados do cliente
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: user?.displayName || '',
    email: user?.email || '',
    cpf: '',
    phone: ''
  });

  // @ts-ignore
  const serviceId = searchParams.get('serviceId');
  // @ts-ignore
  const courseId = searchParams.get('courseId');

  useEffect(() => {
    console.log('[Checkout] Iniciando carregamento, serviceId:', serviceId, 'courseId:', courseId);
    console.log('[Checkout] searchParams:', searchParams.toString());
    if (!serviceId && !courseId) {
      console.warn('[Checkout] serviceId ou courseId não fornecido, redirecionando para home');
      navigate('/');
      return;
    }

    const loadItem = async () => {
      console.log('[Checkout] Executando loadItem');
      try {
        let ref;
        let itemType: 'service' | 'course' = 'service';

        if (serviceId) {
          console.log('[Checkout] Carregando serviço do Firestore');
          ref = doc(db, "services", serviceId);
        } else if (courseId) {
          console.log('[Checkout] Carregando curso do Firestore');
          ref = doc(db, "courses", courseId);
          itemType = 'course';
        }

        if (ref) {
          console.log('[Checkout] Referência do documento:', ref.path);
          const snap = await getDoc(ref);
          console.log('[Checkout] Snapshot exists:', snap.exists());
          if (snap.exists()) {
            const itemData = { id: snap.id, ...snap.data(), type: itemType } as ServiceData;
            console.log('[Checkout] Item carregado:', itemData);
            setService(itemData);
          } else {
            console.error('[Checkout] Item não encontrado no Firestore');
            setError(itemType === 'course' ? "Curso não encontrado" : "Serviço não encontrado");
          }
        }
      } catch (err) {
        console.error("[Checkout] Erro ao carregar item:", err);
        console.error("[Checkout] Stack trace:", err instanceof Error ? err.stack : 'No stack trace');
        setError("Erro ao carregar item");
      } finally {
        console.log('[Checkout] Finalizando carregamento, setLoading(false)');
        setLoading(false);
      }
    };

    loadItem();
  }, []);

  useEffect(() => {
    if (service?.billingType === 'subscription') {
      setMetodoPagamento('cartao');
    }
  }, [service?.billingType]);

  // Monitoramento do status do Pix
  useEffect(() => {
    if (aguardandoPix && paymentId && pixAttempts < 30) {
      console.log('[Checkout] Iniciando monitoramento do status do Pix');
      const interval = setInterval(async () => {
        try {
          console.log('[Checkout] Verificando status do pagamento Pix');
          const resp = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/payment/${paymentId}`);
          const data = await resp.json();
          console.log('[Checkout] Status do Pix:', data);
          if (data.status) {
            setPixStatus(data.status);
            setPixAttempts(prev => prev + 1);
            // Parar se o status for final
            if (data.status === 'approved' || data.status === 'rejected' || data.status === 'cancelled') {
              console.log('[Checkout] Status final alcançado, parando monitoramento');
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error('[Checkout] Erro ao verificar status do Pix:', err);
          setPixAttempts(prev => prev + 1);
        }
      }, 4000);
      return () => {
        console.log('[Checkout] Parando monitoramento do Pix');
        clearInterval(interval);
      };
    } else if (pixAttempts >= 30) {
      console.log('[Checkout] Limite de tentativas atingido, parando monitoramento');
      setPixStatus('timeout');
    }
  }, [aguardandoPix, paymentId, pixAttempts]);

  const handleCustomerDataChange = (field: keyof CustomerData, value: string) => {
    console.log(`[Checkout] Atualizando campo ${field}:`, value);
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  const validateCustomerData = (): boolean => {
    console.log('[Checkout] Validando dados do cliente:', customerData);
    const { name, email, cpf, phone } = customerData;

    if (!name.trim()) {
      setError("Nome é obrigatório");
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError("Email válido é obrigatório");
      return false;
    }
    if (!cpf.trim() || cpf.length < 11) {
      setError("CPF válido é obrigatório");
      return false;
    }
    if (!phone.trim()) {
      setError("Telefone é obrigatório");
      return false;
    }

    setError(null);
    return true;
  };

  const handlePayment = async () => {
    if (!service) {
      console.error('[Checkout] Item não disponível para pagamento');
      return;
    }

    if (!validateCustomerData()) {
      console.warn('[Checkout] Validação dos dados do cliente falhou');
      return;
    }

    setProcessing(true);
    setError(null);
    setPixAttempts(0); // Resetar contador de tentativas

    try {
      console.log('[Checkout] Iniciando processamento de pagamento', {
        metodoPagamento,
        serviceId: service.id,
        billingType: service.billingType
      });

      // Para subscriptions, usar Stripe
      if (service.billingType === 'subscription') {
        if (!service.priceId) {
          throw new Error('Item não configurado para assinatura');
        }

        console.log('[Checkout] Criando sessão de assinatura Stripe');
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/create-subscription-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId: service.priceId,
            customerEmail: customerData.email,
            userId: user?.uid
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao criar sessão de assinatura');
        }

        console.log('[Checkout] Sessão Stripe criada, redirecionando', data.checkoutUrl);
        window.location.href = data.checkoutUrl;
        return;
      }

      // Para pagamentos únicos, usar Mercado Pago
      const valor = service.price;
      if (!valor) {
        throw new Error('Valor do item não definido');
      }

      // Converter valor para número
      const valorNumerico = parseFloat(valor.replace(',', '.'));
      console.log('[Checkout] Valor processado:', valorNumerico);

      const packageData = {
        serviceId: service.id,
        providerId: service.ownerId,
        title: service.title,
        ownerName: service.ownerName
      };

      const reservaData = {
        customerName: customerData.name,
        customerEmail: customerData.email,
        customerCPF: customerData.cpf,
        customerPhone: customerData.phone
      };

      console.log('[Checkout] Chamando API do Mercado Pago', {
        valor: valorNumerico,
        metodoPagamento,
        packageData,
        reservaData
      });

      let cardToken = undefined;
      let payerData = undefined;

      if (metodoPagamento === 'cartao') {
        console.log('[Checkout] Processando dados do cartão');
        // Criar token do cartão
        const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || 'APP_USR-aac914af-9caa-4fb1-ae68-47c87dfe4d2e');
        const cardTokenResponse = await mp.createCardToken({
          cardNumber: cardNumber.replace(/\s/g, ''),
          cardholderName,
          cardExpirationMonth: expiry.split('/')[0],
          cardExpirationYear: '20' + expiry.split('/')[1],
          securityCode: cvv,
          identificationType: 'CPF',
          identificationNumber: customerData.cpf.replace(/\D/g, '')
        });
        cardToken = cardTokenResponse.id;
        payerData = {
          email: customerData.email,
          first_name: customerData.name.split(' ')[0],
          last_name: customerData.name.split(' ').slice(1).join(' '),
          cpf: customerData.cpf.replace(/\D/g, '')
        };
        console.log('[Checkout] Token do cartão criado:', cardToken);
      }

      const response = await iniciarPagamentoCheckout({
        valor: valorNumerico,
        metodoPagamento,
        packageData,
        reservaData,
        cardToken,
        installments: metodoPagamento === 'cartao' ? installments : undefined,
        payerData
      });

      console.log('[Checkout] Resposta da API:', response);

      if (response.error) {
        throw new Error(response.error);
      }

      if (metodoPagamento === 'pix') {
        console.log('[Checkout] Pagamento Pix iniciado');
        setQrCodePix(response.qrCode || null);
        setQrCodeBase64(response.qrCodeBase64 || null);
        setPaymentId(response.payment_id || null);
        setAguardandoPix(true);
      } else {
        console.log('[Checkout] Pagamento com cartão - redirecionamento necessário');
        // Para cartão, pode ser necessário redirecionamento
        if (response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
        }
      }

    } catch (err) {
      console.error("[Checkout] Erro no processamento do pagamento:", err);
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento. Tente novamente.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyPixCode = () => {
    if (qrCodePix) {
      navigator.clipboard.writeText(qrCodePix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Carregando checkout...</p>
          <p className="text-sm text-gray-400 mt-2">Preparando tudo para você</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ops, algo deu errado</h2>
          <p className="text-gray-600 mb-8">{error || (service?.type === 'course' ? "Curso não encontrado" : "Serviço não encontrado")}</p>
          <div className="space-y-4">
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
            >
              Voltar para o início
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const price = service.billingType === 'subscription' ? service.priceMonthly : service.price;
  const billingText = service.billingType === 'subscription' ? 'por mês' : 'único';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 px-4 md:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Finalizar Compra</h1>
              <p className="text-gray-600 mt-2">Preencha seus dados para concluir a compra</p>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl px-4 py-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Pagamento 100% seguro</p>
                <p className="text-sm text-gray-600">Processado pelo Mercado Pago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda - Dados do Cliente */}
          <div className="lg:col-span-2 space-y-8">
            {/* Card de Dados do Cliente */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Seus dados</h2>
                  <p className="text-gray-600 text-sm">Preencha as informações abaixo</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={customerData.name}
                    onChange={(e) => handleCustomerDataChange('name', e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={customerData.email}
                    onChange={(e) => handleCustomerDataChange('email', e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) => handleCustomerDataChange('phone', e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    CPF *
                  </label>
                  <input
                    type="text"
                    value={customerData.cpf}
                    onChange={(e) => handleCustomerDataChange('cpf', e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Card de Método de Pagamento */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Método de pagamento</h2>
                  <p className="text-gray-600 text-sm">
                    {service?.billingType === 'subscription' 
                      ? 'Assinatura mensal processada via Stripe' 
                      : 'Escolha como deseja pagar'
                    }
                  </p>
                </div>
              </div>

              {service?.billingType === 'subscription' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div> 
                      <div className="font-semibold text-gray-900">Assinatura Mensal</div>
                      <div className="text-sm text-gray-600">Pagamento recorrente via cartão de crédito</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setMetodoPagamento('pix')}
                    className={`p-4 rounded-xl border-2 transition-all ${metodoPagamento === 'pix' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${metodoPagamento === 'pix' ? 'bg-green-500' : 'bg-gray-100'}`}>
                        <QrCode className={`w-5 h-5 ${metodoPagamento === 'pix' ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">Pix</div>
                        <div className="text-sm text-gray-600">Pagamento instantâneo</div>
                      </div>
                      {metodoPagamento === 'pix' && (
                        <div className="ml-auto w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setMetodoPagamento('cartao')}
                    className={`p-4 rounded-xl border-2 transition-all ${metodoPagamento === 'cartao' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${metodoPagamento === 'cartao' ? 'bg-blue-500' : 'bg-gray-100'}`}>
                        <CreditCard className={`w-5 h-5 ${metodoPagamento === 'cartao' ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">Cartão</div>
                        <div className="text-sm text-gray-600">Crédito ou débito</div>
                      </div>
                      {metodoPagamento === 'cartao' && (
                        <div className="ml-auto w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              )}

              {/* Campos do Cartão - apenas para pagamentos únicos */}
              {metodoPagamento === 'cartao' && service?.billingType !== 'subscription' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Número do Cartão
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Validade
                      </label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="MM/AA"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Parcelas
                      </label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num}x sem juros</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Nome no Cartão
                    </label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      placeholder="Nome como impresso no cartão"
                    />
                  </div>
                </div>
              )}

              {/* QR Code Pix */}
              {metodoPagamento === 'pix' && qrCodePix && aguardandoPix && (
                <div className="animate-fadeIn">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <QrCode className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg mb-2">Pague com Pix</h3>
                      <p className="text-gray-600 text-sm">Escaneie o código abaixo no seu app bancário</p>
                    </div>

                    {qrCodeBase64 && (
                      <div className="flex flex-col items-center">
                        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
                          <img
                            src={qrCodeBase64.startsWith('data:image/png;base64,') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                            alt="QR Code Pix"
                            className="w-64 h-64"
                          />
                        </div>

                        <div className="w-full space-y-4">
                          <div className="relative">
                            <input
                              type="text"
                              readOnly
                              value={qrCodePix}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono pr-12"
                            />
                            <button
                              onClick={handleCopyPixCode}
                              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2"
                            >
                              {copied ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            <Smartphone className="w-4 h-4" />
                            <span>Abra seu app bancário e escaneie o QR Code</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {pixStatus && (
                      <div className="mt-6 pt-6 border-t border-green-200">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${pixStatus === 'approved' ? 'bg-green-100 text-green-800' : pixStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          <div className={`w-2 h-2 rounded-full ${pixStatus === 'approved' ? 'bg-green-500' : pixStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                          <span className="font-medium">
                            {pixStatus === 'approved' ? 'Pagamento aprovado!' :
                             pixStatus === 'pending' ? 'Aguardando pagamento...' : 
                             'Pagamento não identificado'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita - Resumo e Pagamento */}
          <div className="space-y-8">
            {/* Card de Resumo */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 sticky top-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Resumo da compra</h2>
                  <p className="text-gray-600 text-sm">Confira os detalhes</p>
                </div>
              </div>

              {/* Produto */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl mb-6">
                {service.images && service.images[0] && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={service.images[0]}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{service.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">Por {service.ownerName}</p>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{billingText}</span>
                </div>
              </div>

              {/* Total */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-4 border-t border-gray-100">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-3xl font-bold text-gray-900">R$ {price}</span>
                </div>
              </div>

              {/* Garantias */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-1">Compra protegida</p>
                    <p className="text-xs text-gray-600">
                      Seu pagamento é processado de forma segura pelo Mercado Pago. 
                      Reembolso garantido em até 30 dias.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botão de Pagamento */}
              <button
                onClick={handlePayment}
                disabled={processing || (aguardandoPix && pixStatus === 'pending')}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 text-lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processando...
                  </>
                ) : aguardandoPix && pixStatus === 'pending' ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Aguardando Pix...
                  </>
                ) : (
                  <>
                    {metodoPagamento === 'pix' ? <QrCode className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                    {metodoPagamento === 'pix' ? 'Pagar com Pix' : 'Pagar com Cartão'}
                  </>
                )}
              </button>

              {/* Mensagem de Segurança */}
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Lock className="w-4 h-4" />
                  <span>Pagamento 100% seguro • Dados criptografados</span>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-shake">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estilos CSS adicionais */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        input:focus, select:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        
        .shadow-lg {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        
        .shadow-xl {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .sticky {
          position: sticky;
        }
      `}</style>
    </div>
  );
}