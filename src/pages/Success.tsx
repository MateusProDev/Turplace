import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Download, Mail, Clock } from "lucide-react";

export default function Success() {
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailSent, setEmailSent] = useState(false);

  const sessionId = useMemo(() => searchParams.get('session_id'), [searchParams]);
  const orderId = useMemo(() => searchParams.get('order_id'), [searchParams]);

  const fetchOrderDetails = useCallback(async () => { 
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('session_id', sessionId); 
      if (orderId) params.append('order_id', orderId);

      const response = await fetch(`/api/get-order-details?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes da ordem');
      }

      const data = await response.json();

      setOrderDetails({
        serviceTitle: data.service?.title || "Serviço Digital",
        amount: data.payment ? `R$ ${(data.payment.amountTotal / 100).toFixed(2).replace('.', ',')}` : "R$ 0,00",
        customerEmail: data.payment?.customerEmail || "",
        providerName: data.provider?.name || "Prestador",
        orderId: data.order?.id || orderId || "N/A",
        status: data.order?.status || "unknown",
        serviceDescription: data.service?.description || "",
        isGuestCheckout: data.order?.isGuestCheckout || false
      });
    } catch (err) {
      console.error("Erro ao buscar detalhes da ordem:", err);
      // Fallback para dados simulados
      setOrderDetails({
        serviceTitle: "Serviço Digital",
        amount: "R$ 99,90",
        customerEmail: "",
        providerName: "Prestador",
        orderId: orderId || "N/A",
        status: "completed",
        serviceDescription: "",
        isGuestCheckout: true
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId, orderId]);

  useEffect(() => {
    if (sessionId) {
      // Buscar detalhes da sessão do Stripe
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [sessionId, fetchOrderDetails]);

  const handleSendEmail = async () => {
    if (!orderDetails) return;

    try {
      // Aqui será integrada a API do Brevo para envio de email
      // Por enquanto, apenas simulamos o envio
      setEmailSent(true);

      // TODO: Implementar integração com Brevo
      console.log("Enviando email para:", orderDetails.customerEmail);
      console.log("Conteúdo: Acesso ao produto/serviço");

    } catch (err) {
      console.error("Erro ao enviar email:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando pagamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header de Sucesso */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-8 text-white text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Pagamento Aprovado!</h1>
            <p className="text-green-100">Seu pedido foi processado com sucesso</p>
          </div>

          {/* Detalhes do Pedido */}
          <div className="px-8 py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Detalhes do Pedido</h2>

            {orderDetails && (
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Produto/Serviço:</span>
                  <span className="text-gray-900">{orderDetails.serviceTitle as string}</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Valor Pago:</span>
                  <span className="text-2xl font-bold text-green-600">{orderDetails.amount as string}</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Prestador:</span>
                  <span className="text-gray-900">{orderDetails.providerName as string}</span>
                </div>

                <div className="flex justify-between items-center py-3">
                  <span className="font-medium text-gray-700">ID da Transação:</span>
                  <span className="text-gray-900 font-mono text-sm">{orderDetails.orderId as string}</span>
                </div>
              </div>
            )}

            {/* Próximos Passos */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <Mail className="text-blue-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-blue-900 mb-2">O que acontece agora?</h3>
                  <div className="space-y-2 text-blue-800">
                    <p className="flex items-center gap-2">
                      <CheckCircle size={16} />
                      Você receberá um email com os detalhes de acesso
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={16} />
                      O prestador será notificado sobre seu pedido
                    </p>
                    <p className="flex items-center gap-2">
                      <Download size={16} />
                      Em breve você terá acesso ao conteúdo/produto
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-4">
              {!emailSent ? (
                <button
                  onClick={handleSendEmail}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-3 text-lg"
                >
                  <Mail size={24} />
                  Reenviar Email de Acesso
                </button>
              ) : (
                <div className="w-full px-6 py-4 bg-green-50 border border-green-200 text-green-700 font-semibold rounded-xl flex items-center justify-center gap-3 text-lg">
                  <CheckCircle size={24} />
                  Email enviado com sucesso!
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to="/catalog"
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition text-center"
                >
                  Explorar Mais Serviços
                </Link>

                <Link
                  to="/"
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition text-center"
                >
                  Voltar ao Início
                </Link>
              </div>
            </div>

            {/* Nota sobre suporte */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Precisa de ajuda? Entre em contato conosco</p>
              <p className="mt-1">suporte@lucrazi.com | (11) 99999-9999</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}