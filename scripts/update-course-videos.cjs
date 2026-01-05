require('./load-env.cjs')();
const initFirestore = require('../api/_lib/firebaseAdmin.cjs');

(async () => {
  const db = initFirestore();

  // URLs dos vídeos do YouTube
  const videoUrls = [
    'https://youtu.be/wt-GasYBS14?si=foL7mRnngsnYd28h',
    'https://youtu.be/F9EA0Q7T8vY?si=fIdY8cEB-IbWOL_C',
    'https://youtu.be/0IaIqnUSlUM?si=nCaaCsS5-51ca_8o',
    'https://youtu.be/oDFKrT5b57w?si=iOi_siNAOBmEbzDL',
    'https://youtu.be/S6BHQqyMRzA?si=UTfOCYeLhgC3E2yX',
    'https://youtu.be/fok9DnQJrVM?si=F0UAF0VIE5FEgQPx',
    'https://youtu.be/uiXcdaxSjCA?si=j1mi944T0E-wyfN8'
  ];

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