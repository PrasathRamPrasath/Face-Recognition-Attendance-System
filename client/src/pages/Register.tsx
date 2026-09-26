import { useState } from 'react';
import { Form, Input, Button, message, Alert } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { ScanFace } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import '../styles/auth.css';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  adminCode: string;
}

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: RegisterFormValues) => {
    setSubmitting(true);
    try {
      await register(values);
      message.success('Administrator account created!');
      navigate('/dashboard');
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <ScanFace size={22} />
          <span>AttendX</span>
        </div>
        <h2 className="auth-title">Create administrator account</h2>
        <p className="auth-subtitle">Students and employees are added by an admin afterwards</p>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20, borderRadius: 10 }}
          message="You'll need the admin registration code provided by your organization."
        />

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Please enter your name' }]}>
            <Input prefix={<UserOutlined />} placeholder="Jane Doe" size="large" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Enter a valid email' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter a password' }, { min: 6, message: 'At least 6 characters' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
          </Form.Item>
          <Form.Item
            label="Admin Registration Code"
            name="adminCode"
            rules={[{ required: true, message: 'Please enter the admin registration code' }]}
          >
            <Input.Password prefix={<SafetyCertificateOutlined />} placeholder="Invite code" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="auth-submit" loading={submitting}>
            Create Account
          </Button>
        </Form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
