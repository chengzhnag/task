import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

const assetManifest = JSON.parse(manifestJSON);

// routes.js
export async function handleRequest(request, { db, ctx, mailer, env }) {
  const url = new URL(request.url);
  const USERNAME = env.USERNAME;
  const PASSWORD = env.PASSWORD;

  // 统一响应格式
  const commonRespond = (data, extra) => {
    const { status = 200, headers = {} } = extra || {};
    return Response.json(data, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...headers
      }
    });
  };

  // 登录进行校验并且设置cookie
  async function handleAuthRequest() {
    const isAuthenticated = authenticate();

    if (isAuthenticated) {
      const authHeader = request.headers.get('Authorization')
      return new Response('登录成功!', {
        status: 200,
        headers: {
          'Set-Cookie': `${authHeader}`, // 设置 Cookie
        },
      });
    } else {
      return new Response('登录失败', { status: 401 });
    }
  }

  // 校验请求头上的Authorization中的账号密码
  function authenticate() {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return false;
    return isValidCredentials(authHeader, USERNAME, PASSWORD);
  }

  // 校验请求头上的Cookie中的账号密码
  function authenticateCookie() {
    const cookie = request.headers.get('Cookie');
    if (!cookie) return false;
    return isValidCredentials(cookie, USERNAME, PASSWORD);
  }

  function isValidCredentials(authHeader, USERNAME, PASSWORD) {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials).split(':');
    const username = credentials[0];
    const password = credentials[1];
    return username === USERNAME && password === PASSWORD;
  }

  // 登录页面
  async function handleLoginRequest() {
    const response = await fetch('https://info.952737.xyz/assets/login-chengzhnag.html', {
      method: 'GET',
      headers: {
        'Content-Type': 'text/html'
      }
    });
    // 将响应体解析为文本
    const html = await response.text();
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // 创建任务 (POST /tasks)
  if (url.pathname === "/tasks" && request.method === "POST") {
    try {
      if (!authenticateCookie()) {
        return Response.redirect(`${url.origin}/login`, 302);
      }
      const data = await request.json();
      const result = await db.createTask(data);
      return commonRespond({ success: true, message: "任务创建成功！", result });
    } catch (error) {
      return commonRespond({ success: false, error: error.message }, { status: 400 });
    }
  }

  // 更新任务 (PUT /tasks/{id})
  if (url.pathname.startsWith("/tasks/") && request.method === "PUT") {
    if (!authenticateCookie()) {
      return Response.redirect(`${url.origin}/login`, 302);
    }
    const taskId = url.pathname.split("/tasks/")[1];
    const updates = await request.json();
    const result = await db.updateTask(taskId, updates);
    return commonRespond({ success: true, message: "任务更新成功！", result });
  }

  // 查询任务 (GET /tasks)
  if (url.pathname === "/tasks" && request.method === "GET") {
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 10, 100); // 限制最大为 100
    const result = await db.getTasks({ type, status }, page, limit);
    return commonRespond({ success: true, result });
  }

  // 删除任务 (DELETE /tasks/{id})
  if (url.pathname.startsWith("/tasks/") && request.method === "DELETE") {
    const taskId = url.pathname.split("/tasks/")[1];
    if (!taskId) {
      return commonRespond({ success: false, error: "任务ID不能为空！" }, { status: 400 });
    }
    if (!authenticateCookie()) {
      return Response.redirect(`${url.origin}/login`, 302);
    }
    try {
      const result = await db.deleteTask(taskId);
      return commonRespond({ success: true, message: "任务删除成功！", result });
    } catch (error) {
      return commonRespond({ success: false, error: error.message }, { status: 500 });
    }
  }

  // 执行任务 (POST /tasks/execute)
  if (url.pathname === "/tasks/execute" && request.method === "POST") {
    const pendingTasks = await db.getPendingTasks();
    for (const task of pendingTasks.results) {
      try {
        if (task.type === "scheduled_js") {
          console.log("Executing JS task:", task.script);
          // 实际执行 JS 脚本需谨慎处理安全性
        }
        await db.updateTaskStatus(task.id, "completed");
      } catch (error) {
        console.error("Task execution failed:", error);
        await db.updateTaskStatus(task.id, "failed");
      }
    }
    return commonRespond({ success: true, message: `${pendingTasks.results.length} tasks executed` });
  }

  // 发送邮件 (POST /send-mail)
  if (url.pathname === "/send-mail" && request.method === "POST") {
    const data = await request.json();
    const result = await mailer.sendEmail(data);
    return commonRespond({ success: true, message: "邮件发送成功！", result });
  }

  if (url.pathname === '/') {
    if (!authenticateCookie()) {
      return Response.redirect(`${url.origin}/login`, 302);
    }
    return Response.redirect(`${url.origin}/index.html`, 302);
  }

  if (url.pathname === '/auth') {
    return handleAuthRequest(request, USERNAME, PASSWORD);
  }

  if (url.pathname === '/login') {
    return handleLoginRequest();
  }

  // 静态资源
  const asset = new RegExp('/assets/.*', 'i');
  const index = new RegExp('/index.*', 'i');
  const admin = new RegExp('/admin.*', 'i');
  if (asset.test(url.pathname) || index.test(url.pathname) || admin.test(url.pathname)) {
    return await getAssetFromKV(
      {
        request,
        waitUntil(promise) {
          return ctx.waitUntil(promise);
        },
      },
      {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest,
      }
    );
  }

  return new Response("Not Found", { status: 404 });
}