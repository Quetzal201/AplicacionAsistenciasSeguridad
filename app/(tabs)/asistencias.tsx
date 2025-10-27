import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, FlatList, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../lib/firebase';

const API_BASE = 'https://apiantonioasistencias.onrender.com';

type Usuario = {
  id: string;
  nombre: string;
  rol: 'admin' | 'guardia' | string;
  activo: boolean;
};
type Turno = { id: string; nombre: string; horaInicio: string; horaFin: string; usuarioId: string; fecha: string };

export default function AsistenciasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  type Asistencia = { id: string; usuarioId: string; turnoId: string; fecha: string; asistio: boolean };
  const [items, setItems] = useState<Asistencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // filtros
  const [fUsuarioId, setFUsuarioId] = useState('');
  const [fFecha, setFFecha] = useState(''); // YYYY-MM-DD
  const [userPickerFilterVisible, setUserPickerFilterVisible] = useState(false);
  const selectedUserFilter = usuarios.find(u => u.id === fUsuarioId) || null;

  // modal detalle
  const [selected, setSelected] = useState<Asistencia | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // modal crear
  const [formVisible, setFormVisible] = useState(false);
  const [formUsuarioId, setFormUsuarioId] = useState('');
  const [formTurnoId, setFormTurnoId] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formAsistio, setFormAsistio] = useState<'true' | 'false'>('false');
  const [userPickerFormVisible, setUserPickerFormVisible] = useState(false);
  const selectedUserForm = usuarios.find(u => u.id === formUsuarioId) || null;
  const [turnoPickerVisible, setTurnoPickerVisible] = useState(false);
  type Turno = { id: string; nombre: string; horaInicio: string; horaFin: string; usuarioId?: string; fecha?: string };
  const [turnosDisponibles, setTurnosDisponibles] = useState<Turno[]>([]);

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
          await Promise.all([loadUsuarios(t), loadAsistencias(t)]);
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

  const loadAsistencias = async (tkn?: string) => {
    const q: string[] = [];
    if (fUsuarioId) q.push(`usuarioId=${encodeURIComponent(fUsuarioId)}`);
    if (fFecha) q.push(`fecha=${encodeURIComponent(fFecha)}`);
    const query = q.length ? `?${q.join('&')}` : '';
    const res = await fetch(`${API_BASE}/asistencias${query}`, { headers: { Authorization: `Bearer ${tkn || token}` } as any });
    if (!res.ok) throw new Error('Error listando asistencias');
    const data: Asistencia[] = await res.json();
    setItems(data);
  };

  const loadUsuarios = async (tkn?: string) => {
    const res = await fetch(`${API_BASE}/usuarios`, { headers: { Authorization: `Bearer ${tkn || token}` } as any });
    if (!res.ok) throw new Error('Error listando usuarios');
    const data: Usuario[] = await res.json();
    setUsuarios(data);
  };

  const loadTurnosDisponibles = async (tkn?: string) => {
    const qs: string[] = [];
    if (formUsuarioId) qs.push(`usuarioId=${encodeURIComponent(formUsuarioId)}`);
    if (formFecha) qs.push(`fecha=${encodeURIComponent(formFecha)}`);
    const query = qs.length ? `?${qs.join('&')}` : '';
    const res = await fetch(`${API_BASE}/turnos${query}`, { headers: { Authorization: `Bearer ${tkn || token}` } as any });
    if (!res.ok) throw new Error('Error listando turnos');
    const data: { id: string; nombre: string; horaInicio: string; horaFin: string; usuarioId?: string; fecha?: string }[] = await res.json();
    setTurnosDisponibles(data);
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
        <Text style={{ fontSize: 16, textAlign: 'center' }}>Esta vista es solo para administradores.</Text>
        <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: '#2563eb', borderRadius: 8 }} onPress={() => router.replace('/(tabs)/mis-turnos' as any)}>
          <Text style={{ color: '#fff' }}>Ir a Mis turnos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const onOpenDetail = (a: Asistencia) => {
    setSelected(a);
    setDetailVisible(true);
  };

  const onFilter = async () => {
    try {
      setLoading(true);
      await loadAsistencias();
    } catch (e) {
      Alert.alert('Error', 'No se pudo filtrar');
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async () => {
    if (!token) return;
    if (!formUsuarioId || !formTurnoId || !formFecha) {
      Alert.alert('Validación', 'usuarioId, turnoId y fecha son requeridos');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/asistencias`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ usuarioId: formUsuarioId, turnoId: formTurnoId, fecha: formFecha, asistio: formAsistio === 'true' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || 'Error creando asistencia');
      }
      const nuevo: Asistencia = await res.json();
      setItems(prev => [nuevo, ...prev]);
      setFormVisible(false);
      setFormUsuarioId(''); setFormTurnoId(''); setFormFecha(''); setFormAsistio('false');
      // refrescar lista para mantener consistencia con el backend
      await loadAsistencias();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async () => {
    if (!token || !selected) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/asistencias/${selected.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ usuarioId: selected.usuarioId, turnoId: selected.turnoId, fecha: selected.fecha, asistio: selected.asistio }),
      });
      if (!res.ok) throw new Error('Error actualizando');
      const updated: Asistencia = await res.json();
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      setDetailVisible(false);
      setSelected(null);
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/asistencias/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error eliminando');
      setItems(prev => prev.filter(i => i.id !== id));
      setDetailVisible(false);
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Filtros */}
      <View style={{ padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Asistencias</Text>
        <Text style={{ marginBottom: 6 }}>Usuario</Text>
        <TouchableOpacity onPress={() => setUserPickerFilterVisible(true)} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }}>
          <Text>{selectedUserFilter ? selectedUserFilter.nombre : 'Selecciona un usuario (opcional)'}</Text>
        </TouchableOpacity>
        <Text style={{ marginBottom: 6 }}>Fecha (YYYY-MM-DD)</Text>
        <TextInput value={fFecha} onChangeText={setFFecha} placeholder="2025-01-31" style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
        <TouchableOpacity onPress={onFilter} style={{ backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignSelf: 'flex-start' }}>
          <Text style={{ color: '#fff' }}>Filtrar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text>No hay asistencias</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onOpenDetail(item)} activeOpacity={0.8} style={{ marginBottom: 12 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Usuario: {item.usuarioId}</Text>
              <Text style={{ marginTop: 4 }}>Turno: {item.turnoId}</Text>
              <Text style={{ marginTop: 4 }}>Fecha: {item.fecha}</Text>
              <Text style={{ color: item.asistio ? '#16a34a' : '#b91c1c', marginTop: 4 }}>{item.asistio ? 'Asistió' : 'No asistió'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB crear */}
      <TouchableOpacity onPress={() => setFormVisible(true)} activeOpacity={0.9} style={{ position: 'absolute', right: 20, bottom: 30, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 3 }}>
        <Text style={{ color: '#fff', fontSize: 28, marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      {/* Modal detalle */}
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => setDetailVisible(false)} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%' }}>
            <TouchableOpacity onPress={() => setDetailVisible(false)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            {selected && (
              <>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Asistencia</Text>
                <Text style={{ marginBottom: 6 }}>ID: {selected.id}</Text>
                <Text style={{ marginBottom: 6 }}>Usuario ID</Text>
                <TextInput value={selected.usuarioId} onChangeText={(t) => setSelected({ ...selected, usuarioId: t })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio</Text>
                <Text style={{ marginBottom: 6 }}>Turno ID</Text>
                <TextInput value={selected.turnoId} onChangeText={(t) => setSelected({ ...selected, turnoId: t })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio</Text>
                <Text style={{ marginBottom: 6 }}>Fecha (YYYY-MM-DD)</Text>
                <TextInput value={selected.fecha} onChangeText={(t) => setSelected({ ...selected, fecha: t })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Formato YYYY-MM-DD</Text>
                <Text style={{ marginBottom: 6 }}>Asistió (true/false)</Text>
                <TextInput value={String(selected.asistio)} onChangeText={(t) => setSelected({ ...selected, asistio: t.toLowerCase() === 'true' })} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 16 }} />

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

      {/* Modal picker de turnos disponibles */}
      <Modal visible={turnoPickerVisible} transparent animationType="fade" onRequestClose={() => { setTurnoPickerVisible(false); setFormVisible(true); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => { setTurnoPickerVisible(false); setFormVisible(true); }} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%', maxHeight: '70%' }}>
            <TouchableOpacity onPress={() => { setTurnoPickerVisible(false); setFormVisible(true); }} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Selecciona turno</Text>
            {/* Accesos rápidos */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => {
                const found = turnosDisponibles.find(t => /matutino/i.test(t.nombre));
                if (found) { setFormTurnoId(found.id); setTurnoPickerVisible(false); setFormVisible(true); }
                else { Alert.alert('No disponible', 'No hay turno Matutino disponible en la selección.'); }
              }} style={{ backgroundColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 }}>
                <Text>Matutino</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const found = turnosDisponibles.find(t => /vespertino/i.test(t.nombre));
                if (found) { setFormTurnoId(found.id); setTurnoPickerVisible(false); setFormVisible(true); }
                else { Alert.alert('No disponible', 'No hay turno Vespertino disponible en la selección.'); }
              }} style={{ backgroundColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text>Vespertino</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={turnosDisponibles}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setFormTurnoId(item.id); setTurnoPickerVisible(false); setFormVisible(true); }} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 16 }}>{item.nombre} · {item.horaInicio}-{item.horaFin} {item.fecha ? `· ${item.fecha}` : ''}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
            />
            <TouchableOpacity onPress={() => { setTurnoPickerVisible(false); setFormVisible(true); }} style={{ marginTop: 12, padding: 10 }}>
              <Text style={{ textAlign: 'center' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal picker de usuario (filtro) */}
      <Modal visible={userPickerFilterVisible} transparent animationType="fade" onRequestClose={() => setUserPickerFilterVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => setUserPickerFilterVisible(false)} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%', maxHeight: '70%' }}>
            <TouchableOpacity onPress={() => setUserPickerFilterVisible(false)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Selecciona usuario</Text>
            <FlatList
              data={usuarios}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setFUsuarioId(item.id); setUserPickerFilterVisible(false); }} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 16 }}>{item.nombre} {item.rol !== 'admin' ? '' : '(admin)'}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
            />
            <TouchableOpacity onPress={() => setUserPickerFilterVisible(false)} style={{ marginTop: 12, padding: 10 }}>
              <Text style={{ textAlign: 'center' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal picker de usuario (form) */}
      <Modal visible={userPickerFormVisible} transparent animationType="fade" onRequestClose={() => { setUserPickerFormVisible(false); setFormVisible(true); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => { setUserPickerFormVisible(false); setFormVisible(true); }} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%', maxHeight: '70%' }}>
            <TouchableOpacity onPress={() => { setUserPickerFormVisible(false); setFormVisible(true); }} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Selecciona usuario</Text>
            <FlatList
              data={usuarios}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setFormUsuarioId(item.id); setUserPickerFormVisible(false); setFormVisible(true); }} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 16 }}>{item.nombre} {item.rol !== 'admin' ? '' : '(admin)'}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
            />
            <TouchableOpacity onPress={() => { setUserPickerFormVisible(false); setFormVisible(true); }} style={{ marginTop: 12, padding: 10 }}>
              <Text style={{ textAlign: 'center' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal crear */}
      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} activeOpacity={1} onPress={() => setFormVisible(false)} />
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '88%' }}>
            <TouchableOpacity onPress={() => setFormVisible(false)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
              <Text style={{ fontSize: 18 }}>×</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Agregar asistencia</Text>

            <Text style={{ marginBottom: 6 }}>Usuario</Text>
            <TouchableOpacity onPress={() => { setFormVisible(false); setUserPickerFormVisible(true); }} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }}>
              <Text>{selectedUserForm ? selectedUserForm.nombre : 'Selecciona un usuario'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio</Text>

            <Text style={{ marginBottom: 6 }}>Turno</Text>
            <TouchableOpacity
              onPress={async () => {
                if (!formUsuarioId || !formFecha) { Alert.alert('Falta información', 'Selecciona primero un usuario y una fecha.'); return; }
                try { await loadTurnosDisponibles(); setFormVisible(false); setTurnoPickerVisible(true); } catch { Alert.alert('Error', 'No se pudieron cargar los turnos'); }
              }}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }}
            >
              <Text>{formTurnoId ? `Seleccionado: ${formTurnoId}` : 'Selecciona un turno'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio</Text>

            <Text style={{ marginBottom: 6 }}>Fecha (YYYY-MM-DD)</Text>
            <TextInput value={formFecha} onChangeText={setFormFecha} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 8 }} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>Obligatorio. Formato YYYY-MM-DD</Text>

            <Text style={{ marginBottom: 6 }}>Asistió (true/false)</Text>
            <TextInput value={formAsistio} onChangeText={(t) => setFormAsistio((t === 'true' ? 'true' : 'false'))} style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 16 }} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -12, marginBottom: 16 }}>Obligatorio</Text>

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
