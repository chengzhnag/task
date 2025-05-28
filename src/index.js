import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const d1 = env.D1_DATABASE;
    const USERNAME = env.USERNAME;
    const PASSWORD = env.PASSWORD;

    // 统一响应格式
    const respond = (status, data, statusCode = 200) => {
      return new Response(
        JSON.stringify({
          status: status === 'error' ? 'error' : 'success',
          [status === 'error' ? 'message' : 'data']: data
        }),
        {
          status: statusCode, headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    };

    // 验证分类
    async function validateCategory(id) {
      if (!id || isNaN(id)) {
        return { error: '无效的分类ID', code: 400 };
      }
      const { results } = await d1.prepare('SELECT * FROM categories WHERE id = ?').bind(id).all();
      if (!results[0]) return { error: `分类 ID ${id} 不存在`, code: 404 };
      return { data: results[0] };
    }

    // 验证题目
    async function validateQuestion(id) {
      if (!id || isNaN(id)) {
        return { error: '无效的题目ID', code: 400 };
      }
      const { results } = await d1.prepare('SELECT * FROM questions WHERE id = ?').bind(id).all();
      if (!results[0]) return { error: `题目 ID ${id} 不存在`, code: 404 };
      return { data: results[0] };
    }

    // 登录进行校验并且设置cookie
    async function handleAuthRequest(request, USERNAME, PASSWORD) {
      const isAuthenticated = authenticate(request, USERNAME, PASSWORD);

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
    function authenticate(request, USERNAME, PASSWORD) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) return false;
      return isValidCredentials(authHeader, USERNAME, PASSWORD);
    }

    // 校验请求头上的Cookie中的账号密码
    function authenticateCookie(request, USERNAME, PASSWORD) {
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

    try {
      // 分类相关 API
      if (url.pathname.startsWith('/api/categories')) {
        // GET /api/categories
        if (method === 'GET' && url.pathname === '/api/categories') {
          const { results } = await d1.prepare('SELECT * FROM categories').all();
          return respond('success', results);

          // POST /api/categories
        } else if (method === 'POST' && url.pathname === '/api/categories') {
          if (!authenticateCookie(request, USERNAME, PASSWORD)) {
            return Response.redirect(`${url.origin}/login`, 302);
          }
          const { name, description } = await request.json();
          if (!name) return respond('error', '分类名称不能为空', 400);

          const { meta } = await d1
            .prepare('INSERT INTO categories (name, description) VALUES (?, ?)')
            .bind(name, description)
            .run();

          return respond('success', { id: meta.lastInsertId }, 201);

          // GET /api/categories/:id
        } else if (method === 'GET' && /^\/api\/categories\/\d+$/.test(url.pathname)) {
          const id = parseInt(url.pathname.split('/').pop());
          const { error, data } = await validateCategory(id);
          if (error) return respond('error', error, 404);
          return respond('success', data);

          // PUT /api/categories/:id
        } else if (method === 'PUT' && /^\/api\/categories\/\d+$/.test(url.pathname)) {
          if (!authenticateCookie(request, USERNAME, PASSWORD)) {
            return Response.redirect(`${url.origin}/login`, 302);
          }
          const id = parseInt(url.pathname.split('/').pop());
          const { error } = await validateCategory(id);
          if (error) return respond('error', error, 404);

          const { name, description } = await request.json();
          await d1.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?')
            .bind(name, description, id)
            .run();

          return respond('success', { id, name, description });

          // DELETE /api/categories/:id
        } else if (method === 'DELETE' && /^\/api\/categories\/\d+$/.test(url.pathname)) {
          if (!authenticateCookie(request, USERNAME, PASSWORD)) {
            return Response.redirect(`${url.origin}/login`, 302);
          }
          const id = parseInt(url.pathname.split('/').pop());
          const { error } = await validateCategory(id);
          if (error) return respond('error', error, 404);

          await d1.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
          return respond('success', { id });
        }
      }

      // 题目相关 API
      if (url.pathname.startsWith('/api/questions')) {
        // GET /api/questions
        if (method === 'GET' && url.pathname === '/api/questions') {
          const searchParams = url.searchParams;
          const category_id = searchParams.get('category_id');
          const type = searchParams.get('type');
          const page = searchParams.get('page') || 1;
          const limit = searchParams.get('limit') || 10;
          let sqlCount = `
            SELECT COUNT(*) AS total 
            FROM questions
          `;
          let sqlData = `
            SELECT 
              questions.*, 
              categories.name AS category_name 
            FROM questions
            LEFT JOIN categories ON questions.category_id = categories.id
          `;
          const params = [];
          const whereClauses = [];

          // 过滤条件
          if (category_id) {
            if (isNaN(parseInt(category_id))) {
              return respond('error', '无效的分类ID', 400);
            }
            whereClauses.push('questions.category_id = ?');
            params.push(parseInt(category_id));
          }
          if (type) {
            whereClauses.push('questions.type = ?');
            params.push(type);
          }

          // 拼接过滤条件
          if (whereClauses.length > 0) {
            sqlCount += ' WHERE ' + whereClauses.join(' AND ');
            sqlData += ' WHERE ' + whereClauses.join(' AND ');
          }

          // 获取总记录数
          const totalCountResult = await d1.prepare(sqlCount).bind(...params).first();
          const total = totalCountResult.total || 0;

          // 分页处理
          const offset = (parseInt(page) - 1) * parseInt(limit);
          sqlData += ' LIMIT ? OFFSET ?';
          params.push(parseInt(limit), offset);

          // 执行查询
          const { results } = await d1.prepare(sqlData).bind(...params).all();

          // 返回分页数据和总记录数
          return respond('success', {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            data: results,
          });

          // POST /api/questions
        } else if (method === 'POST' && url.pathname === '/api/questions') {
          if (!authenticateCookie(request, USERNAME, PASSWORD)) {
            return Response.redirect(`${url.origin}/login`, 302);
          }
          const data = await request.json();
          const { content, type, correct_answer, category_id } = data;

          if (!content || !type || !correct_answer) {
            return respond('error', 'content、type、correct_answer 为必填字段', 400);
          }
          if (category_id) {
            const { error } = await validateCategory(category_id);
            if (error) return respond('error', error, 400);
          }

          const { meta } = await d1
            .prepare(`
              INSERT INTO questions 
                (content, type, options, correct_answer, category_id) 
              VALUES (?, ?, ?, ?, ?)
            `)
            .bind(
              content,
              type,
              JSON.stringify(data.options || []),
              correct_answer,
              category_id
            )
            .run();

          return respond('success', { id: meta.lastInsertId }, 201);

          // GET /api/questions/:id
        } else if (method === 'POST' && url.pathname === '/api/questions/batch') {
          const body = await request.json();
          const { category_id, questions } = body;

          // 验证参数
          if (!category_id || !Array.isArray(questions) || questions.length === 0) {
            return respond('error', 'category_id 和 questions 为必填字段，且 questions 必须是数组', 400);
          }

          // 验证分类是否存在
          const { error: categoryError } = await validateCategory(category_id);
          if (categoryError) return respond('error', categoryError, 400);

          // 准备插入语句
          const insertStmt = d1.prepare(`
            INSERT INTO questions 
              (content, type, options, correct_answer, category_id)
            VALUES (?, ?, ?, ?, ?)
          `);

          // 收集有效数据和操作
          const batchOperations = [];
          const validQuestions = [];

          for (const question of questions) {
            const { content, type, options, correct_answer } = question;

            // 验证必填字段
            if (!content || !type || !correct_answer) {
              continue; // 跳过无效数据
            }

            batchOperations.push(insertStmt.bind(
              content,
              type,
              JSON.stringify(options || []),
              correct_answer,
              category_id
            ));
            validQuestions.push(question);
          }

          if (batchOperations.length === 0) {
            return respond('error', '无有效数据可插入', 400);
          }

          try {
            // 执行批量插入
            const results = await d1.batch(batchOperations);

            // 检查所有操作是否成功
            const allSuccess = results.every(r => r.success);
            if (!allSuccess) {
              throw new Error('部分操作失败');
            }
            return respond('success', { message: '全部新增成功', count: results.length });

          } catch (e) {
            // 返回详细错误信息
            const errorDetails = results.map((r, index) => ({
              question: validQuestions[index].content,
              status: r.success ? 'success' : `失败: ${r.error?.message || '未知错误'}`,
            }));

            return respond('error', {
              message: '批量插入失败',
              details: errorDetails,
            }, 400);
          }
        } else if (method === 'GET' && /^\/api\/questions\/\d+$/.test(url.pathname)) {
          const id = parseInt(url.pathname.split('/').pop());
          const { error, data } = await validateQuestion(id);
          if (error) return respond('error', error, 404);
          return respond('success', data);

          // PUT /api/questions/:id
        } else if (method === 'PUT' && /^\/api\/questions\/\d+$/.test(url.pathname)) {
          if (!authenticateCookie(request, USERNAME, PASSWORD)) {
            return Response.redirect(`${url.origin}/login`, 302);
          }
          const id = parseInt(url.pathname.split('/').pop());
          const { error: questionError } = await validateQuestion(id);
          if (questionError) return respond('error', questionError, 404);

          const data = await request.json();
          if (data.category_id) {
            const { error: categoryError } = await validateCategory(data.category_id);
            if (categoryError) return respond('error', categoryError, 400);
          }

          await d1
            .prepare(`
              UPDATE questions 
              SET content = ?, type = ?, options = ?, correct_answer = ?, category_id = ?
              WHERE id = ?
            `)
            .bind(
              data.content,
              data.type,
              JSON.stringify(data.options || []),
              data.correct_answer,
              data.category_id,
              id
            )
            .run();

          return respond('success', { id, ...data });

          // DELETE /api/questions/:id
        } else if (method === 'DELETE' && /^\/api\/questions\/\d+$/.test(url.pathname)) {
          if (!authenticateCookie(request, USERNAME, PASSWORD)) {
            return Response.redirect(`${url.origin}/login`, 302);
          }
          const id = parseInt(url.pathname.split('/').pop());
          const { error } = await validateQuestion(id);
          if (error) return respond('error', error, 404);

          await d1.prepare('DELETE FROM questions WHERE id = ?').bind(id).run();
          return respond('success', { id });
        }
      }

      if (url.pathname === '/') {
        return Response.redirect(`${url.origin}/index.html`, 302);
      }

      if (url.pathname === '/auth') {
        return handleAuthRequest(request, USERNAME, PASSWORD);
      }

      if (url.pathname === '/login') {
        return handleLoginRequest();
      }

      if (url.pathname === '/admin') {
        if (!authenticateCookie(request, USERNAME, PASSWORD)) {
          return Response.redirect(`${url.origin}/login`, 302);
        }
        return Response.redirect(`${url.origin}/admin.html`, 302);
      }

      let asset = new RegExp('/assets/.*', 'i')
      let index = new RegExp('/index.*', 'i')
      let admin = new RegExp('/admin.*', 'i')
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

      // 默认 404
      return respond('error', '资源未找到', 404);

    } catch (e) {
      return respond('error', e.message, e.code || 500);
    }
  }
};