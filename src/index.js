import { TaskDB } from "./db.js";
import { handleRequest } from "./routes.js";
import { Mailer } from "./mailer.js";

export default {
  async fetch(request, env, ctx) {
    const db = new TaskDB(env);
    const mailer = new Mailer(env); // 初始化 Resend 邮件客户端
    return handleRequest(request, { db, ctx, mailer, env });
  },
  /**
   * Scheduled Handler：定时任务触发时发送测试邮件
   * @param {Object} event - Cloudflare 提供的事件对象
   */
  async scheduled(event, env, ctx) {
    const mailer = new Mailer(env); // 初始化 Mailer 实例
    try {
      const timestamp = new Date().toISOString();
      await mailer.sendEmail({
        to: "1772591173@qq.com", // 替换为你的邮箱
        subject: `[Scheduled Test] 定时任务触发成功`,
        text: `定时任务于 ${timestamp} 成功触发！`,
      });
      console.log("Test email sent successfully at:", timestamp);
    } catch (error) {
      console.error("Failed to send test email:", error);
    }
  },
};