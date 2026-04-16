import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { sendVerificationEmail, sendResetPasswordEmail } from '../lib/email.js';
import { toUserProgress } from '../lib/experience.js';
import { uploadToQiniu, PREFIX_ASSETS, getSignedUrl, deleteFile } from '../lib/qiniu.js';
import { findSensitiveWord } from '../lib/sensitiveFilter.js';

// 简单内存存储验证码 (生产环境建议使用 Redis 或 数据库)
const verificationCodes = new Map();
const resetPasswordCodes = new Map();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
};

const serializeUser = (user) =>
  toUserProgress({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    experience: user.experience ?? 0,
    avatarUrl: getSignedUrl(user.avatarKey),
  });

export const sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ message: '邮箱是必填项' });
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: '邮箱格式不正确' });
    }

    // 检查邮箱是否已注册
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: '邮箱已被注册' });
    }

    // 生成 6 位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 存储验证码，设置 5 分钟过期
    const expiresAt = Date.now() + 5 * 60 * 1000;
    verificationCodes.set(email, { code, expiresAt });

    // 发送邮件
    await sendVerificationEmail(email, code);

    return res.status(200).json({ message: '验证码已发送' });
  } catch (error) {
    console.error('Send verification code error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { username, password, email, code } = req.body ?? {};

    if (!username || !password || !email || !code) {
      return res.status(400).json({ message: '用户名、密码、邮箱和验证码均为必填项' });
    }

    const normalizedUsername = String(username).trim();
    const matchedWord = findSensitiveWord(normalizedUsername);
    if (matchedWord) {
      return res.status(400).json({ message: '用户名包含敏感词，请修改后重试' });
    }

    // 验证码校验
    const stored = verificationCodes.get(email);
    if (!stored || stored.code !== code) {
      return res.status(400).json({ message: '验证码不正确' });
    }
    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: '验证码已过期' });
    }

    // 验证成功，删除验证码
    verificationCodes.delete(email);

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: '邮箱格式不正确' });
    }

    // 密码强度验证：至少8位，包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: '密码必须至少为8位，且包含字母和数字' });
    }

    const existingByUsername = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    if (existingByUsername) {
      return res.status(409).json({ message: '用户名已存在' });
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return res.status(409).json({ message: '邮箱已被注册' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username: normalizedUsername, password: hashedPassword, email },
      select: { id: true, username: true, email: true, role: true, experience: true, avatarKey: true, createdAt: true },
    });

    return res.status(201).json({ message: '注册成功', user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码均为必填项' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, username: user.username },
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    return res.status(200).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const sendResetPasswordCode = async (req, res) => {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ message: '邮箱是必填项' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    resetPasswordCodes.set(email, { code, expiresAt });

    await sendResetPasswordEmail(email, code);

    return res.status(200).json({ message: '重置码已发送' });
  } catch (error) {
    console.error('Send reset code error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body ?? {};

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: '邮箱、重置码和新密码均为必填项' });
    }

    const stored = resetPasswordCodes.get(email);
    if (!stored || stored.code !== code) {
      return res.status(400).json({ message: '验证码不正确' });
    }
    if (Date.now() > stored.expiresAt) {
      resetPasswordCodes.delete(email);
      return res.status(400).json({ message: '验证码已过期' });
    }

    // 密码强度验证
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: '密码必须至少为8位，且包含字母和数字' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    resetPasswordCodes.delete(email);

    return res.status(200).json({ message: '密码重置成功' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const username = String(req.body?.username || '').trim();
    if (!username) return res.status(400).json({ message: '用户名不能为空' });

    const matchedWord = findSensitiveWord(username);
    if (matchedWord) {
      return res.status(400).json({ message: '用户名包含敏感词，请修改后重试' });
    }

    const exists = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
      select: { id: true },
    });
    if (exists) return res.status(409).json({ message: '用户名已存在' });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username },
      select: { id: true, username: true, email: true, role: true, experience: true, avatarKey: true },
    });

    const token = jwt.sign(
      { sub: user.id, role: user.role, username: user.username },
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    return res.json({ message: '资料更新成功', token, user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '当前密码和新密码均为必填项' });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: '密码必须至少为8位，且包含字母和数字' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: '用户不存在' });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: '当前密码错误' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.json({ message: '密码修改成功' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        NOT: { username: '游客' },
      },
      orderBy: [{ experience: 'desc' }, { createdAt: 'asc' }],
      take: 20,
      select: {
        id: true,
        username: true,
        role: true,
        experience: true,
        avatarKey: true,
      },
    });

    const items = users.map((user, index) => ({
      rank: index + 1,
      ...toUserProgress(user),
      avatarUrl: getSignedUrl(user.avatarKey),
    }));

    return res.status(200).json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true, experience: true, avatarKey: true },
    });
    if (!user) return res.status(404).json({ message: '用户不存在' });
    return res.status(200).json({ user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '未上传头像文件' });
    }

    const userId = req.user.id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, avatarKey: true, username: true, email: true, role: true, experience: true },
    });
    if (!currentUser) return res.status(404).json({ message: '用户不存在' });

    const { name: nextAvatarKey } = await uploadToQiniu(
      req.file.buffer,
      req.file.originalname,
      PREFIX_ASSETS,
      'avatars',
      req.file.mimetype
    );

    if (currentUser.avatarKey) {
      try {
        await deleteFile(currentUser.avatarKey);
      } catch (error) {
        console.error('Delete old avatar failed:', error);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarKey: nextAvatarKey },
      select: { id: true, username: true, email: true, role: true, experience: true, avatarKey: true },
    });

    return res.status(200).json({
      message: '头像更新成功',
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({ error: error.message });
  }
};
