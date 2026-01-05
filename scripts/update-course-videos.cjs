require('./load-env.cjs')();
const initFirestore = require('../api/_lib/firebaseAdmin.cjs');

(async () => {
  const db = initFirestore();

  // URLs dos vídeos do YouTube (removidas para manter o sistema dinâmico)
  const videoUrls = [];

  const serviceRef = db.collection('services').doc('p8FYT2NqxizQEvKP0qO7');
  const serviceSnap = await serviceRef.get();

  if (serviceSnap.exists) {
    const serviceData = serviceSnap.data();
    console.log('Updating course sections with video URLs...');

    // Atualizar cada seção com a URL do vídeo correspondente
    const updatedSections = serviceData.sections.map((section, index) => ({
      ...section,
      videoUrl: videoUrls[index] || section.videoUrl
    }));

    await serviceRef.update({ sections: updatedSections });
    console.log('✅ Course sections updated successfully!');

    // Verificar se foi atualizado
    const updatedSnap = await serviceRef.get();
    const updatedData = updatedSnap.data();
    console.log('Verification:');
    updatedData.sections.forEach((section, i) => {
      console.log(`Section ${i+1}: "${section.title}" - videoUrl: ${section.videoUrl || 'NOT SET'}`);
    });
  } else {
    console.log('❌ Course not found!');
  }

  process.exit(0);
})();