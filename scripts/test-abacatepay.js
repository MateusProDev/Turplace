// Script para testar integração com AbacatePay
// Execute com: node scripts/test-abacatepay.js

import AbacatePay from 'abacatepay-nodejs-sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ABACATEPAY_API_KEY;

if (!apiKey) {
  console.error('❌ ABACATEPAY_API_KEY não configurada');
  process.exit(1);
}

console.log('🔄 Inicializando AbacatePay...');
const abacate = AbacatePay.default(apiKey);

async function testPixPayment() {
  try {
    console.log('💰 Criando QRCode PIX direto...');

    const valorEmCentavos = 1000; // R$ 10,00

    const pixQrCode = await abacate.pixQrCode.create({
      amount: valorEmCentavos,
      description: "Teste QRCode PIX Direto - Turplace",
      metadata: {
        test: true,
        orderId: 'test-order-123'
      }
    });

    console.log('✅ QRCode PIX criado com sucesso!');
    console.log('📄 Resposta completa:', JSON.stringify(pixQrCode, null, 2));

    // Verificar estrutura da resposta baseada na documentação
    if (pixQrCode && pixQrCode.data) {
      console.log('📋 ID do QRCode:', pixQrCode.data.id);
      console.log('💰 Valor:', pixQrCode.data.amount);
      console.log('📊 Status:', pixQrCode.data.status);
      console.log('📱 BR Code:', pixQrCode.data.brCode);
      console.log('🖼️ BR Code Base64:', pixQrCode.data.brCodeBase64);
      console.log('⏰ Plataforma Fee:', pixQrCode.data.platformFee);
      console.log('📅 Criado em:', pixQrCode.data.createdAt);
      console.log('📅 Expira em:', pixQrCode.data.expiresAt);
    }

    return pixQrCode;
  } catch (error) {
    console.error('❌ Erro ao criar QRCode PIX:', error.message);
    if (error.response) {
      console.error('📄 Status:', error.response.status);
      console.error('📄 Dados do erro:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Executar teste
testPixPayment()
  .then(() => {
    console.log('🎉 Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Teste falhou:', error.message);
    process.exit(1);
  });