import nodemailer from 'nodemailer';

const smtpPort = Number.parseInt(process.env.SMTP_PORT || '465', 10);
const smtpSecure = process.env.SMTP_SECURE
  ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
  : smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

const assertEmailConfigured = () => {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`SMTP configuration is incomplete: ${missing.join(', ')}`);
  }
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const buildUploadThankYouEmail = ({ username, resources = [] }) => {
  const items = resources
    .filter(Boolean)
    .map((resource) => ({
      title: String(resource.title || resource.fileName || '未命名资料'),
      course: String(resource.course || '未分类课程'),
    }));
  const displayName = String(username || '同学');
  const itemCount = items.length;
  const resourceRows = items.map((item) => `
    <tr>
      <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">
        ${escapeHtml(item.title)}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: right;">
        ${escapeHtml(item.course)}
      </td>
    </tr>
  `).join('');
  const textList = items.map((item) => `- ${item.title}（${item.course}）`).join('\n');

  return {
    subject: `NJUPT Hub - 感谢你贡献了 ${itemCount} 份资料`,
    text: [
      `${displayName}，你好！`,
      '',
      `感谢你向 NJUPT Hub 上传了 ${itemCount} 份学习资料。`,
      textList,
      '',
      '资料已进入审核队列，审核通过后会出现在资料库中。',
      '每一份分享都会让后来查找资料的同学少走一点弯路。感谢你让 NJUPT Hub 变得更完整。',
      '',
      'NJUPT Hub',
    ].join('\n'),
    html: `
      <div style="margin: 0; padding: 32px 16px; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="padding: 28px 32px; background: #1d4ed8; color: #ffffff;">
            <div style="font-size: 13px; font-weight: 700; letter-spacing: 0; opacity: 0.85;">NJUPT HUB</div>
            <h1 style="margin: 8px 0 0; font-size: 24px; line-height: 1.35; letter-spacing: 0;">谢谢你的分享</h1>
          </div>
          <div style="padding: 30px 32px;">
            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7;">${escapeHtml(displayName)}，你好！</p>
            <p style="margin: 0 0 22px; color: #374151; font-size: 15px; line-height: 1.8;">
              感谢你向 NJUPT Hub 上传了 <strong>${itemCount}</strong> 份学习资料。它们已经进入审核队列，审核通过后会出现在资料库中。
            </p>
            <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 10px 14px; text-align: left; color: #4b5563; font-size: 12px;">资料</th>
                  <th style="padding: 10px 14px; text-align: right; color: #4b5563; font-size: 12px;">课程</th>
                </tr>
              </thead>
              <tbody>${resourceRows}</tbody>
            </table>
            <p style="margin: 24px 0 0; color: #374151; font-size: 15px; line-height: 1.8;">
              每一份分享，都会让后来查找资料的同学少走一点弯路。感谢你让 NJUPT Hub 变得更完整。
            </p>
          </div>
          <div style="padding: 18px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; line-height: 1.6;">
            这是一封自动发送的邮件，请勿直接回复。
          </div>
        </div>
      </div>
    `,
  };
};

export const buildResourceReviewResultEmail = ({ username, resource }) => {
  const displayName = String(username || '同学');
  const title = String(resource?.title || resource?.fileName || '未命名资料');
  const course = String(resource?.course || '未分类课程');
  const status = String(resource?.status || '');
  const isApproved = status === 'APPROVED';
  const statusText = isApproved ? '已通过审核' : '未通过审核';
  const subject = `NJUPT Hub - 你上传的资料${statusText}`;
  const headline = isApproved ? '资料审核通过啦' : '资料审核结果已出';
  const accent = isApproved ? '#15803d' : '#dc2626';
  const summary = isApproved
    ? '你上传的资料已经通过审核，现在会展示在资料库中，其他同学可以正常查看和下载了。'
    : '你上传的资料这次未通过审核，当前不会展示在资料库中。你可以调整后重新上传。';
  const closing = isApproved
    ? '感谢你的认真整理和分享，这类内容会持续帮助到后来找资料的同学。'
    : '感谢你的分享意愿。只要稍作调整，我们依然很欢迎你再次补充上传。';

  return {
    subject,
    text: [
      `${displayName}，你好！`,
      '',
      `你上传到 NJUPT Hub 的资料《${title}》审核结果为：${statusText}。`,
      `所属课程：${course}`,
      '',
      summary,
      closing,
      '',
      'NJUPT Hub',
    ].join('\n'),
    html: `
      <div style="margin: 0; padding: 32px 16px; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="padding: 28px 32px; background: ${accent}; color: #ffffff;">
            <div style="font-size: 13px; font-weight: 700; opacity: 0.88;">NJUPT HUB</div>
            <h1 style="margin: 8px 0 0; font-size: 24px; line-height: 1.35;">${headline}</h1>
          </div>
          <div style="padding: 30px 32px;">
            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7;">${escapeHtml(displayName)}，你好！</p>
            <p style="margin: 0 0 22px; color: #374151; font-size: 15px; line-height: 1.8;">
              你上传到 NJUPT Hub 的资料审核结果已经出来了。
            </p>
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 20px; background: #f9fafb;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">资料名称</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600; line-height: 1.6;">${escapeHtml(title)}</div>
              <div style="font-size: 12px; color: #6b7280; margin: 16px 0 8px;">所属课程</div>
              <div style="font-size: 15px; color: #374151; line-height: 1.6;">${escapeHtml(course)}</div>
              <div style="font-size: 12px; color: #6b7280; margin: 16px 0 8px;">审核结果</div>
              <div style="display: inline-block; padding: 7px 12px; border-radius: 999px; background: ${isApproved ? '#dcfce7' : '#fee2e2'}; color: ${accent}; font-size: 14px; font-weight: 700;">
                ${statusText}
              </div>
            </div>
            <p style="margin: 22px 0 0; color: #374151; font-size: 15px; line-height: 1.8;">
              ${summary}
            </p>
            <p style="margin: 16px 0 0; color: #374151; font-size: 15px; line-height: 1.8;">
              ${closing}
            </p>
          </div>
          <div style="padding: 18px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; line-height: 1.6;">
            这是一封自动发送的邮件，请勿直接回复。
          </div>
        </div>
      </div>
    `,
  };
};

/**
 * 发送验证码邮件
 * @param {string} to 目标邮箱
 * @param {string} code 验证码
 */
export const sendVerificationEmail = async (to, code) => {
  assertEmailConfigured();
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'NJUPT Hub - 注册验证码',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">欢迎注册 NJUPT Hub</h2>
        <p>您正在注册 NJUPT Hub 账号，请使用以下验证码完成验证：</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #1f2937; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 14px; color: #6b7280;">验证码有效期为 5 分钟。如果不是您本人操作，请忽略此邮件。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">这是一封自动发送的邮件，请勿直接回复。</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

/**
 * 发送重置密码邮件
 * @param {string} to 目标邮箱
 * @param {string} code 验证码
 */
export const sendResetPasswordEmail = async (to, code) => {
  assertEmailConfigured();
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'NJUPT Hub - 重置密码验证码',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">重置您的密码</h2>
        <p>您正在申请重置 NJUPT Hub 的账号密码，请使用以下验证码完成操作：</p>
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #dc2626; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 14px; color: #6b7280;">验证码有效期为 5 分钟。如果不是您本人操作，请尽快修改密码以保护账号安全。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">这是一封自动发送的邮件，请勿直接回复。</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

export const sendUploadThankYouEmail = async ({ to, username, resources }) => {
  assertEmailConfigured();
  const content = buildUploadThankYouEmail({ username, resources });
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    ...content,
  });
};

export const sendResourceReviewResultEmail = async ({ to, username, resource }) => {
  assertEmailConfigured();
  const content = buildResourceReviewResultEmail({ username, resource });
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    ...content,
  });
};
