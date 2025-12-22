import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';

async function testTemplate() {
  try {
    const templateRef = doc(db, 'templates', 'default-tourism');
    const snap = await getDoc(templateRef);
    console.log('Template exists:', snap.exists());
    if (snap.exists()) {
      console.log('Template data:', snap.data());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testTemplate();