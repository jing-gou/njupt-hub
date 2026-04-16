import { Router } from 'express';
import { listGithubCommits } from '../controllers/meta.js';

const router = Router();

router.get('/commits', listGithubCommits);

export default router;
