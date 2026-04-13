import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: parseInt(process.env.SMTP_PORT || '465') === 465, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

/**
 * 发送验证码邮件
 * @param {string} to 目标邮箱
 * @param {string} code 验证码
 */
export const sendVerificationEmail = async (to, code) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
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
  const mailOptions = {
    from: process.env.SMTP_FROM,
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
