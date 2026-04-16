const DEFAULT_REPO = 'jing-gou/njupt-hub';
const DEFAULT_BRANCH = 'main';
const DEFAULT_LIMIT = 20;

const getGithubConfig = () => {
  const repo = String(process.env.GITHUB_REPO || DEFAULT_REPO).trim();
  const branch = String(process.env.GITHUB_BRANCH || DEFAULT_BRANCH).trim();
  const token = String(process.env.GITHUB_TOKEN || '').trim();
  return { repo, branch, token };
};

const normalizeCommit = (item) => {
  const commit = item?.commit || {};
  const author = commit?.author || {};
  return {
    sha: String(item?.sha || ''),
    message: String(commit?.message || '').trim(),
    date: author?.date || null,
    author: author?.name || 'Unknown',
    url: item?.html_url || '',
  };
};

export async function listGithubCommits(req, res) {
  const { repo, branch, token } = getGithubConfig();
  const perPage = Math.max(1, Math.min(50, Number(req.query?.limit) || DEFAULT_LIMIT));
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(repo).replace('%2F', '/')}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`;

  try {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'njupt-hub-server',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const resp = await fetch(apiUrl, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({
        error: '获取 GitHub 提交记录失败',
        detail: text?.slice(0, 300) || `HTTP ${resp.status}`,
      });
    }

    const json = await resp.json();
    const items = Array.isArray(json) ? json.map(normalizeCommit).filter((x) => x.sha) : [];

    return res.json({
      repo,
      branch,
      items,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: 'GitHub 服务暂时不可用',
      detail: err?.message || 'unknown error',
    });
  }
}
