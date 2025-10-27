import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, FlatList, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../lib/firebase';

const API_BASE = 'https://apiantonioasistencias.onrender.com';

type Usuario = {
  id: string;
  nombre: string;
  rol: 'admin' | 'guardia' | string;
  activo: boolean;
};
type Turno = { id: string; nombre: string; horaInicio: string; horaFin: string };

export default function TurnosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // data
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // crear turno
  const [formVisible, setFormVisible] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formInicio, setFormInicio] = useState(''); // HH:mm
  const [formFin, setFormFin] = useState(''); // HH:mm
  const [formFecha, setFormFecha] = useState(''); // YYYY-MM-DD
  const [formUsuario, setFormUsuario] = useState<Usuario | null>(null);
  const [userPickerFormVisible, setUserPickerFormVisible] = useState(false);

  // editar / detalle turno
  const [selected, setSelected] = useState<Turno | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // asignación
  const [assignVisible, setAssignVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [userPickerVisible, setUserPickerVisible] = useState(false);
  const [assignFecha, setAssignFecha] = useState(''); // YYYY-MM-DD

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
        const res = await fetch(`${API_BASE}/usuarios/${user.uid}`, { headers: { Authorization: `Bearer ${t}` } });
        if (!res.ok) throw new Error('Error cargando rol');
        const me: Usuario = await res.json();
        setRole(me.rol);
        if (me.rol === 'admin') {
          await Promise.all([loadTurnos(t), loadUsuarios(t)]);
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'No se pudo cargar el rol');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const loadTurnos = async (tkn?: string) => {
    const res = await fetch(`${API_BASE}/turnos`, { headers: { Authorization: `Bearer ${tkn || token}` } as any });
    if (!res.ok) throw new Error('Error listando turnos');
    const data: Turno[] = await res.json();
    setTurnos(data);
  };

  const loadUsuarios = async (tkn?: string) => {
    const res = await fetch(`${API_BASE}/usuarios`, { headers: { Authorization: `Bearer ${tkn || token}` } as any });
    if (!res.ok) throw new Error('Error listando usuarios');
    const data: Usuario[] = await res.json();
    setUsuarios(data);
  };

  const onCreateTurno = async () => {
    if (!formNombre || !formInicio || !formFin || !formUsuario || !formFecha) {
      Alert.alert('Validación', 'nombre, horaInicio, horaFin, usuario y fecha son requeridos');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/turnos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nombre: formNombre, horaInicio: formInicio, horaFin: formFin, usuarioId: formUsuario.id, fecha: formFecha }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || 'Error creando turno');
      }
      const nuevo: Turno = await res.json();
      setTurnos(prev => [nuevo, ...prev]);
      setFormVisible(false);
      setFormNombre(''); setFormInicio(''); setFormFin(''); setFormFecha(''); setFormUsuario(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear turno';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const onUpdateTurno = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/turnos/${selected.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ nombre: selected.nombre, horaInicio: selected.horaInicio, horaFin: selected.horaFin }),
      });
      if (!res.ok) throw new Error('Error actualizando turno');
      const updated: Turno = await res.json();
      setTurnos(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      setDetailVisible(false);
      setSelected(null);
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar turno');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteTurno = async (id: string) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/turnos/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error eliminando turno');
      setTurnos(prev => prev.filter(t => t.id !== id));
      setDetailVisible(false);
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar turno');
    } finally {
      setSaving(false);
    }
  };

  const onAssign = async () => {
    if (!selected || !selectedUser || !assignFecha) {
      Alert.alert('Validación', 'Selecciona usuario y fecha');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/asistencias`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ usuarioId: selectedUser.id, turnoId: selected.id, fecha: assignFecha, asistio: false }),
      });
      if (!res.ok) throw new Error('Error asignando turno');
      setAssignVisible(false);
      setSelectedUser(null);
      setAssignFecha('');
      Alert.alert('Listo', 'Turno asignado');
    } catch (e) {
      Alert.alert('Error', 'No se pudo asignar turno');
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

  if (role !== 'admin') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, textAlign: 'center' }}>Esta vista (Turnos) es solo para administradores.</Text>
        <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: '#2563eb', borderRadius: 8 }} onPress={() => router.replace('/(tabs)/mis-turnos' as any)}>
          <Text style={{ color: '#fff' }}>Ir a Mis turnos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={turnos}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={() => (
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Turnos</Text>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text>No hay turnos</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => { setSelected(item); setDetailVisible(true); }} activeOpacity={0.8} style={{ marginBottom: 12 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.nombre}</Text>
              <Text style={{ marginTop: 4, color: '#555' }}>Inicio: {item.horaInicio} · Fin: {item.horaFin}</Text>
              {'usuarioId' in item && (item as any).usuarioId ? (
                <Text style={{ marginTop: 4, color: '#555' }}>Usuario: {(item as any).usuarioId} · Fecha: {(item as any).fecha}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB crear */}
      <TouchableOpacity onPress={() => setFormVisible(true)} activeOpacity={0.9} style={{ position: 'absolute', right: 20, bottom: 30, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 3 }}>
        <Text style={{ color: '#fff', fontSize: 28, marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      {/* Modal crear turno */}
      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => setFormVisible(false)} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%' }}>
            <TouchableOpacity onPress={() => setFormVisible(false)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Crear turno</Text>
            <Text style={{ marginBottom: 6 }}>Nombre</Text>
            <TextInput value={formNombre} onChangeText={setFormNombre} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio</Text>
            <Text style={{ marginBottom: 6 }}>Hora inicio (HH:mm)</Text>
            <TextInput value={formInicio} onChangeText={setFormInicio} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio. Formato HH:mm</Text>
            <Text style={{ marginBottom: 6 }}>Hora fin (HH:mm)</Text>
            <TextInput value={formFin} onChangeText={setFormFin} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio. Formato HH:mm</Text>

            <Text style={{ marginBottom: 6 }}>Usuario</Text>
            <TouchableOpacity onPress={() => setUserPickerFormVisible(true)} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }}>
              <Text>{formUsuario ? formUsuario.nombre : 'Selecciona un usuario'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio</Text>

            <Text style={{ marginBottom: 6 }}>Fecha (YYYY-MM-DD)</Text>
            <TextInput value={formFecha} onChangeText={setFormFecha} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 16 }} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -12, marginBottom: 16 }}>Obligatorio. Formato YYYY-MM-DD</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity disabled={saving} onPress={onCreateTurno} style={{ backgroundColor: '#2563eb', padding: 12, borderRadius: 8, flex: 1, marginRight: 6 }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center' }}>Crear</Text>}
              </TouchableOpacity>
              <TouchableOpacity disabled={saving} onPress={() => setFormVisible(false)} style={{ backgroundColor: '#6b7280', padding: 12, borderRadius: 8, flex: 1, marginLeft: 6 }}>
                <Text style={{ color: '#fff', textAlign: 'center' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal detalle turno */}
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => setDetailVisible(false)} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%' }}>
            <TouchableOpacity onPress={() => setDetailVisible(false)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            {selected && (
              <>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Turno</Text>
                <Text style={{ marginBottom: 6 }}>ID: {selected.id}</Text>
                <Text style={{ marginBottom: 6 }}>Nombre</Text>
                <TextInput value={selected.nombre} onChangeText={(t) => setSelected({ ...selected, nombre: t })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
                <Text style={{ marginBottom: 6 }}>Hora inicio (HH:mm)</Text>
                <TextInput value={selected.horaInicio} onChangeText={(t) => setSelected({ ...selected, horaInicio: t })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
                <Text style={{ marginBottom: 6 }}>Hora fin (HH:mm)</Text>
                <TextInput value={selected.horaFin} onChangeText={(t) => setSelected({ ...selected, horaFin: t })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 16 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <TouchableOpacity disabled={saving} onPress={onUpdateTurno} style={{ backgroundColor: '#16a34a', padding: 12, borderRadius: 8, flex: 1, marginRight: 6 }}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center' }}>Guardar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity disabled={saving} onPress={() => onDeleteTurno(selected.id)} style={{ backgroundColor: '#b91c1c', padding: 12, borderRadius: 8, flex: 1, marginLeft: 6 }}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center' }}>Eliminar</Text>}
                  </TouchableOpacity>
                </View>

                {/* Asignar turno a guardia */}
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Asignar a guardia por fecha</Text>
                <TouchableOpacity onPress={() => { setAssignVisible(true); setSelectedUser(null); setAssignFecha(''); }} style={{ backgroundColor: '#2563eb', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', textAlign: 'center' }}>Asignar</Text>
                </TouchableOpacity>

                <TouchableOpacity disabled={saving} onPress={() => setDetailVisible(false)} style={{ marginTop: 12, padding: 10 }}>
                  <Text style={{ textAlign: 'center' }}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal asignación */}
      <Modal visible={assignVisible} transparent animationType="fade" onRequestClose={() => setAssignVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => setAssignVisible(false)} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%' }}>
            <TouchableOpacity onPress={() => setAssignVisible(false)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Asignar turno</Text>
            <Text style={{ marginBottom: 6 }}>Guardia</Text>
            <TouchableOpacity onPress={() => setUserPickerVisible(true)} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }}>
              <Text>{selectedUser ? selectedUser.nombre : 'Selecciona un guardia'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio</Text>
            <Text style={{ marginBottom: 6 }}>Fecha (YYYY-MM-DD)</Text>
            <TextInput value={assignFecha} onChangeText={setAssignFecha} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 16 }} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -12, marginBottom: 16 }}>Obligatorio. Formato YYYY-MM-DD</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity disabled={saving} onPress={onAssign} style={{ backgroundColor: '#2563eb', padding: 12, borderRadius: 8, flex: 1, marginRight: 6 }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center' }}>Asignar</Text>}
              </TouchableOpacity>
              <TouchableOpacity disabled={saving} onPress={() => setAssignVisible(false)} style={{ backgroundColor: '#6b7280', padding: 12, borderRadius: 8, flex: 1, marginLeft: 6 }}>
                <Text style={{ color: '#fff', textAlign: 'center' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal picker de usuarios */}
      <Modal visible={userPickerVisible} transparent animationType="fade" onRequestClose={() => setUserPickerVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => setUserPickerVisible(false)} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%', maxHeight: '70%' }}>
            <TouchableOpacity onPress={() => setUserPickerVisible(false)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Selecciona guardia</Text>
            <FlatList
              data={usuarios}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setSelectedUser(item); setUserPickerVisible(false); }} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 16 }}>{item.nombre} {item.rol !== 'admin' ? '' : '(admin)'}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
            />
            <TouchableOpacity onPress={() => setUserPickerVisible(false)} style={{ marginTop: 12, padding: 10 }}>
              <Text style={{ textAlign: 'center' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal picker usuario para crear turno */}
      <Modal visible={userPickerFormVisible} transparent animationType="fade" onRequestClose={() => setUserPickerFormVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => setUserPickerFormVisible(false)} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%', maxHeight: '70%' }}>
            <TouchableOpacity onPress={() => setUserPickerFormVisible(false)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Selecciona usuario</Text>
            <FlatList
              data={usuarios}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setFormUsuario(item); setUserPickerFormVisible(false); }} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 16 }}>{item.nombre} {item.rol !== 'admin' ? '' : '(admin)'}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
            />
            <TouchableOpacity onPress={() => setUserPickerFormVisible(false)} style={{ marginTop: 12, padding: 10 }}>
              <Text style={{ textAlign: 'center' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
