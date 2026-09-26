import { useEffect, useState } from 'react';
import { Row, Col, List, Tag, Empty, Spin, Avatar } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PercentageOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { getAssetUrl } from '../utils/api';
import { useAuth } from '../context/useAuth';
import type { AttendanceRecord, AttendanceSummary, TodayOverview } from '../types';

const StatusTag = ({ status }: { status: AttendanceRecord['status'] }) => (
  <Tag className={`status-tag-${status}`}>{status.toUpperCase()}</Tag>
);

const AdminDashboard = () => {
  const [overview, setOverview] = useState<TodayOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/attendance/today')
      .then(({ data }) => setOverview(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!overview) return null;

  const rate = overview.totalMembers === 0 ? 0 : Math.round((overview.presentCount / overview.totalMembers) * 100);

  return (
    <div className="page-wrap">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-indigo">
              <TeamOutlined />
            </div>
            <div>
              <div className="stat-value">{overview.totalMembers}</div>
              <div className="stat-label">Registered Members</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <CheckCircleOutlined />
            </div>
            <div>
              <div className="stat-value">{overview.presentCount}</div>
              <div className="stat-label">Present Today</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-red">
              <CloseCircleOutlined />
            </div>
            <div>
              <div className="stat-value">{overview.absentCount}</div>
              <div className="stat-label">Absent Today</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-orange">
              <PercentageOutlined />
            </div>
            <div>
              <div className="stat-value">{rate}%</div>
              <div className="stat-label">Today's Attendance Rate</div>
            </div>
          </div>
        </Col>
      </Row>

      <div className="surface-card">
        <div className="section-heading">Today's Activity</div>
        <div className="section-sub" style={{ marginBottom: 16 }}>
          Live feed of face-recognition check-ins for {dayjs().format('MMMM D, YYYY')}
        </div>
        {overview.records.length === 0 ? (
          <Empty description="No attendance marked yet today" />
        ) : (
          <List
            dataSource={[...overview.records].sort(
              (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
            )}
            renderItem={(record) => {
              const user = typeof record.user === 'object' ? record.user : null;
              return (
                <List.Item extra={<StatusTag status={record.status} />}>
                  <List.Item.Meta
                    title={user?.name || 'Unknown member'}
                    description={`${user?.department || '—'} · ${dayjs(record.checkInTime).format('hh:mm A')}`}
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>

      <div className="surface-card">
        <div className="section-heading">Absent Today ({overview.absentUsers.length})</div>
        <div className="section-sub" style={{ marginBottom: 16 }}>
          Active members who have not checked in yet
        </div>
        {overview.absentUsers.length === 0 ? (
          <Empty description="Everyone has checked in" />
        ) : (
          <List
            dataSource={overview.absentUsers}
            renderItem={(member) => (
              <List.Item
                extra={
                  member.isFaceEnrolled ? null : <Tag className="status-tag-late">FACE NOT ENROLLED</Tag>
                }
              >
                <List.Item.Meta
                  avatar={<Avatar src={getAssetUrl(member.photoUrl)} icon={<UserOutlined />} />}
                  title={member.name}
                  description={`${member.department || '—'}${member.memberId ? ` · ${member.memberId}` : ''}`}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};

const MemberDashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [recent, setRecent] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = dayjs().startOf('month').format('YYYY-MM-DD');
    Promise.all([
      api.get('/attendance/me/summary', { params: { from } }),
      api.get('/attendance/me'),
    ])
      .then(([summaryRes, historyRes]) => {
        setSummary(summaryRes.data);
        setRecent(historyRes.data.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  return (
    <div className="page-wrap">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-indigo">
              <PercentageOutlined />
            </div>
            <div>
              <div className="stat-value">{summary?.attendancePercentage ?? 0}%</div>
              <div className="stat-label">Attendance This Month</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <CheckCircleOutlined />
            </div>
            <div>
              <div className="stat-value">{summary?.present ?? 0}</div>
              <div className="stat-label">Days Present</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-orange">
              <CheckCircleOutlined />
            </div>
            <div>
              <div className="stat-value">{summary?.late ?? 0}</div>
              <div className="stat-label">Days Late</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-red">
              <TeamOutlined />
            </div>
            <div>
              <div className="stat-value">{user?.isFaceEnrolled ? 'Enrolled' : 'Pending'}</div>
              <div className="stat-label">Face Enrollment</div>
            </div>
          </div>
        </Col>
      </Row>

      <div className="surface-card">
        <div className="section-heading">Recent Attendance</div>
        <div className="section-sub" style={{ marginBottom: 16 }}>
          Your latest check-ins
        </div>
        {recent.length === 0 ? (
          <Empty description="No attendance records yet" />
        ) : (
          <List
            dataSource={recent}
            renderItem={(record) => (
              <List.Item extra={<StatusTag status={record.status} />}>
                <List.Item.Meta
                  title={dayjs(record.date).format('dddd, MMM D')}
                  description={`Checked in at ${dayjs(record.checkInTime).format('hh:mm A')}`}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboard /> : <MemberDashboard />;
};

export default Dashboard;
