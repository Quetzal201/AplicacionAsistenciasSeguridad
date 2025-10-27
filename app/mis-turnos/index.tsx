import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../lib/firebase';

const API_BASE = 'https://apiantonioasistencias.onrender.com';

type Turno = { id: string; nombre: string; horaInicio: string; horaFin: string; usuarioId: string; fecha: string };

type Usuario = { id: string; nombre: string; rol: 'admin' | 'guardia' | string; activo: boolean };

export default function MisTurnosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        setLoading(true);
        const t = await user.getIdToken();
        setToken(t);
        // rol
        const resMe = await fetch(`${API_BASE}/usuarios/${user.uid}`, { headers: { Authorization: `Bearer ${t}` } });
        if (!resMe.ok) throw new Error('Error rol');
        const me: Usuario = await resMe.json();
        setRole(me.rol);
        // cargar mis turnos
        const res = await fetch(`${API_BASE}/turnos?usuarioId=${encodeURIComponent(user.uid)}`, { headers: { Authorization: `Bearer ${t}` } });
        if (!res.ok) throw new Error('Error listando turnos');
        const data: Turno[] = await res.json();
        setTurnos(data);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'No se pudieron cargar tus turnos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const marcarAsistencia = async (turno: Turno) => {
    if (!token) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    try {
      setSaving(true);
      // 1) intentar crear asistencia
      let res = await fetch(`${API_BASE}/asistencias`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ usuarioId: userId, turnoId: turno.id, fecha: turno.fecha, asistio: true }),
      });
      if (res.status === 409) {
        // ya existe, buscarla y actualizar
        const q = `?usuarioId=${encodeURIComponent(userId)}&fecha=${encodeURIComponent(turno.fecha)}`;
        const list = await fetch(`${API_BASE}/asistencias${q}`, { headers });
        if (list.ok) {
          const items: { id: string; turnoId: string }[] = await list.json();
          const found = items.find(i => i.turnoId === turno.id);
          if (found) {
            res = await fetch(`${API_BASE}/asistencias/${found.id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ asistio: true }),
            });
          }
        }
      }
      if (!res.ok) throw new Error('No se pudo marcar asistencia');
      Alert.alert('Gracias', 'Se registró tu asistencia.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo marcar la asistencia');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Cargando...</Text>
      </View>
    );
  }

  if (role !== 'guardia') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ textAlign: 'center' }}>Esta vista es solo para guardias.</Text>
        <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: '#2563eb', borderRadius: 8 }} onPress={() => router.replace('/(tabs)')}>
          <Text style={{ color: '#fff' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={turnos}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text>No tienes turnos asignados</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.nombre}</Text>
            <Text style={{ marginTop: 4, color: '#555' }}>Fecha: {item.fecha}</Text>
            <Text style={{ marginTop: 4, color: '#555' }}>Horario: {item.horaInicio} - {item.horaFin}</Text>
            <TouchableOpacity disabled={saving} onPress={() => marcarAsistencia(item)} style={{ marginTop: 12, backgroundColor: '#16a34a', padding: 12, borderRadius: 8 }}>
              <Text style={{ color: '#fff', textAlign: 'center' }}>{saving ? 'Guardando...' : 'Marcar asistencia'}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
