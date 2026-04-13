import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const OWNER = "jing-gou";
  const REPO = "njupt-notes";

  try {
    // 1. 获取主分支最新的 commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: 'heads/master',
    });

    // 2. 递归获取整个仓库的 Tree（全量文件索引）
    const { data: treeData } = await octokit.git.getTree({
      owner: OWNER,
      repo: REPO,
      tree_sha: refData.object.sha,
      recursive: true, // 核心参数：开启递归
    });

    const resources = {};
    const UPLOAD_PATH = "public/uploads/";

    treeData.tree.forEach(item => {
    if (item.path.startsWith(UPLOAD_PATH) && item.type === 'blob') {
        // 1. 获取相对路径，例如: "计算机学院/数据结构/实验/报告.pdf"
        const relativePath = item.path.replace(UPLOAD_PATH, "");
        const pathParts = relativePath.split("/");

        // 2. 确定分类（第一级文件夹）
        const course = pathParts[0]; 

        // 3. 确定显示名称
        // 如果 pathParts 长度大于 1，说明在子文件夹里
        // 我们把除了第一级之外的所有部分重新组合，保持层级感
        const displayName = pathParts.length > 1 
        ? pathParts.slice(1).join(" / ") 
        : pathParts[0];

        if (!resources[course]) resources[course] = [];

        resources[course].push({
        name: displayName, // 这里现在会显示 "数据结构 / 实验 / 报告.pdf"
        path: `https://raw.githubusercontent.com/${OWNER}/${REPO}/master/${item.path}`,
        size: item.size ? (item.size / 1024).toFixed(1) + " KB" : "未知",
        sha: item.sha
        });
    }
    });

    // 设置 Vercel 缓存，5分钟内不再请求 GitHub，加快访问速度
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json(resources);

  } catch (error) {
    console.error("GitHub API Error:", error);
    return res.status(500).json({ error: "无法同步远程资料库" });
  }
}