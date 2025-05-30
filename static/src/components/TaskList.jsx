import React, { useEffect, useState } from 'react';
import {
  Button, Flex, Table,
  Space, Popconfirm, message,
  Form, Select, Row, Col, Card,
} from 'antd';
import dayjs from 'dayjs'
import AddOrEditTaskDrawer from './AddOrEditTaskDrawer';
import { request } from '../utils/request';
import { taskTypeColumns, taskStatusColumns, taskFrequencyColumns } from '../utils/const';


const TaskList = () => {
  const [loading, setLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [dataSource, setDataSource] = useState([]);
  const [visible, setVisible] = useState(false);
  const [curEditRecord, setCurEditRecord] = useState(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 表格列
  const columns = [
    { title: 'ID', width: 120, dataIndex: 'id' },
    { title: '任务标题', width: 150, dataIndex: 'title' },
    { title: '任务描述', width: 150, dataIndex: 'description', render: (v) => v || '--' },
    { title: '任务类型', width: 100, dataIndex: 'type', render: (v) => taskTypeColumns.find(item => item.value === v)?.label },
    {
      title: '任务状态', width: 100, dataIndex: 'status', render: (v) => {
        const item = taskStatusColumns.find(item => item.value === v);
        const label = item?.label;
        return <span style={{ color: item?.color }}>{label}</span>
      }
    },
    {
      title: '创建时间', width: 180, dataIndex: 'created_at', render: (v) => {
        // 比北京时间差8小时
        return dayjs(v).add(8, 'hour').format('YYYY-MM-DD HH:mm');
      }
    },
    {
      title: '更新时间', width: 180, dataIndex: 'updated_at', render: (v) => {
        // 比北京时间差8小时
        return dayjs(v).add(8, 'hour').format('YYYY-MM-DD HH:mm');
      }
    },
    {
      title: '操作',
      dataIndex: 'operation',
      fixed: 'right',
      width: 120,
      render: (text, record) => (
        <Space>
          <a onClick={() => handleEdit(record)}>
            编辑
          </a>
          <Popconfirm
            title="请确认是否删除该题目？"
            description="删除后不可恢复"
            placement="bottomLeft"
            onConfirm={() => confirmDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        </Space>
      )
    }
  ];

  function handleEdit(record) {
    const realResult = { ...record };
    // 用dayjs处理日期
    if (realResult.specific_date) {
      realResult.specific_date = dayjs(realResult.specific_date);
    }
    try {
      realResult.extra_data = JSON.parse(realResult.extra_data);
    } catch (e) {
      console.log('e:', e);
    }
    if (realResult.extra_data?.deadline_at) {
      realResult.extra_data.deadline_at = dayjs(realResult.extra_data.deadline_at);
    }
    setCurEditRecord(realResult);
    form.setFieldsValue(realResult);
    setVisible(true);
  }

  //  获取数据
  function getData() {
    setLoading(true);
    let url = `/tasks?page=${pageNo}&limit=${pageSize}`;
    const searchValues = searchForm.getFieldsValue();
    if (searchValues.status) {
      url += `&status=${searchValues.status}`;
    }
    if (searchValues.type) {
      url += `&type=${searchValues.type}`;
    }
    request(url).then((res) => {
      setLoading(false);
      const result = res.result || {};
      setDataSource(result.data || []);
      setTotal(result.total || 0);
    }).catch((err) => {
      message.error(err?.message || '请求失败');
      setLoading(false);
    });
  }

  // 删除
  function confirmDelete(id) {
    setLoading(true);
    request(`/tasks/${id}`, {
      method: 'DELETE',
    }).then((res) => {
      if (res.success) {
        message.success('删除成功');
        getData();
      }
      setLoading(false);
    }).catch((err) => {
      message.error(err?.message || '请求失败');
      setLoading(false);
    });
  }

  // 新增
  const create = () => {
    setCurEditRecord(null);
    form.resetFields();
    setVisible(true);
  };

  useEffect(() => {
    getData();
  }, [pageNo, pageSize]);

  return (
    <Card title="任务中心" style={{ width: '100%', height: '100%' }}>
      <Flex gap="middle" vertical>
        {/* 筛选 */}
        <Flex>
          <Form form={searchForm} style={{ width: '100%', background: '#fff' }}>
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item
                  name="type"
                  label="任务类型"
                >
                  <Select
                    allowClear
                    placeholder="请选择任务类型"
                    options={taskTypeColumns}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="status"
                  label="任务状态"
                >
                  <Select
                    allowClear
                    placeholder="请选择任务状态"
                    options={taskStatusColumns}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Space size="small">
                  <Button onClick={() => getData()} type="primary">
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      searchForm.resetFields();
                      getData();
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Flex>
        {/* 筛选end */}

        {/* 按钮 */}
        <Flex align="center" gap="middle">
          <Space>
            <Button type="primary" onClick={create}>
              新增任务
            </Button>
          </Space>
        </Flex>

        {/* 表格 */}
        <Table
          bordered
          rowKey='id'
          loading={loading}
          columns={columns}
          dataSource={dataSource}
          pagination={{
            current: pageNo,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (page, size) => {
              setPageNo(page);
              setPageSize(size);
            }
          }}
          scroll={{ x: 'max-content', y: 'calc(100vh - 366px)' }}
        />

        {/* 新增、编辑 */}
        <AddOrEditTaskDrawer
          visible={visible}
          setVisible={() => setVisible(false)}
          form={form}
          curEditRecord={curEditRecord}
          onOk={getData}
        />
      </Flex>
    </Card>
  );
};

export default TaskList;