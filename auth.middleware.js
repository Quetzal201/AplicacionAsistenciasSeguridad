const { auth, db } = require('../firebase');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const idToken = header.split(' ')[1];

  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.token = decoded;
    // attach user doc if exists
    const userSnap = await db.collection('usuarios').doc(decoded.uid).get();
    req.userDoc = userSnap.exists ? userSnap.data() : null;
    next();
  } catch (err) {
    console.error('verifyToken error', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  const role = req.userDoc?.rol;
  if (role === 'admin') return next();
  return res.status(403).json({ error: 'Admin role required' });
}

module.exports = { verifyToken, requireAdmin };
