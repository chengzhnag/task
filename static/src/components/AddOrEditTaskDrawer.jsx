import React, { useState } from "react";
import {
  Drawer, Form, Input,
  Select, DatePicker, Button,
  Space, Row, Col, Spin,
  message
} from 'antd'
import dayjs from 'dayjs'
import { taskTypeColumns, taskFrequencyColumns } from '../utils/const'
import { request } from '../utils/request';
import { generateUUID } from '../utils/index';


export default function AddOrEditTaskDrawer(props) {
  const { visible, setVisible, curEditRecord, form, onOk } = props;
  const [formLoading, setFormLoading] = useState(false);

  //  提交
  const submit = () => {
    form.validateFields().then((values) => {
      console.log('values:', values);
      const realValues = JSON.parse(JSON.stringify(values));
      if (realValues.specific_date) {
        realValues.specific_date = dayjs(realValues.specific_date).format('YYYY-MM-DD HH:mm:ss');
      }
      if (realValues.extra_data?.deadline_at) {
        realValues.extra_data.deadline_at = dayjs(realValues.extra_data.deadline_at).format('YYYY-MM-DD HH:mm:ss');
      }
      realValues.extra_data = JSON.stringify(realValues.extra_data)
      console.log('realValues:', realValues);
      //  编辑
      if (curEditRecord) {
        setFormLoading(true);
        request(`tasks/${curEditRecord.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(realValues)
        }).then((res) => {
          if (res.success) {
            message.success('编辑成功');
            setVisible(false);
            onOk?.();
          }
          setFormLoading(false);
        }).catch((err) => {
          message.error(err?.message || '请求失败');
          setFormLoading(false);
        });
      } else {
        setFormLoading(true);
        realValues.id = generateUUID(6);
        request(`tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(realValues)
        }).then((res) => {
          if (res.success) {
            message.success('新增成功');
            setVisible(false);
            onOk?.();
          }
          setFormLoading(false);
        }).catch((err) => {
          message.error(err?.message || '请求失败');
          setFormLoading(false);
        });
      }
    });
  }

  return (
    <Drawer
      title={curEditRecord ? '更新任务' : '新增任务'}
      width={820}
      onClose={() => setVisible(false)}
      open={visible}
      footer={
        <Space>
          <Button loading={formLoading} onClick={() => submit()} type="primary">
            提交
          </Button>
          <Button onClick={() => setVisible(false)}>关闭</Button>
        </Space>
      }
    >
      <Spin spinning={formLoading}>
        <Form form={form} layout='vertical' initialValues={{ frequency_type: 'daily', type: 'todo' }}>
          <Form.Item
            name="title"
            label="任务标题"
            rules={[{ required: true, message: '请输入任务标题' }]}
          >
            <Input allowClear placeholder="请输入任务标题" />
          </Form.Item>
          <Form.Item
            name="description"
            label="任务描述"
            rules={[{ required: false, message: '请输入任务描述' }]}
          >
            <Input.TextArea rows={3} allowClear placeholder="请输入任务描述" />
          </Form.Item>
          {/* 一行两个 */}
          <Row gutter={12} wrap>
            <Col span={12}>
              <Form.Item
                name="type"
                label="任务类型"
                rules={[{ required: true, message: '请选择任务类型' }]}
              >
                <Select
                  allowClear
                  options={taskTypeColumns}
                  placeholder="请选择任务类型"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="frequency_type"
                label="执行频率"
                rules={[{ required: true, message: '请选择执行频率' }]}
              >
                <Select
                  allowClear
                  options={taskFrequencyColumns}
                  placeholder="请选择执行频率"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.frequency_type !== currentValues.frequency_type}
            >
              {({ getFieldValue }) =>
                getFieldValue('frequency_type') === 'daily' ? (
                  <Col span={12}>
                    <Form.Item
                      name={['extra_data', 'deadline_at']}
                      label="截止日期"
                      rules={[{ required: true, message: '请选择截止日期' }]}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        showTime
                        placeholder="请选择截止日期"
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                      />
                    </Form.Item>
                  </Col>
                ) : null
              }
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.frequency_type !== currentValues.frequency_type}
            >
              {({ getFieldValue }) =>
                getFieldValue('frequency_type') === 'specific_date' ? (
                  <Col span={12}>
                    <Form.Item
                      name="specific_date"
                      label="执行日期"
                      rules={[{ required: true, message: '请选择执行日期' }]}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        showTime
                        placeholder="请选择执行日期"
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                      />
                    </Form.Item>
                  </Col>
                ) : null
              }
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.frequency_type !== currentValues.frequency_type}
            >
              {({ getFieldValue }) =>
                getFieldValue('frequency_type') === 'cron' ? (
                  <Col span={12}>
                    <Form.Item
                      name="cron_expression"
                      label="Cron 表达式"
                      rules={[{ required: true, message: '请输入Cron 表达式' }]}
                    >
                      <Input allowClear placeholder="请输入Cron 表达式" />
                    </Form.Item>
                  </Col>
                ) : null
              }
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
            >
              {({ getFieldValue }) =>
                getFieldValue('type') === 'scheduled_js' ? (
                  <Col span={24}>
                    <Form.Item
                      name="script"
                      label="脚本内容"
                      rules={[{ required: true, message: '请输入脚本内容' }]}
                    >
                      <Input.TextArea rows={10} allowClear placeholder="请输入脚本内容" />
                    </Form.Item>
                  </Col>
                ) : null
              }
            </Form.Item>
          </Row>
        </Form>
      </Spin>
    </Drawer>
  )
}