import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, message, Space, Avatar } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ScanOutlined, UserOutlined } from '@ant-design/icons';
import api, { getAssetUrl } from '../utils/api';
import type { AuthUser } from '../types';
import FaceCaptureModal from '../components/FaceCaptureModal';

interface UserFormValues {
  name: string;
  email: string;
  password?: string;
  role: 'student' | 'employee';
  memberId?: string;
  department?: string;
  phone?: string;
}

const Users = () => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [faceModalUser, setFaceModalUser] = useState<AuthUser | null>(null);
  const [form] = Form.useForm<UserFormValues>();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (user: AuthUser) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      role: user.role as 'student' | 'employee',
      memberId: user.memberId,
      department: user.department,
      phone: user.phone,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: UserFormValues) => {
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, values);
        message.success('Member updated');
      } else {
        await api.post('/users', values);
        message.success('Member created — you can now enroll their face');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('Member removed');
      fetchUsers();
    } catch {
      message.error('Delete failed');
    }
  };

  const handleFaceCapture = async (descriptor: number[], photo: Blob | null) => {
    if (!faceModalUser) return;
    try {
      await api.put(`/users/${faceModalUser._id}/face`, { descriptor });
      if (photo) {
        const formData = new FormData();
        formData.append('photo', photo, 'face.jpg');
        await api.post(`/users/${faceModalUser._id}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      message.success(`Face enrolled for ${faceModalUser.name}`);
      setFaceModalUser(null);
      fetchUsers();
    } catch {
      message.error('Face enrollment failed');
    }
  };

  const columns = [
    {
      title: 'Member',
      dataIndex: 'name',
      render: (_: string, record: AuthUser) => (
        <Space>
          <Avatar src={getAssetUrl(record.photoUrl)} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    { title: 'Member ID', dataIndex: 'memberId', render: (v: string) => v || '—' },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role: string) => <Tag style={{ textTransform: 'capitalize' }}>{role}</Tag>,
    },
    { title: 'Department', dataIndex: 'department', render: (v: string) => v || '—' },
    {
      title: 'Face Status',
      dataIndex: 'isFaceEnrolled',
      render: (enrolled: boolean) =>
        enrolled ? <Tag className="status-tag-present">ENROLLED</Tag> : <Tag className="status-tag-absent">PENDING</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: AuthUser) => (
        <Space>
          <Button size="small" icon={<ScanOutlined />} onClick={() => setFaceModalUser(record)}>
            {record.isFaceEnrolled ? 'Re-enroll' : 'Enroll Face'}
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Popconfirm title="Remove this member?" onConfirm={() => handleDelete(record._id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <div>
          <div className="section-heading">Students &amp; Employees</div>
          <div className="section-sub">Manage registered members and their face enrollment</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Add Member
        </Button>
      </div>

      <div className="surface-card">
        <Table rowKey="_id" columns={columns} dataSource={users} loading={loading} scroll={{ x: true }} />
      </div>

      <Modal
        open={modalOpen}
        title={editingUser ? 'Edit Member' : 'Add Member'}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editingUser ? 'Save Changes' : 'Create Member'}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Enter a valid email' }]}
          >
            <Input />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              label="Initial Password"
              name="password"
              rules={[{ required: true, message: 'Password is required' }, { min: 6, message: 'At least 6 characters' }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Please select a role' }]}>
            <Select
              options={[
                { value: 'student', label: 'Student' },
                { value: 'employee', label: 'Employee' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Member ID" name="memberId">
            <Input placeholder="e.g. STU-2026-014" />
          </Form.Item>
          <Form.Item label="Department" name="department">
            <Input placeholder="e.g. Computer Science" />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <FaceCaptureModal
        open={!!faceModalUser}
        memberName={faceModalUser?.name || ''}
        onClose={() => setFaceModalUser(null)}
        onCapture={handleFaceCapture}
      />
    </div>
  );
};

export default Users;
