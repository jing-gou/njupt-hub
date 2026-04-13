import prisma from './lib/prisma.js';

async function seed() {
  try {
    // 检查是否已经有数据
    const count = await prisma.reviewableItem.count();
    if (count > 0) {
      console.log('Items already seeded');
      return;
    }

    // 导师板块
    await prisma.reviewableItem.createMany({
      data: [
        {
          title: '张教授',
          description: '人工智能实验室负责人，研究方向为深度学习和计算机视觉。为人亲和，学术造诣深厚。',
          imageUrl: 'https://placehold.co/100x100?text=Prof+Zhang',
          type: 'MENTOR',
          college: '计算机学院',
          avgRating: 4.5
        },
        {
          title: '李副教授',
          description: '主要研究网络安全和密码学，要求严格，但能学到很多实用的技术。',
          imageUrl: 'https://placehold.co/100x100?text=Prof+Li',
          type: 'MENTOR',
          college: '网络空间安全学院',
          avgRating: 4.0
        }
      ]
    });

    // 食堂板块
    await prisma.reviewableItem.createMany({
      data: [
        {
          title: '一食堂黄焖鸡',
          description: '经典口味，分量足，价格实惠。',
          imageUrl: 'https://placehold.co/100x100?text=Chicken',
          type: 'CANTEEN',
          location: '南一 - 1楼',
          avgRating: 4.8
        },
        {
          title: '二食堂酸菜鱼',
          description: '鱼肉鲜嫩，汤头浓郁，适合爱吃辣的同学。',
          imageUrl: 'https://placehold.co/100x100?text=Fish',
          type: 'CANTEEN',
          location: '南二 - 2楼',
          avgRating: 4.2
        }
      ]
    });

    // 外卖板块
    await prisma.reviewableItem.createMany({
      data: [
        {
          title: '南邮后街炸鸡',
          description: '酥脆多汁，外卖速度快，适合深夜补给。',
          imageUrl: 'https://placehold.co/100x100?text=Fried+Chicken',
          type: 'TAKEOUT',
          avgRating: 4.7
        },
        {
          title: '超人鸭血粉丝',
          description: '地道南京味，料多味美，性价比较高。',
          imageUrl: 'https://placehold.co/100x100?text=Soup',
          type: 'TAKEOUT',
          avgRating: 4.4
        }
      ]
    });

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
