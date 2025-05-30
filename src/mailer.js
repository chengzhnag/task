import { Resend } from 'resend';

export class Mailer {
  constructor(env) {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required in environment variables.");
    }
    this.resend = new Resend(apiKey);
    this.fromEmail = "chengzhnag👻 <send@auth.952737.xyz>";
  }

  /**
   * 发送邮件
   * @param {Object} options - 邮件选项
   * @param {string} options.to - 收件人邮箱
   * @param {string} options.subject - 邮件主题
   * @param {string} options.text - 邮件正文（文本）
   * @param {string} [options.html] - 邮件正文（HTML）
   * @returns {Promise<Object>} - 返回邮件发送结果
   */
  async sendEmail({ to, subject, text, html }) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject,
        text,
        html,
      });

      if (error) {
        throw new Error(`Failed to send email via Resend: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Resend email error: ${error.message}`);
    }
  }
}