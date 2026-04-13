import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// 1. 导入路由模块（注意 ESM 必须带 .js 后缀）
import authRoutes from './routes/auth.js';
import resourcesRoutes from './routes/resources.js';
import reviewsRoutes from './routes/reviews.js';

const app = express();

// 2. 中间件配置
app.use(express.json()); // 解析 POST 请求的 JSON Body

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// 3. 路由挂载
// 这样你的注册接口就是：POST http://localhost:3000/api/auth/register
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/reviews', reviewsRoutes);

// 4. 基础健康检查（方便你测试后端是否活着）
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服务器运行正常' });
});

// 5. 启动服务器
const PORT = Number(process.env.PORT ?? 3000);
const server = app.listen(PORT, () => {
  console.log(`-----------------------------------------------`);
  console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
  console.log(`-----------------------------------------------`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
