import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../hooks/useAuth";
import { CreditCard, Shield, CheckCircle, AlertCircle, QrCode, User } from "lucide-react";
import { iniciarPagamentoCheckout } from "../services/mercadoPagoCheckoutService";

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
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<'cartao' | 'pix'>('pix');
  const [qrCodePix, setQrCodePix] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [aguardandoPix, setAguardandoPix] = useState(false);
  const [pixStatus, setPixStatus] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Dados do cliente
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: user?.displayName || '',
    email: user?.email || '',
    cpf: '',
    phone: ''
  });

  const serviceId = searchParams.get('serviceId');

  useEffect(() => {
    console.log('[Checkout] Iniciando carregamento, serviceId:', serviceId);
    if (!serviceId) {
      console.warn('[Checkout] serviceId não fornecido, redirecionando para home');
      navigate('/');
      return;
    }

    const loadService = async () => {
      try {
        console.log('[Checkout] Carregando serviço do Firestore');
        const ref = doc(db, "services", serviceId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const serviceData = { id: snap.id, ...snap.data() } as ServiceData;
          console.log('[Checkout] Serviço carregado:', serviceData);
          setService(serviceData);
        } else {
          console.error('[Checkout] Serviço não encontrado no Firestore');
          setError("Serviço não encontrado");
        }
      } catch (err) {
        console.error("[Checkout] Erro ao carregar serviço:", err);
        setError("Erro ao carregar serviço");
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [serviceId, navigate]);

  // Monitoramento do status do Pix
  useEffect(() => {
    if (aguardandoPix && paymentId) {
      console.log('[Checkout] Iniciando monitoramento do status do Pix');
      const interval = setInterval(async () => {
        try {
          console.log('[Checkout] Verificando status do pagamento Pix');
          const resp = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/payment/${paymentId}`);
          const data = await resp.json();
          console.log('[Checkout] Status do Pix:', data);
          if (data.status) setPixStatus(data.status);
        } catch (err) {
          console.error('[Checkout] Erro ao verificar status do Pix:', err);
        }
      }, 4000);
      return () => {
        console.log('[Checkout] Parando monitoramento do Pix');
        clearInterval(interval);
      };
    }
  }, [aguardandoPix, paymentId]);

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
      console.error('[Checkout] Serviço não disponível para pagamento');
      return;
    }

    if (!validateCustomerData()) {
      console.warn('[Checkout] Validação dos dados do cliente falhou');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log('[Checkout] Iniciando processamento de pagamento', {
        metodoPagamento,
        serviceId: service.id,
        customerData
      });

      const valor = service.billingType === 'subscription' ? service.priceMonthly : service.price;
      if (!valor) {
        throw new Error('Valor do serviço não definido');
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

      const response = await iniciarPagamentoCheckout({
        valor: valorNumerico,
        metodoPagamento,
        packageData,
        reservaData
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Finalizar Compra</h1>
            <p className="text-green-100">Pagamento seguro processado pelo Mercado Pago</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 p-8">
            {/* Coluna Esquerda - Dados do Cliente */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados do Cliente
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={customerData.name}
                    onChange={(e) => handleCustomerDataChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={customerData.email}
                    onChange={(e) => handleCustomerDataChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF *
                  </label>
                  <input
                    type="text"
                    value={customerData.cpf}
                    onChange={(e) => handleCustomerDataChange('cpf', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) => handleCustomerDataChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              {/* Método de Pagamento */}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Método de Pagamento</h3>

                <div className="space-y-3">
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="metodoPagamento"
                      value="pix"
                      checked={metodoPagamento === 'pix'}
                      onChange={(e) => setMetodoPagamento(e.target.value as 'pix')}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <div className="ml-3 flex items-center gap-3">
                      <QrCode className="w-6 h-6 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">Pix</div>
                        <div className="text-sm text-gray-500">Pagamento instantâneo</div>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="metodoPagamento"
                      value="cartao"
                      checked={metodoPagamento === 'cartao'}
                      onChange={(e) => setMetodoPagamento(e.target.value as 'cartao')}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <div className="ml-3 flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">Cartão de Crédito</div>
                        <div className="text-sm text-gray-500">Visa, Mastercard, etc.</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Resumo e Pagamento */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Resumo da Compra</h2>

              {/* Service Info */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{service.title}</h3>
                <p className="text-gray-600 text-sm mb-4">Por {service.ownerName}</p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-green-600">R$ {price}</span>
                  <span className="text-gray-600">{billingText}</span>
                </div>
              </div>

              {/* QR Code Pix (quando aplicável) */}
              {qrCodePix && aguardandoPix && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Pague com Pix
                  </h3>

                  {qrCodeBase64 && (
                    <div className="text-center mb-4">
                      <img
                        src={`data:image/png;base64,${qrCodeBase64}`}
                        alt="QR Code Pix"
                        className="mx-auto max-w-48"
                      />
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-sm text-green-700 mb-2">
                      Escaneie o QR Code ou copie o código Pix
                    </p>
                    <button
                      onClick={() => navigator.clipboard.writeText(qrCodePix)}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Copiar Código Pix
                    </button>
                  </div>

                  {pixStatus && (
                    <div className="mt-4 text-center">
                      <span className={`text-sm font-medium ${
                        pixStatus === 'approved' ? 'text-green-600' :
                        pixStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        Status: {pixStatus === 'approved' ? 'Aprovado' :
                                pixStatus === 'pending' ? 'Aguardando' : 'Rejeitado'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Segurança */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="text-blue-600" size={20} />
                  <span className="font-semibold text-blue-900">Pagamento Seguro</span>
                </div>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} />
                    Protegido pelo Mercado Pago
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} />
                    Aceitamos Pix e cartões
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} />
                    Reembolso garantido
                  </li>
                </ul>
              </div>

              {/* Erro */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Botão de Pagamento */}
              <button
                onClick={handlePayment}
                disabled={processing || aguardandoPix}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Processando...
                  </>
                ) : aguardandoPix ? (
                  <>
                    <QrCode size={24} />
                    Aguardando Pagamento Pix
                  </>
                ) : (
                  <>
                    {metodoPagamento === 'pix' ? <QrCode size={24} /> : <CreditCard size={24} />}
                    Pagar com {metodoPagamento === 'pix' ? 'Pix' : 'Cartão'}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Ao clicar em "Pagar", seus dados serão processados de forma segura pelo Mercado Pago.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}