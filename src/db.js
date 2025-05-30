// db.js
export class TaskDB {
  constructor(env) {
    this.db = env.D1_DATABASE;
  }

  // 创建任务
  async createTask(taskData) {
    const { id, type, title, description, frequency_type, specific_date, cron_expression, script, extra_data } = taskData;
    const now = new Date().toISOString();

    const result = await this.db
      .prepare(
        `INSERT INTO tasks (
          id, type, title, description, frequency_type, specific_date, cron_expression, script, extra_data, next_run_at, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        type,
        title,
        description || null,
        frequency_type,
        specific_date || null,
        cron_expression || null,
        script || null,
        extra_data || null,
        now,
        "pending",
        now
      )
      .run();

    return result;
  }

  /**
   * 更新任务的任意字段
   * @param {string} id - 任务唯一 ID
   * @param {Object} updates - 要更新的字段对象
   * @returns {Object} - 更新结果
   */
  async updateTask(id, updates) {
    const allowedFields = [
      "type",
      "title",
      "description",
      "frequency_type",
      "specific_date",
      "cron_expression",
      "script",
      "extra_data",
      "status"
    ];

    // 过滤掉非法字段
    const filteredUpdates = {};
    for (const key in updates) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    }

    // 构建 SQL 语句
    const setClauses = [];
    const values = [];

    for (const [key, value] of Object.entries(filteredUpdates)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }

    // 自动更新 updated_at 字段
    setClauses.push("updated_at = CURRENT_TIMESTAMP");

    const query = `
      UPDATE tasks
      SET ${setClauses.join(", ")}
      WHERE id = ?
    `;

    // 绑定参数
    values.push(id);

    const result = await this.db
      .prepare(query)
      .bind(...values)
      .run();

    return result;
  }

  // 查询任务列表，支持分页
  async getTasks(filter = {}, page = 1, limit = 10) {
    const { type, status } = filter;

    // 构建主查询
    let query = "SELECT * FROM tasks";
    const params = [];

    if (type || status) {
      query += " WHERE ";
      if (type) {
        query += `type = ?`;
        params.push(type);
      }
      if (status) {
        if (type) query += " AND ";
        query += `status = ?`;
        params.push(status);
      }
    }

    // 构建 count 查询
    let countQuery = "SELECT COUNT(*) as total FROM tasks";
    if (type || status) {
      countQuery += " WHERE ";
      if (type) {
        countQuery += `type = ?`;
      }
      if (status) {
        if (type) countQuery += " AND ";
        countQuery += `status = ?`;
      }
    }

    // 执行 count 查询
    const countResult = await this.db
      .prepare(countQuery)
      .bind(...params)
      .first();
    const total = countResult?.total || 0;

    // 添加分页
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, (page - 1) * limit);

    const result = await this.db.prepare(query).bind(...params).all();

    return {
      data: result.results,
      total,
      page,
      limit,
    };
  }

  // 更新任务状态
  async updateTaskStatus(id, status) {
    const result = await this.db
      .prepare(`UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(status, id)
      .run();
    return result;
  }

  // 获取待执行任务
  async getPendingTasks() {
    const result = await this.db
      .prepare(`SELECT * FROM tasks WHERE status = 'pending' AND next_run_at <= CURRENT_TIMESTAMP`)
      .all();
    return result;
  }

  // 删除任务
  async deleteTask(id) {
    const result = await this.db
      .prepare(`DELETE FROM tasks WHERE id = ?`)
      .bind(id)
      .run();
    return result;
  }
}