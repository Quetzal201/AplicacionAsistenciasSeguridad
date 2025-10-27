const { db } = require('../firebase');

async function listTurnos(req, res) {
  try {
    const { usuarioId, fecha } = req.query;
    let query = db.collection('turnos');
    
    if (usuarioId) {
      query = query.where('usuarioId', '==', usuarioId);
    }
    if (fecha) {
      query = query.where('fecha', '==', fecha);
    }
    
    const snap = await query.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando turnos' });
  }
}

async function createTurno(req, res) {
  const { nombre, horaInicio, horaFin, usuarioId, fecha } = req.body;
  if (!nombre || !horaInicio || !horaFin || !usuarioId || !fecha) {
    return res.status(400).json({ error: 'nombre, horaInicio, horaFin, usuarioId y fecha son requeridos' });
  }

  // Validar formato de hora (HH:mm)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(horaInicio) || !timeRegex.test(horaFin)) {
    return res.status(400).json({ error: 'formato de hora inválido, use HH:mm' });
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

    const turnoData = {
      nombre,
      horaInicio,
      horaFin,
      usuarioId,
      fecha,
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('turnos').add(turnoData);
    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando turno' });
  }
}

async function updateTurno(req, res) {
  const id = req.params.id;
  const updates = req.body;
  try {
    await db.collection('turnos').doc(id).update(updates);
    const doc = await db.collection('turnos').doc(id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando turno' });
  }
}

async function deleteTurno(req, res) {
  const id = req.params.id;
  try {
    await db.collection('turnos').doc(id).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando turno' });
  }
}

module.exports = { listTurnos, createTurno, updateTurno, deleteTurno };
