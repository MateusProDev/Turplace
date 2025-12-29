// Script para verificar se o usuário é admin no Firestore
// Execute no console do navegador após fazer login

import { db } from './src/utils/firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from './src/utils/firebase.js';

const checkAdminStatus = async () => {
  if (auth.currentUser) {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log('Dados do usuário no Firestore:', userData);
      console.log('isAdmin:', userData.isAdmin);
      console.log('Email:', userData.email);
    } else {
      console.log('Documento do usuário não encontrado no Firestore');
    }
  } else {
    console.log('Usuário não está logado');
  }
};

checkAdminStatus();