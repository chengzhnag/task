// 任务类型，支持 todo（待办）、reminder（提醒）、scheduled_js（定时执行 JS）。
export const taskTypeColumns = [
  {
    label: '待办',
    value: 'todo'
  },
  {
    label: '提醒',
    value: 'reminder'
  },
  {
    label: '定时执行 JS',
    value: 'scheduled_js'
  }
];

/* 
执行频率类型：
daily（每日）
specific_date（指定日期）
cron（Cron 表达式）。
*/
export const taskFrequencyColumns = [
  {
    label: '每日',
    value: 'daily'
  },
  {
    label: '指定日期',
    value: 'specific_date'
  },
  {
    label: 'Cron 表达式',
    value: 'cron'
  }
];

// 任务状态，默认 pending，可更新为 completed 或 failed。
export const taskStatusColumns = [
  {
    label: '运行中',
    value: 'pending',
    color:  '#1677ff'
  },
  {
    label: '已完成',
    value: 'completed',
    color:  '#87d068'
  },
  {
    label: '失败',
    value: 'failed',
    color:  '#f50'
  }
];