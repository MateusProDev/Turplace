import { config } from 'dotenv';
config({ path: '.env.local' });
import admin from 'firebase-admin';
import initFirestore from '../api/_lib/firebaseAdmin.cjs';

const db = initFirestore();

async function deleteAllTemplates() {
  console.log('🗑️ Deletando todos os templates...');

  try {
    const templatesRef = db.collection('templates');
    const snapshot = await templatesRef.get();

    if (snapshot.empty) {
      console.log('📭 Nenhum template encontrado para deletar.');
      return;
    }

    const deletePromises = [];
    snapshot.forEach((doc) => {
      console.log(`🗑️ Deletando template: ${doc.id}`);
      deletePromises.push(doc.ref.delete());
    });

    await Promise.all(deletePromises);
    console.log(`✅ ${deletePromises.length} templates deletados com sucesso!`);

  } catch (error) {
    console.error('❌ Erro ao deletar templates:', error);
  }
}

deleteAllTemplates().catch(console.error);