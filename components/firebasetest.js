import { useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function FirebaseTest() {
  useEffect(() => {
    const testFirebase = async () => {
      try {
        await addDoc(collection(db, 'test'), {
          message: 'Firebase connected!',
          timestamp: new Date()
        });
        console.log('✅ Firebase is working!');
      } catch (error) {
        console.error('❌ Firebase error:', error);
      }
    };
    
    testFirebase();
  }, []);

  return null;
}