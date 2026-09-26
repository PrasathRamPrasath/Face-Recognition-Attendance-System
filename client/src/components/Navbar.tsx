import { Avatar, Dropdown, type MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined, IdcardOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getAssetUrl } from '../utils/api';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
}

const Navbar = ({ title, collapsed, onToggle }: NavbarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'My Profile',
      icon: <IdcardOutlined />,
      onClick: () => navigate('/profile'),
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <div className="app-header-inner">
      <div className="app-header-left">
        <button className="collapse-btn" onClick={onToggle} aria-label="Toggle sidebar" type="button">
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="app-header-right">
        <NotificationBell />
        <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
          <div className="user-chip">
            <Avatar src={getAssetUrl(user?.photoUrl)} icon={<UserOutlined />} />
            <div className="user-chip-text">
              <span className="user-chip-name">{user?.name}</span>
              <span className="user-chip-role">{user?.role}</span>
            </div>
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default Navbar;
