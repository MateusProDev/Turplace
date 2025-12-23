import { MercadoPagoConfig, Payment } from 'mercadopago';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.REACT_APP_MERCADO_PAGO_ACCESS_TOKEN;

const client = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 5000 }
});

const payment = new Payment(client);

export default async function handler(req, res) {
  console.log('[Payment Status] Iniciando verificação', {
    method: req.method,
    query: req.query
  });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!accessToken) {
    console.error('[Payment Status] Access token não configurado');
    return res.status(500).json({ error: 'Configuração do Mercado Pago não encontrada' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID do pagamento não fornecido' });
  }

  try {
    console.log('[Payment Status] Consultando pagamento no Mercado Pago:', id);
    const result = await payment.get({ id });
    console.log('[Payment Status] Status obtido:', result);

    return res.status(200).json({
      status: result.status,
      status_detail: result.status_detail,
      transaction_amount: result.transaction_amount,
      date_created: result.date_created,
      date_approved: result.date_approved,
      payment_method_id: result.payment_method_id
    });
  } catch (error) {
    console.error('[Payment Status] Erro ao consultar pagamento:', error);
    return res.status(500).json({ error: 'Erro ao verificar status do pagamento', details: error.message });
  }
}