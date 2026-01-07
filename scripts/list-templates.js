import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase.js';

async function listAllTemplates() {
  try {
    console.log('🔍 Buscando todos os templates...\n');

    const templatesRef = collection(db, 'templates');
    const snapshot = await getDocs(templatesRef);

    console.log(`📊 Total de templates encontrados: ${snapshot.docs.length}\n`);

    snapshot.docs.forEach((doc, index) => {
      const template = doc.data();
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Seções: ${template.sections?.length || 0}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro ao listar templates:', error);
  }
}

listAllTemplates();