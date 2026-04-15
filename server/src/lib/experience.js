export const EXPERIENCE_REWARD = {
  UPLOAD_RESOURCE: 10,
  SUBMIT_REVIEW: 5,
};

export const calcLevelFromExp = (exp) => Math.floor(Number(exp || 0) / 100) + 1;

export const calcNextLevelExp = (exp) => {
  const level = calcLevelFromExp(exp);
  return level * 100;
};

export const toUserProgress = (user) => {
  const experience = Number(user?.experience || 0);
  const level = calcLevelFromExp(experience);
  const currentLevelBase = (level - 1) * 100;
  const nextLevelExp = calcNextLevelExp(experience);
  return {
    ...user,
    experience,
    level,
    nextLevelExp,
    levelProgress: experience - currentLevelBase,
    levelProgressTotal: 100,
  };
};

