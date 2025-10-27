const { db } = require('../firebase');

async function listAsistencias(req, res) {
  try {
    const { usuarioId, turnoId, fecha } = req.query;
    let ref = db.collection('asistencias');
    if (usuarioId) ref = ref.where('usuarioId', '==', usuarioId);
    if (turnoId) ref = ref.where('turnoId', '==', turnoId);
    if (fecha) ref = ref.where('fecha', '==', fecha);
    const snap = await ref.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando asistencias' });
  }
}

async function createAsistencia(req, res) {
  const { usuarioId, turnoId, fecha, asistio = false } = req.body;
  if (!usuarioId || !turnoId || !fecha) {
    return res.status(400).json({ error: 'usuarioId, turnoId y fecha son requeridos' });
  }

  // Validar formato de fecha (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fecha)) {
    return res.status(400).json({ error: 'formato de fecha inválido, use YYYY-MM-DD' });
  }

  try {
    // Verificar que el usuario existe
    const userDoc = await db.collection('usuarios').doc(usuarioId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el turno existe
    const turnoDoc = await db.collection('turnos').doc(turnoId).get();
    if (!turnoDoc.exists) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    // Evitar duplicados usuario+turno+fecha
    const existing = await db.collection('asistencias')
      .where('usuarioId', '==', usuarioId)
      .where('turnoId', '==', turnoId)
      .where('fecha', '==', fecha)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Ya existe un registro de asistencia para este usuario, turno y fecha' });
    }

    const asistenciaData = {
      usuarioId,
      turnoId,
      fecha,
      asistio,
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('asistencias').add(asistenciaData);
    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando asistencia' });
  }
}

async function updateAsistencia(req, res) {
  const id = req.params.id;
  const updates = req.body;
  try {
    await db.collection('asistencias').doc(id).update(updates);
    const doc = await db.collection('asistencias').doc(id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando asistencia' });
  }
}

async function deleteAsistencia(req, res) {
  const id = req.params.id;
  try {
    await db.collection('asistencias').doc(id).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando asistencia' });
  }
}

module.exports = { listAsistencias, createAsistencia, updateAsistencia, deleteAsistencia };
