const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
const serviceAccount = require('../serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateExistingServices() {
  try {
    console.log("Buscando serviços existentes...");

    const servicesRef = db.collection('services');
    const snapshot = await servicesRef.get();

    if (snapshot.empty) {
      console.log('Nenhum serviço encontrado.');
      return;
    }

    let updatedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const title = data.title;

      if (!title) {
        console.log(`Serviço ${doc.id} não tem título, pulando...`);
        continue;
      }

      // Gerar slug se não existir
      if (!data.slug) {
        const cleanTitle = title.includes('%') ? decodeURIComponent(title) : title;
        const slug = cleanTitle.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-') // remover hífens consecutivos
          .replace(/^-|-$/g, ''); // remover hífens no início/fim

        console.log(`Atualizando serviço "${title}" com slug: ${slug}`);

        await doc.ref.update({
          slug: slug,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        updatedCount++;
      } else {
        console.log(`Serviço "${title}" já tem slug: ${data.slug}`);
      }
    }

    console.log(`\n✅ Atualização concluída! ${updatedCount} serviços atualizados com slug.`);

  } catch (error) {
    console.error("Erro ao atualizar serviços:", error);
  }
}

updateExistingServices();