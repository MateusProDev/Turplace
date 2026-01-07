// Script para criar leadpages padrão para todos os usuários
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://turplace-8468f.firebaseio.com'
});

const db = admin.firestore();

async function createDefaultLeadPages() {
  try {
    console.log('🔍 Buscando todos os usuários...');

    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();

    console.log(`📊 Total de usuários encontrados: ${usersSnapshot.size}`);

    let usersWithoutLeadPage = 0;
    let usersWithLeadPage = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Verificar se o usuário já tem leadpage
      if (!userData.leadpage) {
        usersWithoutLeadPage++;
        console.log(`📝 Criando leadpage para: ${userData.email} (${userId})`);

        // Criar leadpage padrão
        const defaultLeadPage = {
          title: `Página de ${userData.name || 'Captura de Leads'}`,
          subtitle: 'Transforme visitantes em clientes',
          content: 'Bem-vindo à minha página de captura! Deixe seus dados para receber mais informações.',
          buttonText: 'Quero Saber Mais',
          buttonLink: 'https://wa.me/5511999999999',
          domain: null,
          templateId: 'default',
          sections: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Salvar na coleção leadPages
        await db.collection('leadPages').doc(userId).set(defaultLeadPage);

        // Atualizar o usuário com referência à leadpage
        await usersRef.doc(userId).update({
          leadpage: {
            domain: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Leadpage criada para ${userData.email}`);
      } else {
        usersWithLeadPage++;
      }
    }

    console.log('\n📊 Resumo:');
    console.log(`✅ Usuários com leadpage: ${usersWithLeadPage}`);
    console.log(`📝 Leadpages criadas: ${usersWithoutLeadPage}`);
    console.log(`🎯 Total processado: ${usersSnapshot.size}`);

  } catch (error) {
    console.error('💥 Erro:', error);
  } finally {
    process.exit(0);
  }
}

createDefaultLeadPages();