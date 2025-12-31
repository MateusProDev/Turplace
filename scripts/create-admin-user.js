import admin from 'firebase-admin';
import initFirestore from '../api/_lib/firebaseAdmin.js';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
try {
  require('dotenv').config({ path: join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: join(__dirname, '..', '.env') });
} catch (e) {
  console.log('dotenv não disponível, tentando manualmente...');
}

// Inicializar Firebase Admin
const db = initFirestore();

async function createAdminUser(email, password, displayName = 'Admin') {
  try {
    console.log('🔄 Criando usuário admin...');

    // Criar usuário no Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: true,
    });

    console.log('✅ Usuário criado no Auth:', userRecord.uid);

    // Definir como admin no Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      displayName: displayName,
      isAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'admin'
    });

    console.log('✅ Usuário definido como admin no Firestore');
    console.log('📧 Email:', email);
    console.log('🔑 Senha:', password);
    console.log('🆔 UID:', userRecord.uid);

    return userRecord;
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    throw error;
  }
}

// Exemplo de uso - substitua pelos valores desejados
const adminEmail = 'admin@lucrazi.com'; // Altere para o email desejado
const adminPassword = 'Admin123!'; // Altere para uma senha forte
const adminDisplayName = 'Administrador Lucrazi';

createAdminUser(adminEmail, adminPassword, adminDisplayName)
  .then(() => {
    console.log('🎉 Conta admin criada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha ao criar conta admin:', error);
    process.exit(1);
  });