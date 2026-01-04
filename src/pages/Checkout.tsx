import { useEffect, useState, useRef } from "react";
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
  const cardFormRef = useRef<any>(null);
  const mpInstanceRef = useRef<any>(null); // Referência para o SDK do MercadoPago
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
  const [isCardFormReady, setIsCardFormReady] = useState(false);
  const [cardFormErrors, setCardFormErrors] = useState<Record<string, string>>({});
  const [documentType, setDocumentType] = useState<'CPF' | 'CNPJ'>('CPF');

  // Dados do cartão (Card Form gerencia os campos seguros)
  const [installments] = useState(1);

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

  // Inicializar Card Form (Secure Fields) - PCI Compliance
  useEffect(() => {
    // Só executa se for cartão e o serviço estiver carregado
    if (metodoPagamento !== 'cartao' || !service) {
      return;
    }

    // Usar uma ref local para capturar a instância corretamente
    let cardFormInstanceLocal: any = null;
    let isMounted = true;

    const initCardForm = async () => {
      try {
        // Aguardar um pequeno delay para garantir que os elementos DOM estejam prontos
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isMounted) return;

        const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY, {
          locale: 'pt-BR'
        });
        
        // Guardar referência do SDK para usar getDeviceId() depois
        mpInstanceRef.current = mp;

        const instance = mp.cardForm({
          amount: String(parseFloat((service.billingType === 'subscription' ? service.priceMonthly : service.price) || '0').toFixed(2)),
          iframe: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber' },
            expirationDate: { id: 'form-checkout__expirationDate' },
            securityCode: { id: 'form-checkout__securityCode' },
            cardholderName: { id: 'form-checkout__cardholderName' },
            issuer: { id: 'form-checkout__issuer' },
            installments: { id: 'form-checkout__installments' },
            identificationType: { id: 'form-checkout__identificationType' },
            identificationNumber: { id: 'form-checkout__identificationNumber' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail' }
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (!isMounted) return;
              
              if (error) {
                console.error('[CardForm] Erro ao montar formulário:', error);
                setIsCardFormReady(false);
              } else {
                console.log('[CardForm] Formulário montado com sucesso (Secure Fields)');
                // Usar a instância capturada na variável local
                cardFormRef.current = cardFormInstanceLocal;
                console.log('[CardForm] cardFormRef.current definido:', !!cardFormRef.current);
                setIsCardFormReady(true);
              }
            },
            onFormUnmounted: () => {
              console.log('[CardForm] Formulário desmontado.');
              cardFormRef.current = null;
              setIsCardFormReady(false);
            },
            onSubmit: (event: Event) => {
              event.preventDefault();
            },
            onFetching: (resource: string) => {
              console.log('[CardForm] Fetching:', resource);
            },
            onValidityChange: (error: any, field: string) => {
              console.log('[CardForm] Validity change:', field, error);
              if (!isMounted) return;
              
              setCardFormErrors(prev => {
                const newErrors = { ...prev };
                if (error) {
                  newErrors[field] = error.message || 'Campo inválido';
                } else {
                  delete newErrors[field];
                }
                return newErrors;
              });
            },
            onError: (error: any) => {
              console.error('[CardForm] Erro:', error);
              if (!isMounted) return;
              
              if (error && error.message) {
                setError(`Erro no cartão: ${error.message}`);
              }
            },
            onReady: () => {
              console.log('[CardForm] Secure Fields prontos');
            }
          }
        });

        // Armazenar a instância APÓS a criação
        cardFormInstanceLocal = instance;
        
        // Também atualizar a ref imediatamente após a criação
        if (isMounted) {
          cardFormRef.current = instance;
          console.log('[CardForm] Instância criada e atribuída à ref:', !!instance);
        }
      } catch (err) {
        console.error('[CardForm] Falha catastrófica ao inicializar:', err);
        if (isMounted) {
          setIsCardFormReady(false);
        }
      }
    };

    initCardForm();

    // ✅ FUNÇÃO DE LIMPEZA ESSENCIAL
    return () => {
      isMounted = false;
      if (cardFormInstanceLocal) {
        console.log('[CardForm] Desmontando instância do formulário...');
        try {
          cardFormInstanceLocal.unmount();
        } catch (e) {
          console.warn('[CardForm] Erro ao desmontar:', e);
        }
      }
      cardFormRef.current = null;
    };
  }, [metodoPagamento, service]); // Dependências corretas

  // Monitoramento do status do Pix - Polling no Firestore
  useEffect(() => {
    if (aguardandoPix && paymentId && pixAttempts < 60) {
      console.log('[Checkout] Iniciando monitoramento do status do Pix, orderId:', paymentId);
      
      // Setar status inicial como pending
      if (!pixStatus) {
        setPixStatus('pending');
      }
      
      const interval = setInterval(async () => {
        try {
          console.log('[Checkout] Verificando status do pagamento Pix, tentativa:', pixAttempts + 1);
          // Usar novo endpoint que verifica no Firestore
          const resp = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/order-status?orderId=${paymentId}`);
          
          if (!resp.ok) {
            console.warn('[Checkout] Resposta não ok do order-status:', resp.status);
            setPixAttempts(prev => prev + 1);
            return;
          }
          
          const data = await resp.json();
          console.log('[Checkout] Status do pedido:', data);
          
          if (data.status) {
            setPixStatus(data.status);
            setPixAttempts(prev => prev + 1);
            
            // Parar se o status for final
            if (data.status === 'approved' || data.status === 'rejected' || data.status === 'cancelled') {
              console.log('[Checkout] Status final alcançado:', data.status);
              clearInterval(interval);
              
              // Se aprovado, redirecionar para página de sucesso após 2 segundos
              if (data.status === 'approved') {
                console.log('[Checkout] Pix aprovado! Redirecionando para sucesso...');
                setTimeout(() => {
                  window.location.href = `/success?orderId=${paymentId}&method=pix`;
                }, 2000);
              }
            }
          }
        } catch (err) {
          console.error('[Checkout] Erro ao verificar status do Pix:', err);
          setPixAttempts(prev => prev + 1);
        }
      }, 3000); // Verificar a cada 3 segundos
      
      return () => {
        console.log('[Checkout] Parando monitoramento do Pix');
        clearInterval(interval);
      };
    } else if (pixAttempts >= 60) {
      console.log('[Checkout] Limite de tentativas atingido (3 minutos), parando monitoramento');
      setPixStatus('timeout');
    }
  }, [aguardandoPix, paymentId, pixAttempts, pixStatus]);

  // Sincronizar dados do cliente com campos ocultos do MercadoPago CardForm
  useEffect(() => {
    if (metodoPagamento === 'cartao' && isCardFormReady) {
      // Atualizar email
      const emailField = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
      if (emailField) emailField.value = customerData.email;
      
      // Atualizar CPF/CNPJ - garantir que tenha o tamanho correto
      const cpfDigits = customerData.cpf.replace(/\D/g, '');
      const cpfField = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement;
      if (cpfField) {
        // CPF: máximo 11 dígitos, CNPJ: máximo 14 dígitos
        const maxLength = documentType === 'CPF' ? 11 : 14;
        cpfField.value = cpfDigits.slice(0, maxLength);
      }
      
      // Atualizar tipo de documento
      const docTypeField = document.getElementById('form-checkout__identificationType') as HTMLSelectElement;
      if (docTypeField) docTypeField.value = documentType;
    }
  }, [customerData.email, customerData.cpf, documentType, metodoPagamento, isCardFormReady]);

  // Função para formatar CPF (000.000.000-00)
  const formatCPF = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11); // Limita a 11 dígitos
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  // Função para formatar CNPJ (00.000.000/0000-00)
  const formatCNPJ = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 14); // Limita a 14 dígitos
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  };

  const handleCustomerDataChange = (field: keyof CustomerData, value: string) => {
    let formattedValue = value;
    
    // Aplicar formatação específica para CPF/CNPJ
    if (field === 'cpf') {
      formattedValue = documentType === 'CPF' ? formatCPF(value) : formatCNPJ(value);
    }
    
    console.log(`[Checkout] Atualizando campo ${field}:`, formattedValue);
    setCustomerData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const validateCustomerData = (): boolean => {
    console.log('[Checkout] Validando dados do cliente:', customerData);
    const { name, email, cpf, phone } = customerData;
    const cpfDigits = cpf.replace(/\D/g, '');
    const isSubscription = service?.billingType === 'subscription';

    if (!name.trim()) {
      setError("Nome é obrigatório");
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError("Email válido é obrigatório");
      return false;
    }
    
    // Para assinaturas, CPF e telefone são opcionais (serão coletados no MP)
    if (!isSubscription) {
      // Validar CPF (11 dígitos) ou CNPJ (14 dígitos)
      if (documentType === 'CPF' && cpfDigits.length !== 11) {
        setError("CPF deve ter 11 dígitos");
        return false;
      }
      if (documentType === 'CNPJ' && cpfDigits.length !== 14) {
        setError("CNPJ deve ter 14 dígitos");
        return false;
      }
      if (!phone.trim()) {
        setError("Telefone é obrigatório");
        return false;
      }
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

    // Validação adicional para cartão com Card Form (apenas pagamentos únicos, não assinatura)
    if (metodoPagamento === 'cartao' && service?.billingType !== 'subscription') {
      console.log('[Checkout] Verificando Card Form - isCardFormReady:', isCardFormReady, 'cardFormRef.current:', !!cardFormRef.current);
      console.log('[Checkout] Erros do Card Form:', cardFormErrors);
      
      if (!isCardFormReady || !cardFormRef.current) {
        setError('Aguarde o formulário de cartão carregar completamente');
        console.error('[Checkout] Card Form não está pronto - isCardFormReady:', isCardFormReady, 'cardFormRef:', !!cardFormRef.current);
        return;
      }
      
      // Verificar se há erros de validação nos campos
      const errorFields = Object.keys(cardFormErrors);
      if (errorFields.length > 0) {
        const errorMessages = Object.values(cardFormErrors).join(', ');
        setError(`Corrija os erros nos campos do cartão: ${errorMessages}`);
        console.error('[Checkout] Erros de validação do Card Form:', cardFormErrors);
        return;
      }
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

      // Para subscriptions, usar Mercado Pago Preapproval
      if (service.billingType === 'subscription') {
        console.log('[Checkout] Criando assinatura via Mercado Pago');
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/mercadopago-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId: service.priceId || service.id,
            customerEmail: customerData.email,
            customerName: customerData.name,
            customerId: user?.uid,
            providerId: service.ownerId,
            serviceId: service.id,
            serviceTitle: service.title,
            priceMonthly: service.priceMonthly,
            reason: service.title
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao criar assinatura');
        }

        console.log('[Checkout] Assinatura MP criada, redirecionando', data.checkoutUrl);
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
      let deviceId = null;
      let cardFormData: any = null;

      if (metodoPagamento === 'cartao') {
        console.log('[Checkout] Processando dados do cartão via Card Form (Secure Fields)');
        
        if (!cardFormRef.current) {
          throw new Error('Card Form não inicializado. Aguarde o carregamento.');
        }

        // 🔒 Primeiro criar o token, depois obter os dados completos
        try {
          // Criar o token do cartão primeiro
          console.log('[Checkout] Criando token do cartão...');
          await cardFormRef.current.createCardToken();
          
          // Agora obter os dados completos incluindo o token
          cardFormData = cardFormRef.current.getCardFormData();
          console.log('[Checkout] cardFormData retornado:', JSON.stringify(cardFormData, null, 2));
        } catch (tokenError: any) {
          console.error('[Checkout] Erro ao obter dados do Card Form:', tokenError);
          
          // Verificar tipos de erros comuns
          const errorMessage = tokenError?.message || tokenError?.cause || '';
          if (errorMessage.includes('incomplete_fields') || errorMessage.includes('empty')) {
            throw new Error('Preencha todos os campos do cartão corretamente.');
          }
          if (errorMessage.includes('invalid')) {
            throw new Error('Dados do cartão inválidos. Verifique o número, validade e CVV.');
          }
          throw new Error(`Erro ao processar cartão: ${errorMessage || 'Verifique se todos os campos foram preenchidos corretamente.'}`);
        }
        
        if (!cardFormData) {
          console.error('[Checkout] cardFormData é null ou undefined');
          throw new Error('Preencha todos os campos do cartão corretamente.');
        }
        
        if (!cardFormData.token) {
          console.error('[Checkout] Token não gerado. Dados recebidos:', cardFormData);
          // Verificar se há erros específicos
          if (cardFormData.errors && cardFormData.errors.length > 0) {
            const errorMessages = cardFormData.errors.map((e: any) => e.message || e).join(', ');
            throw new Error(`Erro no cartão: ${errorMessages}`);
          }
          throw new Error('Verifique os dados do cartão. Todos os campos são obrigatórios.');
        }

        cardToken = cardFormData.token;
        
        // Capturar Device ID do SDK do MercadoPago
        // O device_id é crucial para aprovação e análise de fraude
        // O SDK injeta automaticamente em um campo oculto ou pode ser obtido via método
        try {
          // Método 1: Tentar getDeviceId da instância do MP
          if (mpInstanceRef.current && typeof mpInstanceRef.current.getDeviceId === 'function') {
            deviceId = await mpInstanceRef.current.getDeviceId();
            console.log('[Checkout] Device ID via mpInstance.getDeviceId():', deviceId);
          }
          
          // Método 2: Campo oculto MPDeviceSessionID (criado pelo SDK)
          if (!deviceId) {
            const mpDeviceSessionInput = document.querySelector('input[name="MPDeviceSessionID"]') as HTMLInputElement;
            if (mpDeviceSessionInput?.value) {
              deviceId = mpDeviceSessionInput.value;
              console.log('[Checkout] Device ID via MPDeviceSessionID:', deviceId);
            }
          }
          
          // Método 3: Campo oculto deviceId
          if (!deviceId) {
            const deviceIdInput = document.getElementById('deviceId') as HTMLInputElement;
            if (deviceIdInput?.value) {
              deviceId = deviceIdInput.value;
              console.log('[Checkout] Device ID via #deviceId:', deviceId);
            }
          }
          
          // Método 4: cardFormData.device_id (fallback)
          if (!deviceId && cardFormData.device_id) {
            deviceId = cardFormData.device_id;
            console.log('[Checkout] Device ID via cardFormData:', deviceId);
          }
          
          // Método 5: Gerar um device fingerprint básico como último recurso
          if (!deviceId) {
            // Usar um hash básico do navigator como fallback
            const navigatorInfo = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}|${new Date().getTimezoneOffset()}`;
            deviceId = btoa(navigatorInfo).substring(0, 50);
            console.log('[Checkout] Device ID gerado (fallback):', deviceId);
          }
        } catch (deviceIdError) {
          console.warn('[Checkout] Não foi possível capturar deviceId:', deviceIdError);
          // Fallback: gerar um device fingerprint básico
          const navigatorInfo = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;
          deviceId = btoa(navigatorInfo).substring(0, 50);
        }
        
        // Os dados vêm do CardForm - usar campos corretos
        // CardForm retorna: token, installments, paymentMethodId, issuerId, identificationType, identificationNumber
        payerData = {
          email: customerData.email,
          first_name: customerData.name.split(' ')[0],
          last_name: customerData.name.split(' ').slice(1).join(' '),
          cpf: cardFormData.identificationNumber || customerData.cpf.replace(/\D/g, ''),
          phone: customerData.phone || ''
        };
        
        console.log('[Checkout] Token do cartão criado via Secure Fields:', cardToken);
        console.log('[Checkout] Payment Method ID:', cardFormData.paymentMethodId);
        console.log('[Checkout] Issuer ID:', cardFormData.issuerId);
        console.log('[Checkout] Installments:', cardFormData.installments);
        console.log('[Checkout] Device ID capturado:', deviceId);
      }

      // Preparar installments do CardForm se disponível
      const finalInstallments = metodoPagamento === 'cartao' && cardFormData 
        ? parseInt(cardFormData.installments) || installments 
        : undefined;
      
      // Preparar dados adicionais do CardForm
      const issuerId = metodoPagamento === 'cartao' && cardFormData ? cardFormData.issuerId : undefined;
      const paymentMethodId = metodoPagamento === 'cartao' && cardFormData ? cardFormData.paymentMethodId : undefined;

      const response = await iniciarPagamentoCheckout({
        valor: valorNumerico,
        metodoPagamento,
        packageData,
        reservaData,
        cardToken,
        installments: finalInstallments,
        payerData,
        deviceId, // Device ID para melhor aprovação
        issuerId, // ID do emissor do cartão
        paymentMethodId // ID do método de pagamento
      });

      console.log('[Checkout] Resposta da API:', response);

      if (response.error) {
        throw new Error(response.error);
      }

      if (metodoPagamento === 'pix') {
        console.log('[Checkout] Pagamento Pix iniciado');
        setQrCodePix(response.qrCode || null);
        setQrCodeBase64(response.qrCodeBase64 || null);
        // Usar orderId para o polling (é o ID do pedido no Firestore)
        setPaymentId(response.orderId || response.payment_id || null);
        setAguardandoPix(true);
        // Iniciar com status pending
        setPixStatus('pending');
        // Resetar tentativas
        setPixAttempts(0);
        console.log('[Checkout] OrderId para polling:', response.orderId || response.payment_id);
      } else {
        console.log('[Checkout] Pagamento com cartão processado');
        
        // Verificar se o pagamento foi rejeitado
        if (response.status === 'rejected') {
          const statusMessages: Record<string, string> = {
            'cc_rejected_high_risk': 'Pagamento recusado por segurança. Tente outro cartão ou método de pagamento.',
            'cc_rejected_insufficient_amount': 'Saldo insuficiente no cartão.',
            'cc_rejected_bad_filled_card_number': 'Número do cartão incorreto.',
            'cc_rejected_bad_filled_date': 'Data de validade incorreta.',
            'cc_rejected_bad_filled_security_code': 'Código de segurança incorreto.',
            'cc_rejected_bad_filled_other': 'Dados do cartão incorretos.',
            'cc_rejected_blacklist': 'Cartão não permitido.',
            'cc_rejected_call_for_authorize': 'Precisa autorizar o pagamento com seu banco.',
            'cc_rejected_card_disabled': 'Cartão desativado. Entre em contato com seu banco.',
            'cc_rejected_duplicated_payment': 'Pagamento duplicado. Aguarde alguns minutos.',
            'cc_rejected_max_attempts': 'Limite de tentativas excedido. Tente mais tarde.',
            'cc_rejected_other_reason': 'Pagamento recusado pelo banco. Tente outro cartão.',
          };
          
          const errorMessage = (response.status_detail && statusMessages[response.status_detail]) || 
            `Pagamento recusado: ${response.status_detail || 'erro desconhecido'}`;
          
          throw new Error(errorMessage);
        }
        
        // Pagamento aprovado ou em análise
        if (response.status === 'approved') {
          // Redirecionar para página de sucesso
          window.location.href = `/success?orderId=${response.orderId}`;
          return;
        }
        
        if (response.status === 'in_process' || response.status === 'pending') {
          // Pagamento em análise
          setError('Pagamento em análise. Você receberá um email com o resultado.');
          return;
        }
        
        // Redireciona apenas se houver checkoutUrl (checkout externo)
        if (response.checkoutUrl) {
          console.log('[Checkout] Redirecionando para checkout externo');
          window.location.href = response.checkoutUrl;
        } else {
          console.log('[Checkout] Pagamento transparente finalizado, sem redirecionamento');
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

  // Apenas mostra tela de erro fatal quando o serviço não foi encontrado
  // Erros de validação são mostrados inline no formulário
  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ops, algo deu errado</h2>
          <p className="text-gray-600 mb-8">{courseId ? "Curso não encontrado" : "Serviço não encontrado"}</p>
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
          {/* Coluna Esquerda - Formulário */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Resumo da Compra - PRIMEIRO */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
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
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl mb-4">
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
              <div className="flex justify-between items-center py-4 border-t border-gray-100">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-3xl font-bold text-green-600">R$ {price}</span>
              </div>
            </div>
            
            {/* 2. Card de Método de Pagamento - SEGUNDO */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Método de pagamento</h2>
                  <p className="text-gray-600 text-sm">
                    {service?.billingType === 'subscription' 
                      ? 'Assinatura mensal processada via Mercado Pago' 
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
                <div className="grid md:grid-cols-2 gap-4">
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
            </div>

            {/* 2. Card de Dados do Cliente - SEGUNDO */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Seus dados</h2>
                  <p className="text-gray-600 text-sm">
                    {service?.billingType === 'subscription' 
                      ? 'Apenas nome e email - demais dados serão coletados no Mercado Pago'
                      : 'Informações para a compra'
                    }
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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

                <div className={service?.billingType === 'subscription' ? 'md:col-span-2' : ''}>
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

                {/* Campos adicionais apenas para pagamentos únicos (não assinatura) */}
                {service?.billingType !== 'subscription' && (
                  <>
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
                        Tipo de Documento *
                      </label>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                          type="button"
                          onClick={() => setDocumentType('CPF')}
                          className={`p-3 rounded-xl border-2 transition-all ${documentType === 'CPF' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className={`font-semibold ${documentType === 'CPF' ? 'text-blue-600' : 'text-gray-700'}`}>CPF</span>
                            {documentType === 'CPF' && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">Pessoa Física</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocumentType('CNPJ')}
                          className={`p-3 rounded-xl border-2 transition-all ${documentType === 'CNPJ' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className={`font-semibold ${documentType === 'CNPJ' ? 'text-blue-600' : 'text-gray-700'}`}>CNPJ</span>
                            {documentType === 'CNPJ' && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">Pessoa Jurídica</span>
                        </button>
                      </div>
                      
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {documentType} *
                      </label>
                      <input
                        type="text"
                        value={customerData.cpf}
                        onChange={(e) => handleCustomerDataChange('cpf', e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                        maxLength={documentType === 'CPF' ? 14 : 18}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Campos do Cartão - TERCEIRO (apenas se cartão selecionado e NÃO for assinatura) */}
            {metodoPagamento === 'cartao' && service?.billingType !== 'subscription' && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Dados do cartão</h2>
                    <p className="text-gray-600 text-sm">Ambiente seguro e criptografado</p>
                  </div>
                </div>

                {!isCardFormReady && (
                  <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-gray-500">Carregando formulário seguro...</p>
                    </div>
                  </div>
                )}
                
                <form id="form-checkout" autoComplete="off" className={`space-y-4 ${isCardFormReady ? 'block' : 'hidden'}`}>
                  {/* Card Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Número do Cartão *
                    </label>
                    <div id="form-checkout__cardNumber" className="mp-secure-field-container"></div>
                  </div>

                  {/* Nome no Cartão */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Nome no Cartão *
                    </label>
                    <input 
                      type="text" 
                      id="form-checkout__cardholderName" 
                      className="mp-input-field" 
                      placeholder="Nome como impresso no cartão"
                      autoComplete="cc-name"
                      data-checkout="cardholderName"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Expiry */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Validade *
                      </label>
                      <div id="form-checkout__expirationDate" className="mp-secure-field-container"></div>
                    </div>
                    
                    {/* CVV */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        CVV *
                      </label>
                      <div id="form-checkout__securityCode" className="mp-secure-field-container"></div>
                    </div>
                  </div>

                  {/* Parcelas */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Parcelas *
                    </label>
                    <select id="form-checkout__installments" className="mp-input-field">
                      <option value="1">1x sem juros</option>
                      <option value="2">2x sem juros</option>
                      <option value="3">3x sem juros</option>
                      <option value="4">4x sem juros</option>
                      <option value="5">5x sem juros</option>
                      <option value="6">6x sem juros</option>
                    </select>
                  </div>

                  {/* Campos ocultos - preenchidos automaticamente com dados do cliente */}
                  <input 
                    type="hidden" 
                    id="form-checkout__cardholderEmail" 
                    value={customerData.email}
                    data-checkout="cardholderEmail"
                  />
                  <select id="form-checkout__identificationType" style={{ display: 'none', visibility: 'hidden', position: 'absolute', left: '-9999px' }} value={documentType} disabled>
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                  <input 
                    type="hidden" 
                    id="form-checkout__identificationNumber" 
                    value={customerData.cpf.replace(/\D/g, '').slice(0, documentType === 'CPF' ? 11 : 14)}
                    data-checkout="identificationNumber"
                  />
                  <select id="form-checkout__issuer" style={{ display: 'none', visibility: 'hidden', position: 'absolute', left: '-9999px' }}></select>
                </form>
              </div>
            )}

            {/* QR Code Pix */}
            {metodoPagamento === 'pix' && qrCodePix && aguardandoPix && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 animate-fadeIn">
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
                        <div className={`w-2 h-2 rounded-full ${pixStatus === 'approved' ? 'bg-green-500' : pixStatus === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="font-medium">
                          {pixStatus === 'approved' ? '✓ Pagamento aprovado!' :
                           pixStatus === 'pending' ? 'Aguardando pagamento...' : 
                           'Pagamento não identificado'}
                        </span>
                      </div>
                      
                      {/* Mensagem de sucesso com info sobre email */}
                      {pixStatus === 'approved' && (
                        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-green-800 mb-1">Pagamento Confirmado!</h4>
                              <p className="text-green-700 text-sm mb-2">
                                Você receberá um email em <strong>{customerData.email}</strong> com o link para acessar seu conteúdo.
                              </p>
                              <p className="text-green-600 text-xs">
                                Redirecionando para página de confirmação...
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita - Garantias e Botão */}
          <div className="space-y-6">
            {/* Card de Pagamento - Sticky */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 sticky top-8">
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