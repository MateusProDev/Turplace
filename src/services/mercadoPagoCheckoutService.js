// Serviço para checkout Mercado Pago (cartão e Pix)
// src/services/mercadoPagoCheckoutService.js

const API_URL = import.meta.env.VITE_API_URL || '';

export async function iniciarPagamentoCheckout({ valor, metodoPagamento, packageData, reservaData, cardToken, installments, payerData, deviceId, issuerId, paymentMethodId }) {
  console.log('[MercadoPago Service] Iniciando chamada para API', {
    API_URL,
    valor,
    metodoPagamento,
    packageData,
    reservaData,
    issuerId,
    paymentMethodId
  });

  const response = await fetch(`${API_URL}/api/mercadopago-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      valor, 
      metodoPagamento, 
      packageData, 
      reservaData, 
      cardToken, 
      installments, 
      payerData,
      deviceId,
      issuerId,
      paymentMethodId
    })
  });

  const result = await response.json();
  console.log('[MercadoPago Service] Resposta da API:', result);

  return result;
}

export async function verificarStatusPagamento(paymentId) {
  console.log('[MercadoPago Service] Verificando status do pagamento:', paymentId);

  const API_URL = process.env.REACT_APP_API_URL || '';
  const response = await fetch(`${API_URL}/api/payment/${paymentId}`);
  const result = await response.json();

  console.log('[MercadoPago Service] Status do pagamento:', result);
  return result;
}
