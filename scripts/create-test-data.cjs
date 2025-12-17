
const loadEnv = require('./load-env.cjs');
loadEnv();

const initFirestore = require('../api/_lib/firebaseAdmin.cjs');

const db = initFirestore();

async function createTestService() {
  try {
    const serviceRef = db.collection('services').doc('test_service_123');
    await serviceRef.set({
      title: 'Serviço de Teste',
      description: 'Serviço para testar checkout',
      price: 100.00, // R$ 100,00
      providerId: 'test_provider_123',
      category: 'test',
      createdAt: new Date().toISOString(),
    });
    console.log('Test service created with ID: test_service_123');

    // Também criar provider de teste
    const providerRef = db.collection('providers').doc('test_provider_123');
    await providerRef.set({
      name: 'Provider de Teste',
      email: 'test@provider.com',
      planId: 'free', // plano free
      connectedAccountId: null, // sem Stripe Connect
      createdAt: new Date().toISOString(),
    });
    console.log('Test provider created with ID: test_provider_123');

  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

createTestService();