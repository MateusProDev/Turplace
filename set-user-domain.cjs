// Script para configurar domínio para um usuário específico
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://turplace-8468f.firebaseio.com'
});

const db = admin.firestore();

async function setUserDomain() {
  try {
    const userEmail = 'mateusferreiraprodev@gmail.com';
    const domain = 'lead.favelachiqueoficial.com.br';

    console.log(`🔍 Procurando usuário: ${userEmail}`);

    // Buscar usuário por email
    const usersRef = db.collection('users');
    const userQuery = usersRef.where('email', '==', userEmail);
    const userSnapshot = await userQuery.get();

    if (userSnapshot.empty) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    console.log(`✅ Usuário encontrado: ${userId}`);

    // Atualizar a leadpage com o domínio
    const leadPageRef = db.collection('leadPages').doc(userId);
    await leadPageRef.update({
      domain: domain,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Domínio ${domain} configurado para o usuário ${userEmail}`);

    // Verificar se foi salvo corretamente
    const updatedDoc = await leadPageRef.get();
    const updatedData = updatedDoc.data();

    console.log('📄 Dados atualizados:');
    console.log(`🌐 Domínio: ${updatedData.domain}`);
    console.log(`🏷️ Slug: ${updatedData.slug || 'N/A'}`);

  } catch (error) {
    console.error('💥 Erro:', error);
  } finally {
    process.exit(0);
  }
}

setUserDomain();