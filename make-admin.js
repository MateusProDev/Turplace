// COPIE E COLE ESTE CÓDIGO NO CONSOLE DO NAVEGADOR APÓS FAZER LOGIN

// Script para tornar um usuário admin
(async () => {
  try {
    // Importar Firebase
    const { db } = await import('/src/utils/firebase.js');
    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { auth } = await import('/src/utils/firebase.js');

    if (auth.currentUser) {
      console.log('🔄 Definindo usuário como admin...');
      console.log('Email:', auth.currentUser.email);
      console.log('UID:', auth.currentUser.uid);

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isAdmin: true
      });

      console.log('✅ SUCESSO! Usuário definido como admin!');
      console.log('🔄 Recarregando página em 2 segundos...');

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      console.log('❌ ERRO: Você não está logado!');
    }
  } catch (error) {
    console.error('❌ ERRO ao definir como admin:', error);
  }
})();