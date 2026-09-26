import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Empty, List, Popover } from 'antd';
import { BellOutlined, CheckCircleOutlined, EditOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../utils/api';
import type { NotificationItem } from '../types';

dayjs.extend(relativeTime);

const POLL_INTERVAL_MS = 30000;

const ICONS: Record<NotificationItem['type'], React.ReactNode> = {
  'attendance-marked': <CheckCircleOutlined style={{ color: '#16a34a' }} />,
  'attendance-updated': <EditOutlined style={{ color: '#4f46e5' }} />,
  'recognition-failed': <WarningOutlined style={{ color: '#dc2626' }} />,
};

const NotificationBell = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      // Polling failures are silent; the bell just keeps its last state.
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const markRead = async (item: NotificationItem) => {
    if (item.read) return;
    setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(c - 1, 0));
    await api.put(`/notifications/${item._id}/read`).catch(load);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await api.put('/notifications/read-all').catch(load);
  };

  const clearAll = async () => {
    setItems([]);
    setUnread(0);
    await api.delete('/notifications').catch(load);
  };

  const content = (
    <div className="notif-panel">
      <div className="notif-actions">
        <Button type="link" size="small" onClick={markAllRead} disabled={unread === 0}>
          Mark all read
        </Button>
        <Button type="link" size="small" danger onClick={clearAll} disabled={items.length === 0}>
          Clear all
        </Button>
      </div>
      {items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications" />
      ) : (
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              className={`notif-item${item.read ? '' : ' notif-unread'}`}
              onClick={() => markRead(item)}
            >
              <List.Item.Meta
                avatar={ICONS[item.type]}
                title={item.title}
                description={
                  <>
                    <div>{item.message}</div>
                    <div className="notif-time">{dayjs(item.createdAt).fromNow()}</div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title="Notifications"
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <button className="collapse-btn" type="button" aria-label="Notifications">
        <Badge count={unread} size="small" overflowCount={99}>
          <BellOutlined style={{ fontSize: 18 }} />
        </Badge>
      </button>
    </Popover>
  );
};

export default NotificationBell;
