/**
 * Firestore init script (creates example documents)
 * Usage:
 * 1) create a Google service account JSON and set env var:
 *    set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccount.json   (Windows PowerShell/CMD)
 * 2) npm install firebase-admin
 * 3) node scripts/initFirestore.js [adminUid] [adminEmail]
 */

const admin = require('firebase-admin');

const svcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!svcPath) {
  console.error('ERROR: set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path');
  process.exit(1);
}

const serviceAccount = require(svcPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  const adminUid = process.argv[2] || 'admin';
  const adminEmail = process.argv[3] || 'admin@example.com';

  console.log('Creating admin user doc -> users/' + adminUid);
  await db.doc(`users/${adminUid}`).set({
    id: adminUid,
    name: 'Administrator',
    email: adminEmail,
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Creating sample service (pending -> approved)');
  const svcRef = await db.collection('services').add({
    ownerId: adminUid,
    title: 'Passeio Exemplo',
    description: 'Passeio demonstrativo para validar o MVP.',
    category: 'Passeio',
    city: 'Cidade Exemplo',
    images: [],
    whatsapp: '5511999999999',
    status: 'approved',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Creating sample lead for service', svcRef.id);
  await db.collection('leads').add({
    serviceId: svcRef.id,
    ownerId: adminUid,
    origem: 'init_script',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Init complete. Documents created: users/' + adminUid + ', services/' + svcRef.id + ', leads/*');
}

run().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});
