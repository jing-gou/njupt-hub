import prisma from '../lib/prisma.js';
import { uploadToQiniu, PREFIX_ASSETS, getSignedUrl, normalizeStoredFileKey, deleteFile } from '../lib/qiniu.js';
import { EXPERIENCE_REWARD } from '../lib/experience.js';
import { findSensitiveWord } from '../lib/sensitiveFilter.js';

const REVIEW_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const LIKE_GAIN_EXP = 2;

const getPublicReviewWhere = (userId) => {
  if (!userId) return { status: REVIEW_STATUS.APPROVED };
  return {
    OR: [
      { status: REVIEW_STATUS.APPROVED },
      { reviewerId: userId },
    ],
  };
};

const calculateWeightedAverage = (reviews) => {
  let weightedSum = 0;
  let totalWeight = 0;
  reviews.forEach((r) => {
    const weight = r.reviewer?.username === '游客' ? 0.2 : 0.8;
    weightedSum += r.rating * weight;
    totalWeight += weight;
  });
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

const recalculateItemAvgRating = async (tx, itemId) => {
  const approvedReviews = await tx.review.findMany({
    where: { itemId, status: REVIEW_STATUS.APPROVED },
    include: {
      reviewer: { select: { username: true } },
    },
  });

  const avgRating = calculateWeightedAverage(approvedReviews);
  await tx.reviewableItem.update({
    where: { id: itemId },
    data: { avgRating },
  });
};

// 上传评价图片
export const uploadReviewImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '未上传文件' });
    }

    const { url, name } = await uploadToQiniu(req.file.buffer, req.file.originalname, PREFIX_ASSETS, 'reviews', req.file.mimetype);
    
    // 如果是私有空间，返回签名后的 URL
    const signedUrl = getSignedUrl(name);
    res.json({ url: signedUrl });
  } catch (error) {
    console.error('Upload review image error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 获取所有评价项列表 (带平均分 and 评价数)
export const getReviewItems = async (req, res) => {
  try {
    const { type } = req.query;
    const items = await prisma.reviewableItem.findMany({
      where: type ? { type } : {},
      include: {
        reviews: {
          where: { status: REVIEW_STATUS.APPROVED },
          orderBy: { createdAt: 'desc' },
          take: 1, // 只取一条最新的作为精选评价
          include: {
            reviewer: {
              select: { username: true, avatarKey: true }
            }
          }
        },
        _count: {
          select: { reviews: { where: { status: REVIEW_STATUS.APPROVED } } }
        }
      }
    });

    const itemsWithStats = items.map(item => {
      // 如果数据库中有预存的 avgRating，我们可以直接用，或者实时计算
      // 这里我们依然选择实时计算以确保准确性，除非数据量巨大
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: getSignedUrl(item.imageUrl),
        type: item.type,
        location: item.location,
        college: item.college,
        avgRating: item.avgRating, // 使用数据库中的字段
        reviewCount: item._count.reviews,
        reviews: item.reviews.map(r => ({
          ...r,
          reviewer: r.reviewer
            ? {
                ...r.reviewer,
                avatarUrl: getSignedUrl(r.reviewer.avatarKey),
              }
            : null,
          imageUrl: getSignedUrl(r.imageUrl)
        }))
      };
    });

    res.json(itemsWithStats);
  } catch (error) {
    console.error('Get review items error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 获取评价项详情
export const getReviewItemDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const item = await prisma.reviewableItem.findUnique({
      where: { id: parseInt(id) },
      include: {
        reviews: {
          where: getPublicReviewWhere(userId),
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: { username: true, avatarKey: true }
            },
            likes: {
              select: { userId: true }
            },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                user: {
                  select: { username: true }
                }
              }
            }
          }
        },
        _count: {
          select: { reviews: true }
        }
      }
    });

    if (!item) return res.status(404).json({ message: '项目未找到' });

    // 格式化评价数据
    const formattedReviews = item.reviews.map(r => ({
      ...r,
      imageUrl: getSignedUrl(r.imageUrl),
      reviewer: r.reviewer
        ? {
            ...r.reviewer,
            avatarUrl: getSignedUrl(r.reviewer.avatarKey),
          }
        : null,
      isLiked: userId ? r.likes.some(l => l.userId === userId) : false,
      likesCount: r.likes.length
    }));

    res.json({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: getSignedUrl(item.imageUrl),
      type: item.type,
      location: item.location,
      college: item.college,
      avgRating: item.avgRating,
      reviewCount: item._count.reviews,
      reviews: formattedReviews
    });
  } catch (error) {
    console.error('Get review item detail error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 点赞/取消点赞
export const toggleLikeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const id = parseInt(reviewId, 10);

    const targetReview = await prisma.review.findUnique({
      where: { id },
      select: {
        id: true,
        reviewerId: true,
        reviewer: { select: { username: true } },
      },
    });
    if (!targetReview) {
      return res.status(404).json({ message: '评价不存在' });
    }

    const existingLike = await prisma.like.findFirst({
      where: { userId, reviewId: id }
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existingLike.id } }),
        prisma.user.updateMany({
          where: {
            id: targetReview.reviewerId,
            username: { not: '游客' },
          },
          data: { experience: { decrement: LIKE_GAIN_EXP } },
        }),
      ]);
      return res.json({ liked: false, expDelta: -LIKE_GAIN_EXP });
    }

    await prisma.$transaction([
      prisma.like.create({
        data: {
          userId,
          reviewId: id
        }
      }),
      prisma.user.updateMany({
        where: {
          id: targetReview.reviewerId,
          username: { not: '游客' },
        },
        data: { experience: { increment: LIKE_GAIN_EXP } },
      }),
    ]);
    return res.json({ liked: true, expDelta: LIKE_GAIN_EXP });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 回复评价
export const createReply = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) return res.status(400).json({ message: '内容是必填项' });
    const normalizedContent = String(content).trim();
    const matchedWord = findSensitiveWord(normalizedContent);
    if (matchedWord) {
      return res.status(400).json({ message: '评论内容包含敏感词，请修改后再提交' });
    }

    const reply = await prisma.reply.create({
      data: {
        content: normalizedContent,
        userId,
        reviewId: parseInt(reviewId)
      },
      include: {
        user: {
          select: { username: true }
        }
      }
    });

    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 举报评价
export const reportReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason) return res.status(400).json({ message: '原因是必填项' });

    const report = await prisma.report.create({
      data: {
        reason,
        userId,
        reviewId: parseInt(reviewId)
      }
    });

    res.status(201).json({ message: '举报已提交', id: report.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 获取用户获得的累计点赞数
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 统计该用户发表的所有评价获得的点赞总数
    const result = await prisma.like.count({
      where: {
        review: {
          reviewerId: userId
        }
      }
    });

    res.json({ receivedLikes: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 提交评价
export const createReview = async (req, res) => {
  try {
    const { itemId, rating, comment, imageUrl } = req.body;
    const normalizedImageKey = imageUrl ? normalizeStoredFileKey(imageUrl) : null;
    const normalizedComment = comment === undefined || comment === null ? null : String(comment).trim();
    const matchedWord = findSensitiveWord(normalizedComment || '');
    if (matchedWord) {
      return res.status(400).json({ message: '评价内容包含敏感词，请修改后再提交' });
    }
    let reviewerId = req.user?.id; 
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!itemId || !rating) {
      return res.status(400).json({ message: '项目 ID 和评分均为必填项' });
    }

    const targetItem = await prisma.reviewableItem.findUnique({
      where: { id: parseInt(itemId) },
      select: { id: true, type: true },
    });
    if (!targetItem) {
      return res.status(404).json({ message: '评价项目不存在' });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. 查找或创建“游客”用户 (提前获取 ID，方便后续统一逻辑)
    const guestUser = await prisma.user.upsert({
      where: { username: '游客' },
      update: {},
      create: {
        username: '游客',
        password: 'guest-no-password',
        email: 'guest@njupt.hub',
        role: 'USER',
      },
    });

    // 2. 确定查询条件：登录用户查 ID，游客查 IP + 游客用户 ID
    const searchCondition = reviewerId 
      ? { reviewerId, itemId: parseInt(itemId) }
      : { ip, reviewerId: guestUser.id, itemId: parseInt(itemId) };

    // 3. 查找该用户/IP 对该项目的最新一条评价
    const latestReview = await prisma.review.findFirst({
      where: searchCondition,
      orderBy: { createdAt: 'desc' }
    });

    // 4. 判断是否在 24 小时修改窗口内 (以初次评价时间 createdAt 为准)
    const isWithinUpdateWindow = latestReview && latestReview.createdAt > oneDayAgo;

    // 5. 游客约束校验
    if (!reviewerId) {
      if (comment && comment.trim() !== '') {
        return res.status(403).json({ message: '游客仅允许评分，请登录后发表文字评论' });
      }
      if (imageUrl) {
        return res.status(403).json({ message: '游客仅允许评分，请登录后上传图片' });
      }
      reviewerId = guestUser.id;
    }

    // 6. 使用事务执行更新或新建
    const review = await prisma.$transaction(async (tx) => {
      let finalReview;
      const needModeration = targetItem.type === 'MENTOR' && (
        Boolean(comment && String(comment).trim()) || Boolean(normalizedImageKey)
      );
      const nextStatus = needModeration ? REVIEW_STATUS.PENDING : REVIEW_STATUS.APPROVED;
      
      if (isWithinUpdateWindow) {
        // 在 24 小时窗口内：无限次修改最新的一条记录
        finalReview = await tx.review.update({
          where: { id: latestReview.id },
          data: {
            rating: parseFloat(rating),
            comment: reviewerId === req.user?.id ? normalizedComment : null, // 游客不存评论
            imageUrl: reviewerId === req.user?.id ? normalizedImageKey : null, // 游客不存图片
            status: nextStatus,
            ip: ip // 记录当前 IP
          },
          include: {
            reviewer: { select: { username: true } }
          }
        });
      } else {
        // 无历史记录 或 超过 24 小时：创建一条全新的评价记录
        finalReview = await tx.review.create({
          data: {
            rating: parseFloat(rating),
            comment: reviewerId === req.user?.id ? normalizedComment : null,
            imageUrl: reviewerId === req.user?.id ? normalizedImageKey : null,
            status: nextStatus,
            reviewerId,
            itemId: parseInt(itemId),
            ip: ip
          },
          include: {
            reviewer: { select: { username: true } }
          }
        });
      }

      // 7. 仅基于已通过评价计算平均分
      await recalculateItemAvgRating(tx, parseInt(itemId));

      return finalReview;
    });

    if (req.user?.id && !isWithinUpdateWindow) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { experience: { increment: EXPERIENCE_REWARD.SUBMIT_REVIEW } },
      });
    }

    const moderationHint = review.status === REVIEW_STATUS.PENDING
      ? { message: '评价已提交，审核通过后可公开展示' }
      : {};

    res.status(201).json({
      ...review,
      imageUrl: getSignedUrl(review.imageUrl),
      ...moderationHint,
    });
  } catch (error) {
    console.error('Create/Update review error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPendingReviews = async (req, res) => {
  try {
    const items = await prisma.review.findMany({
      where: { status: REVIEW_STATUS.PENDING },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { username: true } },
        item: { select: { title: true, type: true } },
      },
    });

    res.json(items.map((it) => ({
      ...it,
      imageUrl: getSignedUrl(it.imageUrl),
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateReviewStatusByAdmin = async (req, res) => {
  try {
    const id = parseInt(req.params.reviewId, 10);
    const status = req.body?.status;
    if (!id || ![REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED].includes(status)) {
      return res.status(400).json({ message: '无效的参数' });
    }

    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true, itemId: true },
    });
    if (!review) return res.status(404).json({ message: '评价不存在' });

    await prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id },
        data: { status },
      });
      await recalculateItemAvgRating(tx, review.itemId);
    });

    res.json({ message: '状态更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOwnReview = async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    const userId = req.user.id;
    const { rating, comment, imageUrl } = req.body ?? {};

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { item: { select: { type: true } } },
    });
    if (!review) return res.status(404).json({ message: '评价不存在' });
    if (review.reviewerId !== userId) return res.status(403).json({ message: '无权修改该评价' });

    const updateData = {};
    if (rating !== undefined) updateData.rating = parseFloat(rating);
    if (comment !== undefined) {
      const normalizedComment = String(comment || '').trim();
      const matchedWord = findSensitiveWord(normalizedComment);
      if (matchedWord) {
        return res.status(400).json({ message: '评价内容包含敏感词，请修改后再提交' });
      }
      updateData.comment = normalizedComment;
    }
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? normalizeStoredFileKey(imageUrl) : null;

    const needModeration = review.item.type === 'MENTOR' && (
      Boolean((comment ?? review.comment)?.trim?.()) || Boolean(updateData.imageUrl ?? review.imageUrl)
    );
    updateData.status = needModeration ? REVIEW_STATUS.PENDING : REVIEW_STATUS.APPROVED;

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.review.update({
        where: { id: reviewId },
        data: updateData,
        include: { reviewer: { select: { username: true } } },
      });
      await recalculateItemAvgRating(tx, review.itemId);
      return next;
    });

    res.json({
      ...updated,
      imageUrl: getSignedUrl(updated.imageUrl),
      message: updated.status === REVIEW_STATUS.PENDING ? '修改已提交，审核通过后公开展示' : '修改成功',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOwnReview = async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    const userId = req.user.id;
    const target = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, reviewerId: true, itemId: true },
    });
    if (!target) return res.status(404).json({ message: '评价不存在' });
    if (target.reviewerId !== userId) return res.status(403).json({ message: '无权删除该评价' });

    await prisma.$transaction(async (tx) => {
      await tx.like.deleteMany({ where: { reviewId } });
      await tx.reply.deleteMany({ where: { reviewId } });
      await tx.report.deleteMany({ where: { reviewId } });
      await tx.review.delete({ where: { id: reviewId } });
      await recalculateItemAvgRating(tx, target.itemId);
    });
    res.json({ message: '评价已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 获取举报列表
export const getReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        user: { select: { username: true } },
        review: {
          include: {
            reviewer: { select: { username: true } },
            item: { select: { title: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 删除评价 (管理员)
export const deleteReviewByAdmin = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const id = parseInt(reviewId, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: '无效的评价 ID' });
    }

    // 当前 schema 未配置级联删除，需手动先删关联记录，避免外键约束失败
    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true, itemId: true },
    });
    if (!review) return res.status(404).json({ message: '评价不存在' });

    await prisma.$transaction(async (tx) => {
      await tx.like.deleteMany({ where: { reviewId: id } });
      await tx.reply.deleteMany({ where: { reviewId: id } });
      await tx.report.deleteMany({ where: { reviewId: id } });
      await tx.review.delete({ where: { id } });
      await recalculateItemAvgRating(tx, review.itemId);
    });
    res.json({ message: '评价已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 撤销举报 (管理员)
export const dismissReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    await prisma.report.delete({
      where: { id: parseInt(reportId) }
    });
    res.json({ message: '举报已撤销' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 新增评价项目 (ReviewableItem)
export const createReviewItem = async (req, res) => {
  try {
    const { title, description, imageUrl, type, location, college } = req.body;
    const normalizedImageKey = imageUrl ? normalizeStoredFileKey(imageUrl) : null;

    if (!title || !type) {
      return res.status(400).json({ message: '标题和类型均为必填项' });
    }

    // 检查类型是否合法 (Enum Project)
    const validTypes = ['MENTOR', 'CANTEEN', 'TAKEOUT'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: '无效的类型' });
    }

    const newItem = await prisma.reviewableItem.create({
      data: {
        title: String(title),
        description: description ? String(description) : null,
        imageUrl: normalizedImageKey,
        type: type,
        location: location ? String(location) : null,
        college: college ? String(college) : null,
        avgRating: 0
      }
    });

    res.status(201).json({
      ...newItem,
      imageUrl: getSignedUrl(newItem.imageUrl)
    });
  } catch (error) {
    console.error('Create review item error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 修改评价项目 (管理员)
export const updateReviewItemByAdmin = async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: '无效的项目 ID' });
    }

    const { title, description, imageUrl, location, college } = req.body ?? {};

    const updateData = {};
    if (title !== undefined) {
      const nextTitle = String(title || '').trim();
      if (!nextTitle) return res.status(400).json({ message: '标题不能为空' });
      updateData.title = nextTitle;
    }
    if (description !== undefined) updateData.description = description ? String(description) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? normalizeStoredFileKey(imageUrl) : null;
    if (location !== undefined) updateData.location = location ? String(location) : null;
    if (college !== undefined) updateData.college = college ? String(college) : null;

    const updated = await prisma.reviewableItem.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      ...updated,
      imageUrl: getSignedUrl(updated.imageUrl),
    });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: '项目未找到' });
    }
    return res.status(500).json({ error: error.message });
  }
};

// 删除评价项目 (管理员)
export const deleteReviewItemByAdmin = async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: '无效的项目 ID' });
    }

    const item = await prisma.reviewableItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!item) return res.status(404).json({ message: '项目未找到' });

    await prisma.$transaction(async (tx) => {
      const reviews = await tx.review.findMany({
        where: { itemId: id },
        select: { id: true },
      });
      const reviewIds = reviews.map((r) => r.id);

      if (reviewIds.length > 0) {
        await tx.like.deleteMany({ where: { reviewId: { in: reviewIds } } });
        await tx.reply.deleteMany({ where: { reviewId: { in: reviewIds } } });
        await tx.report.deleteMany({ where: { reviewId: { in: reviewIds } } });
        await tx.review.deleteMany({ where: { id: { in: reviewIds } } });
      }

      await tx.reviewableItem.delete({ where: { id } });
    });

    return res.json({ message: '项目已删除' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 上传并覆盖评价项目图片 (管理员)
export const uploadReviewItemImageByAdmin = async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: '无效的项目 ID' });
    }
    if (!req.file) {
      return res.status(400).json({ message: '未上传文件' });
    }

    const item = await prisma.reviewableItem.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });
    if (!item) return res.status(404).json({ message: '项目未找到' });

    // 上传新图（放到 assets/items 下）
    const { name: newKey } = await uploadToQiniu(
      req.file.buffer,
      req.file.originalname,
      PREFIX_ASSETS,
      'items',
      req.file.mimetype,
    );

    // 更新数据库（存 key）
    const updated = await prisma.reviewableItem.update({
      where: { id },
      data: { imageUrl: newKey },
    });

    // 清理旧图（非必需，失败不影响主流程）
    const oldKey = item.imageUrl ? normalizeStoredFileKey(item.imageUrl) : '';
    if (oldKey && oldKey !== newKey) {
      deleteFile(oldKey).catch(() => {});
    }

    return res.json({
      message: '上传成功',
      imageUrl: getSignedUrl(updated.imageUrl),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
