const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://turplace-8468f.firebaseio.com'
});

const db = admin.firestore();

async function checkDomain() {
  try {
    console.log('🔍 Verificando domínio: lead.favelachiqueoficial.com.br');

    // Buscar lead page com domínio específico
    const leadPagesRef = db.collection('leadPages');
    const snapshot = await leadPagesRef.where('domain', '==', 'lead.favelachiqueoficial.com.br').get();

    if (snapshot.empty) {
      console.log('❌ Nenhuma lead page encontrada com o domínio lead.favelachiqueoficial.com.br');

      // Vamos ver todas as lead pages que têm domínio
      console.log('\n📋 Todas as lead pages com domínio configurado:');
      const allDomainsSnapshot = await leadPagesRef.where('domain', '!=', null).get();

      if (allDomainsSnapshot.empty) {
        console.log('Nenhuma lead page tem domínio configurado');
      } else {
        allDomainsSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`- ${data.domain} (userId: ${doc.id})`);
        });
      }
    } else {
      console.log('✅ Lead page encontrada:');
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`User ID: ${doc.id}`);
        console.log(`Domínio: ${data.domain}`);
        console.log(`Título: ${data.title || 'N/A'}`);
        console.log(`Slug: ${data.slug || 'N/A'}`);
      });
    }

    // Também verificar se existe usuário com email mateusferreiraprodev@gmail.com
    console.log('\n👤 Verificando usuário mateusferreiraprodev@gmail.com:');
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', 'mateusferreiraprodev@gmail.com').get();

    if (userSnapshot.empty) {
      console.log('❌ Usuário não encontrado');
    } else {
      userSnapshot.forEach(async (doc) => {
        const data = doc.data();
        console.log(`User ID: ${doc.id}`);
        console.log(`Email: ${data.email}`);
        console.log(`Nome: ${data.name || 'N/A'}`);

        // Verificar se tem leadpage configurada
        if (data.leadpage) {
          console.log(`📄 LeadPage encontrada:`);
          console.log(`🌐 Domínio: ${data.leadpage.domain || 'Não configurado'}`);
          console.log(`🏷️ Slug: ${data.slug || 'Não configurado'}`);

          if (data.leadpage.domain === 'lead.favelachiqueoficial.com.br') {
            console.log('✅ Domínio correto configurado!');
          } else {
            console.log('❌ Domínio não corresponde ao esperado');
          }
        } else {
          console.log('❌ LeadPage não configurada para este usuário');

          // Verificar se o domínio está salvo em outro campo
          console.log('🔍 Verificando outros campos...');
          console.log(`Campos disponíveis: ${Object.keys(data).join(', ')}`);

          // Verificar se existe algum campo relacionado a domínio
          Object.keys(data).forEach(key => {
            if (key.toLowerCase().includes('domain') || key.toLowerCase().includes('dominio')) {
              console.log(`📋 Campo ${key}: ${data[key]}`);
            }
          });
        }
      });
    }

  } catch (error) {
    console.error('💥 Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkDomain();