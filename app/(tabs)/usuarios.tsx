import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../lib/firebase';

const API_BASE = 'https://apiantonioasistencias.onrender.com';

type Usuario = {
  id: string;
  uid?: string;
  nombre: string;
  rol: 'admin' | 'guardia' | string;
  activo: boolean;
  email?: string;
};

export default function UsuariosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  const user = auth.currentUser;

  const fetchToken = async () => {
    if (!user) return null;
    return user.getIdToken();
  };

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const loadMe = async (tkn: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const res = await fetch(`${API_BASE}/usuarios/${uid}`, { headers: { Authorization: `Bearer ${tkn}` } });
    if (!res.ok) throw new Error('Error obteniendo usuario actual');
    const me: Usuario = await res.json();
    setCurrentUserRole(me.rol);
  };

  const loadUsuarios = async (tkn: string) => {
    const res = await fetch(`${API_BASE}/usuarios`, { headers: { Authorization: `Bearer ${tkn}` } });
    if (!res.ok) throw new Error('Error listando usuarios');
    const data: Usuario[] = await res.json();
    setUsuarios(data);
  };

  useEffect(() => {
    (async () => {
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        setLoading(true);
        const t = await fetchToken();
        if (!t) throw new Error('Sin token');
        setToken(t);
        await loadMe(t);
        await loadUsuarios(t);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'No se pudo cargar usuarios');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onOpenDetail = (u: Usuario) => {
    setSelected(u);
    setDetailVisible(true);
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/usuarios/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Error eliminando');
      setDetailVisible(false);
      setUsuarios(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar');
    } finally {
      setSaving(false);
    }
  };

  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRol, setFormRol] = useState<'admin' | 'guardia'>('guardia');

  const resetForm = () => {
    setFormNombre('');
    setFormEmail('');
    setFormPassword('');
    setFormRol('guardia');
  };

  const onCreate = async () => {
    if (!token) return;
    if (!formNombre) {
      Alert.alert('Validación', 'Nombre es requerido');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/usuarios`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nombre: formNombre, email: formEmail || undefined, password: formPassword || undefined, rol: formRol, activo: true }),
      });
      if (!res.ok) throw new Error('Error creando');
      const nuevo: Usuario = await res.json();
      setUsuarios(prev => [nuevo, ...prev]);
      setFormVisible(false);
      resetForm();
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async () => {
    if (!token || !selected) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/usuarios/${selected.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ nombre: selected.nombre, rol: selected.rol, activo: selected.activo }),
      });
      if (!res.ok) throw new Error('Error actualizando');
      const updated: Usuario = await res.json();
      setUsuarios(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      setDetailVisible(false);
      setSelected(null);
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>No autenticado</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Cargando...</Text>
      </View>
    );
  }

  if (currentUserRole !== 'admin') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, textAlign: 'center' }}>Esta vista es solo para administradores.</Text>
        <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: '#2563eb', borderRadius: 8 }} onPress={() => router.replace('/(tabs)/mis-turnos' as any)}>
          <Text style={{ color: '#fff' }}>Ir a Mis turnos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        data={usuarios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onOpenDetail(item)} activeOpacity={0.8} style={{ marginBottom: 12 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.nombre}</Text>
              <Text style={{ color: '#555', marginTop: 4 }}>Rol: {item.rol}</Text>
              <Text style={{ color: item.activo ? '#16a34a' : '#b91c1c', marginTop: 4 }}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text>No hay usuarios</Text>
          </View>
        )}
      />

      <TouchableOpacity onPress={() => setFormVisible(true)} activeOpacity={0.9} style={{ position: 'absolute', right: 20, bottom: 30, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 3 }}>
        <Text style={{ color: '#fff', fontSize: 28, marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      {/* Modal Detalle / Editar */}
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%' }}>
            {selected && (
              <>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Usuario</Text>
                <Text style={{ marginBottom: 6 }}>ID: {selected.id}</Text>
                <Text style={{ marginBottom: 6 }}>Nombre</Text>
                <TextInput value={selected.nombre} onChangeText={(t) => setSelected({ ...selected, nombre: t })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
                <Text style={{ marginBottom: 6 }}>Rol</Text>
                <TextInput value={selected.rol} onChangeText={(t) => setSelected({ ...selected, rol: t })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
                <Text style={{ marginBottom: 6 }}>Activo</Text>
                <TextInput value={String(selected.activo)} onChangeText={(t) => setSelected({ ...selected, activo: t.toLowerCase() === 'true' })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 16 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity disabled={saving} onPress={onUpdate} style={{ backgroundColor: '#16a34a', padding: 12, borderRadius: 8, flex: 1, marginRight: 6 }}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center' }}>Guardar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity disabled={saving} onPress={() => onDelete(selected.id)} style={{ backgroundColor: '#b91c1c', padding: 12, borderRadius: 8, flex: 1, marginLeft: 6 }}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center' }}>Eliminar</Text>}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity disabled={saving} onPress={() => setDetailVisible(false)} style={{ marginTop: 12, padding: 10 }}>
                  <Text style={{ textAlign: 'center' }}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Crear */}
      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%' }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Agregar usuario</Text>

            <Text style={{ marginBottom: 6 }}>Nombre</Text>
            <TextInput value={formNombre} onChangeText={setFormNombre} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />

            <Text style={{ marginBottom: 6 }}>Email (opcional para crear cuenta Auth)</Text>
            <TextInput value={formEmail} onChangeText={setFormEmail} autoCapitalize="none" keyboardType="email-address" style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />

            <Text style={{ marginBottom: 6 }}>Password (opcional si incluyes email)</Text>
            <TextInput value={formPassword} onChangeText={setFormPassword} secureTextEntry style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />

            <Text style={{ marginBottom: 6 }}>Rol (admin o guardia)</Text>
            <TextInput value={formRol} onChangeText={(t) => setFormRol((t as 'admin' | 'guardia') || 'guardia')} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity disabled={saving} onPress={onCreate} style={{ backgroundColor: '#2563eb', padding: 12, borderRadius: 8, flex: 1, marginRight: 6 }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center' }}>Crear</Text>}
              </TouchableOpacity>
              <TouchableOpacity disabled={saving} onPress={() => setFormVisible(false)} style={{ backgroundColor: '#6b7280', padding: 12, borderRadius: 8, flex: 1, marginLeft: 6 }}>
                <Text style={{ color: '#fff', textAlign: 'center' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
