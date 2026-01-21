
---

# 🎓 NJUPT Notes Repository | 南邮资料仓库

> **一站式资料整合网站** 

这是一个基于 **Next.js + Tailwind CSS** 构建的高性能资料共享平台，旨在打破校园信息孤岛，通过 Git 协作模式实现资料的薪火相传。
所有资料存于 public/uploads

---

## ✨ 核心特性

* **🌙 极客级暗黑模式**：全量适配 Tailwind Dark Mode，深夜复习不刺眼。
* **📂 无限层级文件系统**：支持递归解析课程、分类及子文件夹，结构清晰如 IDE。
* **🔍 智能搜索建议**：输入课程名自动联想，基于 `localStorage` 缓存优化搜索性能。
* **PR 自动化**：用户上传动作自动转化为 GitHub Pull Request，确保数据审核可控。
* **⚡️ 响应式设计**：完美适配手机、平板及 PC，随时随地查阅真题。

---

## 🚀 技术栈

* **前端**: React, Tailwind CSS, Lucide Icons
* **后端**: Vercel Serverless Functions
* **存储**: GitHub Repository (通过 Octokit 实现 Git-flow 自动化)
* **部署**: Vercel

---
## 🤝 资料贡献指南 
为了丰富南邮资料库，我们欢迎每一位 NJUPTer 参与贡献。根据文件大小和便捷性，你可以选择以下三种方式：

1. **⚡️ 网页快速上传 (推荐)**
适合： 单个小于 10MB 的 PDF、图片、笔记或压缩包。
操作： 直接在 网站上传页面 填写课程名、选择分类并上传。
效果： 系统会自动为您创建 GitHub Pull Request，管理员审核后即可同步。


1. **📝 Issue 附件提交**
适合： 10MB - 50MB 的中等文件，或不方便使用网页端时。
操作： 点击此处前往 Issues，选择“资料贡献模板”。
步骤： 在描述中注明课程名称，并将文件直接拖拽到 Issue 文本框中上传。
优点： 稳定、有记录，方便交流。

1. **📧 邮箱投稿 (大文件/整合包)**
适合： 超过 50MB 的视频教程、超大压缩包、或整个学期的资料整合。
邮箱： sugar.pub@outlook.com
格式： 邮件主题请注明 【资料贡献】课程名-文件名。
说明： 收到邮件后，管理员会手动将其转存至仓库。

---
## 🛠️ 网页贡献
如果你有想法与技术，欢迎一起共建！
1. **克隆项目**:
```bash
git clone https://github.com/jing-gou/njupt-notes.git
cd njupt-notes
```


2. **安装依赖**:
```bash
npm install
```


3. **环境变量配置**:
在根目录创建 `.env.local` 文件，填入你的 GitHub Token：
```env
GITHUB_TOKEN=your_personal_access_token_here
```


4. **启动开发服务器**:
```bash
npm run dev
```



---



## ⚖️ 免责声明

本仓库提供的所有资料均收集于互联网或由用户匿名贡献，仅供个人学习和科研使用。如有侵权，请联系我删除。

---

