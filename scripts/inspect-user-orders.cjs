require('./load-env.cjs')();
const initFirestore = require('../api/_lib/firebaseAdmin.cjs');

(async () => {
  try {
    const db = initFirestore();

    // Get userId from argument or email
    const arg = process.argv[2];
    if (!arg) {
      console.error('Uso: node inspect-user-orders.js <userId> ou <email>');
      process.exit(1);
    }

    let userId = arg;
    let userEmail = null;

    // If it's an email, find the userId
    if (arg.includes('@')) {
      const usersSnap = await db.collection('users').where('email', '==', arg).limit(1).get();
      if (usersSnap.empty) {
        console.error('Usuário não encontrado com email:', arg);
        process.exit(1);
      }
      userId = usersSnap.docs[0].id;
      userEmail = arg;
    } else {
      // It's a userId, get email
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        console.error('Usuário não encontrado com ID:', userId);
        process.exit(1);
      }
      userEmail = userDoc.data().email;
    }

    console.log('Inspecionando pedidos para usuário:', userId, 'Email:', userEmail);

    // Get orders
    const ordersSnap = await db.collection('orders')
      .where('userId', '==', userId)
      .get();

    if (ordersSnap.empty) {
      console.log('Nenhum pedido encontrado para este usuário.');
      process.exit(0);
    }

    console.log(`Encontrados ${ordersSnap.size} pedidos:`);
    console.log('=' .repeat(80));

    for (const orderDoc of ordersSnap.docs) {
      const orderData = orderDoc.data();
      console.log(`Pedido ID: ${orderDoc.id}`);
      console.log(`Status: ${orderData.status}`);
      console.log(`Serviço ID: ${orderData.serviceId || 'N/A'}`);
      console.log(`Valor: R$ ${(orderData.amount || orderData.totalAmount || 0).toFixed(2)}`);
      console.log(`Criado em: ${orderData.createdAt}`);
      console.log(`Método: ${orderData.paymentMethod || 'N/A'}`);
      console.log(`MercadoPago Payment ID: ${orderData.mercadopagoPaymentId || 'N/A'}`);
      console.log(`MercadoPago Status: ${orderData.mercadopagoStatus || 'N/A'}`);

      // Check if service exists and is a course
      if (orderData.serviceId) {
        const serviceDoc = await db.collection('services').doc(orderData.serviceId).get();
        if (serviceDoc.exists) {
          const serviceData = serviceDoc.data();
          console.log(`Serviço: ${serviceData.title || serviceData.name}`);
          console.log(`Tipo: ${serviceData.type}`);
          if (serviceData.type === 'course' && serviceData.sections) {
            console.log(`Seções do curso: ${serviceData.sections.length}`);
          }
        } else {
          console.log('Serviço não encontrado!');
        }
      }

      console.log('-'.repeat(40));
    }

    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
})();