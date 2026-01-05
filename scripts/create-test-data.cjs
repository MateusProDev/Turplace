
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

async function createTestCourse() {
  try {
    const courseRef = db.collection('courses').doc('test_course_123');
    await courseRef.set({
      title: 'Do Zero à Primeira Venda - Crie e Venda seu Primeiro Infoproduto',
      description: 'Aprenda a criar e vender seu primeiro produto digital do zero. Este curso completo vai te guiar desde a ideia inicial até a primeira venda.',
      price: '97.00',
      priceMonthly: null,
      billingType: 'one-time',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
      sections: [
        {
          id: 'section-1',
          title: 'Introdução ao Mercado Digital',
          description: 'Entenda o potencial do mercado de infoprodutos',
          videoUrl: 'https://www.youtube.com/watch?v=example1',
          duration: '15:30',
          order: 1
        },
        {
          id: 'section-2',
          title: 'Validando sua Ideia',
          description: 'Como saber se sua ideia tem potencial',
          videoUrl: 'https://www.youtube.com/watch?v=example2',
          duration: '22:45',
          order: 2
        },
        {
          id: 'section-3',
          title: 'Criando seu Primeiro Produto',
          description: 'Passo a passo para criar conteúdo de qualidade',
          videoUrl: 'https://www.youtube.com/watch?v=example3',
          duration: '28:10',
          order: 3
        }
      ],
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      instructorId: 'instructor_123',
      totalStudents: 0,
      rating: 0
    });
    console.log('Test course created with ID: test_course_123');

  } catch (error) {
    console.error('Error creating test course:', error);
  }
}

createTestService();
createTestCourse();