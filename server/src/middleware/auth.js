import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
};

export const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization ?? '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: '未提供令牌' });
    }

    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      id: Number(payload.sub),
      role: payload.role,
      username: payload.username,
    };
    return next();
  } catch {
    return res.status(401).json({ message: '无效的令牌' });
  }
};

export const requireRole = (...allowedRoles) => {
  const allowed = new Set(allowedRoles);
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.has(role)) {
      return res.status(403).json({ message: '拒绝访问' });
    }
    return next();
  };
};

export const optionalAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization ?? '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      return next();
    }

    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      id: Number(payload.sub),
      role: payload.role,
      username: payload.username,
    };
    return next();
  } catch {
    return next();
  }
};

