const { auth, db } = require('../firebase');

async function listUsuarios(req, res) {
  try {
    const snap = await db.collection('usuarios').get();
    const usuarios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
}

async function createUsuario(req, res) {
  const { uid, nombre, rol = 'guardia', activo = true, email, password } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    let finalUid = uid;
    if (!finalUid && email && password) {
      // crear en Firebase Auth
      const userRecord = await auth.createUser({ email, password, displayName: nombre });
      finalUid = userRecord.uid;
    }
    if (!finalUid) return res.status(400).json({ error: 'uid o (email+password) son requeridos para crear usuario' });

    await db.collection('usuarios').doc(finalUid).set({ uid: finalUid, nombre, rol, activo });
    const doc = await db.collection('usuarios').doc(finalUid).get();
    res.status(201).json({ id: finalUid, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando usuario', details: err.message });
  }
}

async function getUsuario(req, res) {
  const id = req.params.id;
  try {
    const doc = await db.collection('usuarios').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Usuario no encontrado' });
    // permitir acceso si es admin o el mismo usuario
    const requesterUid = req.uid;
    const requesterRole = req.userDoc?.rol;
    if (requesterRole !== 'admin' && requesterUid !== id) return res.status(403).json({ error: 'Acceso denegado' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
}

async function updateUsuario(req, res) {
  const id = req.params.id;
  const updates = req.body;
  try {
    // solo admin o el mismo usuario puede actualizar (pero rol solo admin)
    const requesterUid = req.uid;
    const requesterRole = req.userDoc?.rol;
    if (requesterRole !== 'admin' && requesterUid !== id) return res.status(403).json({ error: 'Acceso denegado' });
    if (updates.rol && requesterRole !== 'admin') return res.status(403).json({ error: 'Solo admin puede cambiar rol' });

    await db.collection('usuarios').doc(id).update(updates);
    const doc = await db.collection('usuarios').doc(id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
}

async function deleteUsuario(req, res) {
  const id = req.params.id;
  try {
    await db.collection('usuarios').doc(id).delete();
    // opcional: borrar usuario de Firebase Auth
    try { await auth.deleteUser(id); } catch (e) { /* ignore */ }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
}

module.exports = { listUsuarios, createUsuario, getUsuario, updateUsuario, deleteUsuario };
