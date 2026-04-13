import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'public/uploads');
const outputFile = path.join(process.cwd(), 'src/data/resources.json');

// 确保数据目录存在
const dataDir = path.dirname(outputFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const getFiles = () => {
  const result = {};

  if (!fs.existsSync(uploadsDir)) return result;

  // 读取一级目录（课程名）
  const courses = fs.readdirSync(uploadsDir);
  
  courses.forEach(course => {
    const coursePath = path.join(uploadsDir, course);
    if (fs.statSync(coursePath).isDirectory()) {
      // 读取二级目录（具体文件）
      const files = fs.readdirSync(coursePath);
      result[course] = files.map(file => {
        const stats = fs.statSync(path.join(coursePath, file));
        return {
          name: file,
          size: (stats.size / 1024 / 1024).toFixed(2) + 'MB', // 自动计算大小
          date: stats.mtime.toISOString().split('T')[0],   // 自动获取修改日期
          path: `/uploads/${course}/${file}`               // 供前端下载的路径
        };
      });
    }
  });

  return result;
};

const data = getFiles();
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
console.log('✅ resources.json 索引已更新！');