import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  const onLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Ingresa email y contraseña.');
      return;
    }
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await userCredential.user.getIdToken();
      
      // Obtener rol del usuario
      const API_BASE = 'https://apiantonioasistencias.onrender.com';
      const res = await fetch(`${API_BASE}/usuarios/${userCredential.user.uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const userData = await res.json();
        setSuccessVisible(true);
        setTimeout(() => {
          setSuccessVisible(false);
          // Redirigir según rol del usuario
          if (userData.rol === 'admin') {
            router.replace('/(tabs)/usuarios' as any);
          } else if (userData.rol === 'guardia') {
            router.replace('/(tabs)/mis-turnos' as any);
          } else {
            router.replace('/login');
          }
        }, 1200);
      } else {
        throw new Error('No se pudo obtener información del usuario');
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>Iniciar sesión</Text>

      <Text style={{ fontSize: 14 }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="tu@email.com"
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />

      <Text style={{ fontSize: 14, marginTop: 8 }}>Contraseña</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />

      {!!error && (
        <Text style={{ color: 'red', marginTop: 6 }}>{error}</Text>
      )}

      <TouchableOpacity
        onPress={onLogin}
        disabled={loading}
        style={{ backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '600' }}>Entrar</Text>
        )}
      </TouchableOpacity>

      <Modal visible={successVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '80%', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>¡Listo!</Text>
            <Text>Inicio de sesión exitoso</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
