const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();
const auth = admin.auth();

async function createTestClient() {
  try {
    console.log('🔄 Criando usuário de teste para cliente...');

    // Criar usuário no Auth
    const userRecord = await auth.createUser({
      email: 'cliente@teste.com',
      password: 'teste123',
      displayName: 'Cliente Teste',
      emailVerified: true
    });

    console.log('✅ Usuário criado no Auth:', userRecord.uid);

    // Criar documento do usuário
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: 'cliente@teste.com',
      name: 'Cliente Teste',
      planId: 'free',
      planActivatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      photoURL: null,
      role: 'user'
    });

    console.log('✅ Documento do usuário criado');

    // Criar uma compra/order
    const orderRef = db.collection('orders').doc();
    await orderRef.set({
      id: orderRef.id,
      userId: userRecord.uid,
      customerEmail: 'cliente@teste.com',
      customerName: 'Cliente Teste',
      serviceId: 'test_service_123',
      providerId: 'test_provider_123',
      amount: 2990, // R$ 29,90
      currency: 'brl',
      status: 'completed',
      paymentMethod: 'stripe',
      paymentIntentId: 'pi_test_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGuestCheckout: false,
      billingType: 'one_time',
      serviceTitle: 'Pacote de Artes Profissionais para Redes Sociais (12 Posts)',
      serviceDescription: 'Pacote completo de artes para redes sociais',
      providerName: 'Mateus Ferreira'
    });

    console.log('✅ Ordem de compra criada:', orderRef.id);

    // Criar uma assinatura também
    const subscriptionRef = db.collection('orders').doc();
    await subscriptionRef.set({
      id: subscriptionRef.id,
      userId: userRecord.uid,
      customerEmail: 'cliente@teste.com',
      customerName: 'Cliente Teste',
      serviceId: 'test_course_123',
      providerId: 'test_provider_123',
      amount: 29700, // R$ 297,00
      currency: 'brl',
      status: 'completed',
      paymentMethod: 'stripe',
      paymentIntentId: 'pi_sub_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGuestCheckout: false,
      billingType: 'subscription',
      serviceTitle: 'Seu Primeiro Infoproduto: Do Zero à Primeira Venda',
      serviceDescription: 'Curso completo sobre criação de infoprodutos',
      providerName: 'João Silva',
      subscriptionId: 'sub_test_' + Date.now(),
      subscriptionStatus: 'active'
    });

    console.log('✅ Assinatura criada:', subscriptionRef.id);

    console.log('\n🎉 Cliente de teste criado com sucesso!');
    console.log('📧 Email: cliente@teste.com');
    console.log('🔑 Senha: teste123');
    console.log('🔗 Acesse: http://localhost:5174/login');
    console.log('📊 Dashboard: http://localhost:5174/client');

  } catch (error) {
    console.error('❌ Erro ao criar cliente de teste:', error);
  } finally {
    process.exit(0);
  }
}

createTestClient();