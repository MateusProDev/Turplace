const loadEnv = require('./load-env.cjs');
loadEnv();

require('dotenv').config();

const admin = require('firebase-admin');

const svcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!svcPath) {
  console.error('ERROR: set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path');
  process.exit(1);
}

const serviceAccount = require(svcPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function generateSlug(title) {
  const cleanTitle = title.includes('%') ? decodeURIComponent(title) : title;
  return cleanTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens consecutivos
    .replace(/^-|-$/g, ''); // Remove hífens no início/fim
}

async function addSlugsToUsers() {
  try {
    console.log('Buscando usuários sem slug...');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    let updated = 0;
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;

      if (!userData.slug && userData.name) {
        const slug = await generateUniqueSlug(userData.name, userId);
        await usersRef.doc(userId).update({
          slug: slug,
          updatedAt: new Date()
        });
        console.log(`Slug adicionado para ${userData.name}: ${slug}`);
        updated++;
      }
    }

    console.log(`Total de usuários atualizados: ${updated}`);
  } catch (error) {
    console.error('Erro ao adicionar slugs:', error);
  }
}

async function generateUniqueSlug(name, userId) {
  let slug = generateSlug(name);
  if (!slug) slug = `user-${userId.slice(0, 8)}`;

  try {
    // Verificar se já existe
    const existing = await db.collection('users').where('slug', '==', slug).get();
    if (!existing.empty) {
      // Adicionar sufixo
      let counter = 1;
      let uniqueSlug = `${slug}-${counter}`;
      while (true) {
        const check = await db.collection('users').where('slug', '==', uniqueSlug).get();
        if (check.empty) {
          return uniqueSlug;
        }
        counter++;
        uniqueSlug = `${slug}-${counter}`;
      }
    }
    return slug;
  } catch (error) {
    console.error('Erro ao gerar slug único:', error);
    return slug;
  }
}

addSlugsToUsers();