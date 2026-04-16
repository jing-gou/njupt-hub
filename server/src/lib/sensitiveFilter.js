import SensitiveWordTool from 'sensitive-word-tool';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const normalizeText = (value) => String(value || '').toLowerCase();
const BUILTIN_FALLBACK_WORDS = [
  '傻逼',
  '煞笔',
  '傻x',
  'sb',
  'nmsl',
  '操你妈',
  '草泥马',
  '他妈的',
  '妈的',
  '狗日的',
  '垃圾',
];

const getExtraSensitiveWords = () => {
  const envWords = String(process.env.SENSITIVE_WORDS || '')
    .split(',')
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(envWords));
};

const getLocalLexiconWords = () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const lexiconDir = path.resolve(__dirname, '../../config/sensitive-lexicon');
    if (!fs.existsSync(lexiconDir)) return [];

    const files = fs.readdirSync(lexiconDir).filter((name) => name.endsWith('.txt'));
    const words = [];

    for (const fileName of files) {
      const filePath = path.join(lexiconDir, fileName);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line && !line.startsWith('#'));
      words.push(...lines);
    }

    return Array.from(new Set(words));
  } catch {
    return [];
  }
};

const createDetector = () => {
  const detector = new SensitiveWordTool({
    useDefaultWords: true, // 使用社区维护的内置词库
  });
  const mergedWords = Array.from(new Set([
    ...getLocalLexiconWords(), // 大体量本地词库（Sensitive-lexicon）
    ...BUILTIN_FALLBACK_WORDS,
    ...getExtraSensitiveWords(),
  ]));
  if (mergedWords.length > 0) {
    detector.addWords(mergedWords);
  }
  return detector;
};

const detector = createDetector();

export const findSensitiveWord = (value) => {
  const text = normalizeText(value);
  if (!text) return null;

  const matched = detector.match(text);
  return Array.isArray(matched) && matched.length > 0 ? matched[0] : null;
};

export const containsSensitiveWord = (value) => Boolean(findSensitiveWord(value));
