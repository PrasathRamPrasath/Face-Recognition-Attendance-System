import { useEffect, useState } from 'react';
import { Form, Input, Button, message, Avatar, Row, Col, Tag, Progress } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api, { getAssetUrl } from '../utils/api';
import type { AttendanceSummary } from '../types';

interface ProfileFormValues {
  name: string;
  phone?: string;
  department?: string;
  password?: string;
}

const Profile = () => {
  const { user, refreshSession } = useAuth();
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const isMember = user?.role !== 'admin';

  useEffect(() => {
    if (!isMember) return;
    const from = dayjs().startOf('month').format('YYYY-MM-DD');
    api
      .get('/attendance/me/summary', { params: { from } })
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null));
  }, [isMember]);

  const onFinish = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const payload = { ...values };
      if (!payload.password) delete payload.password;
      const { data } = await api.put('/users/profile', payload);
      refreshSession(data);
      message.success('Profile updated');
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="page-wrap">
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <div className="surface-card" style={{ textAlign: 'center' }}>
            <Avatar size={96} src={getAssetUrl(user.photoUrl)} icon={<UserOutlined />} />
            <h3 style={{ marginTop: 16 }}>{user.name}</h3>
            <p className="section-sub">{user.email}</p>
            <Tag style={{ textTransform: 'capitalize' }}>{user.role}</Tag>
            {user.role !== 'admin' && (
              <div style={{ marginTop: 12 }}>
                <Tag className={user.isFaceEnrolled ? 'status-tag-present' : 'status-tag-absent'}>
                  {user.isFaceEnrolled ? 'FACE ENROLLED' : 'FACE NOT ENROLLED'}
                </Tag>
              </div>
            )}
          </div>
        </Col>
        <Col xs={24} md={16}>
          {isMember && summary && (
            <div className="surface-card">
              <div className="section-heading">Attendance Summary</div>
              <div className="section-sub" style={{ marginBottom: 16 }}>
                {dayjs().format('MMMM YYYY')} · {summary.workingDays} working days so far
              </div>
              <Row gutter={16} align="middle">
                <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
                  <Progress type="circle" size={88} percent={summary.attendancePercentage} />
                </Col>
                <Col xs={8} sm={6}>
                  <div className="stat-value">{summary.present}</div>
                  <div className="stat-label">Present</div>
                </Col>
                <Col xs={8} sm={6}>
                  <div className="stat-value">{summary.late}</div>
                  <div className="stat-label">Late</div>
                </Col>
                <Col xs={8} sm={6}>
                  <div className="stat-value">{summary.absent}</div>
                  <div className="stat-label">Absent</div>
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Link to="/my-attendance">View full attendance history →</Link>
              </div>
            </div>
          )}
          <div className="surface-card">
            <div className="section-heading">Edit Profile</div>
            <div className="section-sub" style={{ marginBottom: 20 }}>
              Update your personal information or change your password
            </div>
            <Form
              layout="vertical"
              initialValues={{ name: user.name, phone: user.phone, department: user.department }}
              onFinish={onFinish}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Phone" name="phone">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Department" name="department">
                <Input disabled={user.role === 'admin'} />
              </Form.Item>
              <Form.Item label="New Password" name="password" rules={[{ min: 6, message: 'At least 6 characters' }]}>
                <Input.Password placeholder="Leave blank to keep current password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>
                Save Changes
              </Button>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
