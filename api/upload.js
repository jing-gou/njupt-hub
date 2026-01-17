import { Octokit } from "@octokit/rest";

// Vercel 配置：提高上传文件大小上限（支持最大 10MB 的 PDF/ZIP）
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  console.log(">>> [后端] 收到上传请求:", req.body.fileName);

  try {
    // 2. 检查环境变量 (确保已执行 vercel env pull)
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("环境变量 GITHUB_TOKEN 缺失，请检查 .env.local");
    }

    const octokit = new Octokit({ auth: token });
    const { fileName, content, course, category } = req.body;

    // 仓库配置
    const OWNER = "jing-gou"; // 你的 GitHub 用户名
    const REPO = "njupt-notes"; // 你的仓库名
    
    // 3. 自动探测主分支名称 (兼容 main 或 master)
    let baseBranch = "main";
    try {
      await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: "heads/main" });
    } catch (e) {
      baseBranch = "master"; // 如果 main 报错，则切换到 master
    }
    console.log(`>>> [后端] 使用主分支: ${baseBranch}`);

    // 4. 获取主分支最新的 SHA
    const { data: mainRef } = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${baseBranch}`
    });

    // 5. 创建新分支 (使用时间戳避免冲突)
    const newBranchName = `contrib-${Date.now()}`;
    await octokit.git.createRef({
      owner: OWNER,
      repo: REPO,
      ref: `refs/heads/${newBranchName}`,
      sha: mainRef.object.sha
    });

    // 6. 上传文件到指定路径
    // 路径规则：public/uploads/课程名/文件名
    const filePath = `public/uploads/${course}/${fileName}`;
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: `feat: 贡献新资料 - ${course}[skip ci]`,
      content: content, // 前端传来的 base64
      branch: newBranchName
    });

    // 7. 创建 Pull Request (草稿模式)
    const { data: pr } = await octokit.pulls.create({
      owner: OWNER,
      repo: REPO,
      title: `[资料贡献] ${course} - ${category}`,
      head: newBranchName,
      base: baseBranch,
      body: `由网页端用户提交：\n- 课程：${course}\n- 分类：${category}\n- 文件：${fileName}`,
      draft: true // 创建为草稿，方便你审核
    });

    console.log(">>> [后端] PR 创建成功:", pr.html_url);
    
    // 成功返回
    return res.status(200).json({ 
      success: true, 
      prUrl: pr.html_url 
    });

  } catch (error) {
    console.error("！！！[后端执行失败]:", error.message);
    // 返回具体的错误给前端
    return res.status(500).json({ 
      error: error.message || "服务器内部错误" 
    });
  }
}