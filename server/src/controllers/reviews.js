import prisma from '../lib/prisma.js';
import { uploadToQiniu, PREFIX_ASSETS, getSignedUrl } from '../lib/qiniu.js';

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
          orderBy: { createdAt: 'desc' },
          take: 1, // 只取一条最新的作为精选评价
          include: {
            reviewer: {
              select: { username: true }
            }
          }
        },
        _count: {
          select: { reviews: true }
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
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: { username: true }
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

    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        reviewId: parseInt(reviewId)
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
      return res.json({ liked: false });
    } else {
      await prisma.like.create({
        data: {
          userId,
          reviewId: parseInt(reviewId)
        }
      });
      return res.json({ liked: true });
    }
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

    const reply = await prisma.reply.create({
      data: {
        content,
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
    let reviewerId = req.user?.id; 
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!itemId || !rating) {
      return res.status(400).json({ message: '项目 ID 和评分均为必填项' });
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
      
      if (isWithinUpdateWindow) {
        // 在 24 小时窗口内：无限次修改最新的一条记录
        finalReview = await tx.review.update({
          where: { id: latestReview.id },
          data: {
            rating: parseFloat(rating),
            comment: reviewerId === req.user?.id ? comment : null, // 游客不存评论
            imageUrl: reviewerId === req.user?.id ? imageUrl : null, // 游客不存图片
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
            comment: reviewerId === req.user?.id ? comment : null,
            imageUrl: reviewerId === req.user?.id ? imageUrl : null,
            reviewerId,
            itemId: parseInt(itemId),
            ip: ip
          },
          include: {
            reviewer: { select: { username: true } }
          }
        });
      }

      // 7. 重新计算加权平均分
      const allReviews = await tx.review.findMany({
        where: { itemId: parseInt(itemId) },
        include: {
          reviewer: { select: { username: true } }
        }
      });

      let weightedSum = 0;
      let totalWeight = 0;
      allReviews.forEach(r => {
        const weight = r.reviewer.username === '游客' ? 0.2 : 0.8;
        weightedSum += r.rating * weight;
        totalWeight += weight;
      });

      const avgRating = totalWeight > 0 ? weightedSum / totalWeight : 0;

      await tx.reviewableItem.update({
        where: { id: parseInt(itemId) },
        data: { avgRating }
      });

      return finalReview;
    });

    res.status(201).json({
      ...review,
      imageUrl: getSignedUrl(review.imageUrl)
    });
  } catch (error) {
    console.error('Create/Update review error:', error);
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
    await prisma.review.delete({
      where: { id: parseInt(reviewId) }
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
        imageUrl: imageUrl ? String(imageUrl) : null,
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
