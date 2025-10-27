import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCajBxW-bQ6dkTTUla4Uum7qR_TLa_fmfI",
  authDomain: "asistenciasantonio.firebaseapp.com",
  projectId: "asistenciasantonio",
  storageBucket: "asistenciasantonio.firebasestorage.app",
  messagingSenderId: "332742708741",
  appId: "1:332742708741:web:248c148f61ff113820566c",
  measurementId: "G-VQVY95500G"
};

// Ensure app is initialized only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth instance - Firebase automatically uses AsyncStorage for persistence in React Native
// if @react-native-async-storage/async-storage is installed
export const auth = getAuth(app);

export default app;
