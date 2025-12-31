// Script para testar QRCode PIX direto do AbacatePay
// Execute com: node scripts/test-pix-qrcode.js

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

async function testPixQRCode() {
  try {
    console.log('💰 Criando QRCode PIX direto...');

    const pixData = {
      amount: 1000, // R$ 10,00 em centavos
      description: "Teste QRCode PIX Direto - Lucrazi",
      metadata: {
        test: true,
        orderId: "test-order-123"
      }
    };

    const pix = await abacate.pixQrCode.create(pixData);

    console.log('✅ QRCode PIX criado com sucesso!');
    console.log('📄 Tipo da resposta:', typeof pix);
    console.log('📄 Chaves da resposta:', Object.keys(pix || {}));
    console.log('📄 Resposta completa:', JSON.stringify(pix, null, 2));

    if (pix.error) {
      console.error('❌ Erro na resposta da API:', pix.error);
      throw new Error(`API Error: ${pix.error}`);
    }

    if (!pix.data) {
      console.error('❌ Dados não encontrados na resposta');
      throw new Error('No data in response');
    }

    console.log('📋 ID do QRCode:', pix.data.id);
    console.log('💰 Valor:', pix.data.amount);
    console.log('📊 Status:', pix.data.status);
    console.log('📱 BR Code:', pix.data.brCode);
    console.log('🖼️ BR Code Base64:', pix.data.brCodeBase64?.substring(0, 50) + '...');
    console.log('⏰ Plataforma Fee:', pix.data.platformFee);
    console.log('📅 Criado em:', pix.data.createdAt);
    console.log('📅 Expira em:', pix.data.expiresAt);

    return pix;
  } catch (error) {
    console.error('❌ Erro ao criar QRCode PIX:', error.message);
    if (error.response) {
      console.error('📄 Detalhes do erro da API:', error.response.data);
      console.error('📄 Status do erro:', error.response.status);
    }
    throw error;
  }
}

// Executar teste
testPixQRCode()
  .then(() => {
    console.log('🎉 Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Teste falhou:', error.message);
    process.exit(1);
  });