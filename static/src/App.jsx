import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Menu, Layout, Avatar
} from 'antd';
import {
  ApartmentOutlined, AppstoreAddOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import TaskList from './components/TaskList.jsx';

const { Header, Sider, Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState('1');

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{ width: '100%', padding: '16px 0', textAlign: 'center' }}>
          <Avatar
            size={52}
            src='https://img.alicdn.com/imgextra/i2/O1CN01w8TREN28geVZ8cgDr_!!6000000007962-2-tps-460-460.png'
          />
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeKey]}
          items={[
            {
              key: '1',
              icon: <ApartmentOutlined />,
              label: '任务中心',
            },
          ]}
          onSelect={({ selectedKeys }) => setActiveKey(selectedKeys[0])}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
        </Header>
        <Content
          style={{
            margin: 16,
            // padding: 14,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8
          }}
        >
          {activeKey === '1' ? <TaskList /> : null}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;