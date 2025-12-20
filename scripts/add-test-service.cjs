const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
const serviceAccount = require('../serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addTestService() {
  try {
    const testService = {
      title: "Pacote de Artes Profissionais para Redes Sociais (12 Posts)",
      slug: "pacote-de-artes-profissionais-para-redes-sociais-12-posts",
      category: "Marketing Digital",
      city: "São Paulo",
      description: "Pacote completo de artes profissionais para redes sociais, incluindo 12 posts personalizados para Instagram, Facebook e outras plataformas.",
      whatsapp: "11999999999",
      ownerId: "test-owner-id",
      ownerEmail: "test@example.com",
      ownerName: "Prestador de Teste",
      status: "approved",
      type: "Serviço",
      price: "500,00",
      productType: "service",
      billingType: "one-time",
      images: [],
      views: 0,
      rating: 0,
      bookings: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('services').add(testService);
    console.log("Serviço de teste adicionado com ID:", docRef.id);
    console.log("Título salvo:", testService.title);
    console.log("Slug gerado:", testService.slug);

  } catch (error) {
    console.error("Erro ao adicionar serviço de teste:", error);
  }
}

addTestService();