import { useMemo, useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ScanOutlined,
  HistoryOutlined,
  BarChartOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ScanFace } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from '../context/useAuth';

const { Sider, Header, Content } = Layout;

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'Manage Users',
  '/mark-attendance': 'Mark Attendance',
  '/my-attendance': 'My Attendance',
  '/attendance-records': 'Attendance Records',
  '/profile': 'My Profile',
};

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const menuItems = useMemo(() => {
    const base = [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
      ...(isAdmin ? [{ key: '/users', icon: <TeamOutlined />, label: 'Manage Users' }] : []),
      { key: '/mark-attendance', icon: <ScanOutlined />, label: 'Mark Attendance' },
      ...(isAdmin
        ? [{ key: '/attendance-records', icon: <BarChartOutlined />, label: 'Attendance Records' }]
        : [{ key: '/my-attendance', icon: <HistoryOutlined />, label: 'My Attendance' }]),
      { key: '/profile', icon: <IdcardOutlined />, label: 'My Profile' },
    ];
    return base;
  }, [isAdmin]);

  const currentTitle = PAGE_TITLES[location.pathname] || 'Attendance System';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={230}
        className="app-sider"
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
      >
        <div className="app-logo">
          <ScanFace size={26} strokeWidth={2} />
          {!collapsed && <span>AttendX</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="app-menu"
        />
      </Sider>
      <Layout className="app-main" style={{ marginLeft: collapsed ? 80 : 230 }}>
        <Header className="app-header">
          <Navbar title={currentTitle} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
