import { useEffect, useState } from 'react';
import { Tabs, Table, Tag, DatePicker, Select, Popconfirm, Button, message, Progress, Space, Segmented, Row, Col } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  PercentageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import api from '../utils/api';
import { downloadCsv } from '../utils/csv';
import type { AttendanceRecord, StatsMemberRow, StatsResponse } from '../types';

dayjs.extend(isoWeek);

const { RangePicker } = DatePicker;

const RecordsTab = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (range) {
        params.from = range[0].format('YYYY-MM-DD');
        params.to = range[1].format('YYYY-MM-DD');
      }
      if (status) params.status = status;
      const { data } = await api.get('/attendance', { params });
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, status]);

  const handleStatusChange = async (id: string, value: AttendanceRecord['status']) => {
    try {
      await api.put(`/attendance/${id}`, { status: value });
      message.success('Attendance updated');
      fetchRecords();
    } catch {
      message.error('Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/attendance/${id}`);
      message.success('Record removed');
      fetchRecords();
    } catch {
      message.error('Delete failed');
    }
  };

  const columns = [
    {
      title: 'Member',
      dataIndex: 'user',
      render: (user: AttendanceRecord['user']) => (typeof user === 'object' ? user.name : '—'),
    },
    {
      title: 'Department',
      dataIndex: 'user',
      render: (user: AttendanceRecord['user']) => (typeof user === 'object' ? user.department || '—' : '—'),
    },
    { title: 'Date', dataIndex: 'date', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
    { title: 'Check-in', dataIndex: 'checkInTime', render: (v: string) => dayjs(v).format('hh:mm A') },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value: AttendanceRecord['status'], record: AttendanceRecord) => (
        <Select
          size="small"
          value={value}
          style={{ width: 110 }}
          onChange={(v) => handleStatusChange(record._id, v)}
          options={[
            { value: 'present', label: 'Present' },
            { value: 'late', label: 'Late' },
            { value: 'absent', label: 'Absent' },
          ]}
        />
      ),
    },
    {
      title: 'Marked By',
      dataIndex: 'markedBy',
      render: (v: string) => <Tag>{v === 'face-recognition' ? 'Face Recognition' : 'Manual'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: AttendanceRecord) => (
        <Popconfirm title="Remove this record?" onConfirm={() => handleDelete(record._id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <Space wrap>
          <RangePicker value={range} onChange={(v) => setRange(v && v[0] && v[1] ? [v[0], v[1]] : null)} />
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: 160 }}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'present', label: 'Present' },
              { value: 'late', label: 'Late' },
              { value: 'absent', label: 'Absent' },
            ]}
          />
        </Space>
      </div>
      <div className="surface-card">
        <Table rowKey="_id" columns={columns} dataSource={records} loading={loading} scroll={{ x: true }} />
      </div>
    </div>
  );
};

type Preset = 'today' | 'week' | 'month' | 'custom';

const getPresetRange = (preset: Exclude<Preset, 'custom'>): [Dayjs, Dayjs] => {
  const today = dayjs();
  if (preset === 'today') return [today, today];
  if (preset === 'week') return [today.startOf('isoWeek'), today];
  return [today.startOf('month'), today];
};

const ReportsTab = () => {
  const [preset, setPreset] = useState<Preset>('month');
  const [range, setRange] = useState<[Dayjs, Dayjs]>(getPresetRange('month'));
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/attendance/stats', {
        params: { from: range[0].format('YYYY-MM-DD'), to: range[1].format('YYYY-MM-DD') },
      })
      .then(({ data }) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => message.error('Failed to load report'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const handlePreset = (value: Preset) => {
    setPreset(value);
    if (value !== 'custom') setRange(getPresetRange(value));
  };

  const periodLabel = `${range[0].format('YYYY-MM-DD')}_to_${range[1].format('YYYY-MM-DD')}`;

  const exportCsv = () => {
    if (!stats) return;
    downloadCsv(
      `attendance-report_${periodLabel}.csv`,
      ['Name', 'Member ID', 'Department', 'Present', 'Late', 'Absent', 'Working Days', 'Attendance %'],
      stats.perUser.map((row) => [
        row.user.name,
        row.user.memberId || '',
        row.user.department || '',
        row.present,
        row.late,
        row.absent,
        stats.workingDays,
        row.percentage,
      ])
    );
  };

  const dailyColumns = [
    { title: 'Date', dataIndex: 'date', render: (v: string) => dayjs(v).format('ddd, MMM D, YYYY') },
    {
      title: 'Check-ins',
      dataIndex: 'count',
      render: (count: number) => (
        <Progress
          percent={stats?.totalMembers ? Math.round((count / stats.totalMembers) * 100) : 0}
          format={() => `${count} / ${stats?.totalMembers ?? 0}`}
        />
      ),
    },
  ];

  const perUserColumns = [
    {
      title: 'Member',
      dataIndex: 'user',
      render: (user: StatsMemberRow['user']) => user.name,
      sorter: (a: StatsMemberRow, b: StatsMemberRow) => a.user.name.localeCompare(b.user.name),
    },
    { title: 'Department', dataIndex: 'user', render: (user: StatsMemberRow['user']) => user.department || '—' },
    { title: 'Present', dataIndex: 'present', sorter: (a: StatsMemberRow, b: StatsMemberRow) => a.present - b.present },
    { title: 'Late', dataIndex: 'late', sorter: (a: StatsMemberRow, b: StatsMemberRow) => a.late - b.late },
    { title: 'Absent', dataIndex: 'absent', sorter: (a: StatsMemberRow, b: StatsMemberRow) => a.absent - b.absent },
    {
      title: 'Attendance %',
      dataIndex: 'percentage',
      sorter: (a: StatsMemberRow, b: StatsMemberRow) => a.percentage - b.percentage,
      render: (percentage: number) => <Progress percent={percentage} />,
    },
  ];

  const summaryCards = [
    { label: 'Attendance Rate', value: `${stats?.summary.percentage ?? 0}%`, icon: <PercentageOutlined />, tone: 'indigo' },
    { label: 'Present', value: stats?.summary.present ?? 0, icon: <CheckCircleOutlined />, tone: 'green' },
    { label: 'Late', value: stats?.summary.late ?? 0, icon: <ClockCircleOutlined />, tone: 'orange' },
    { label: 'Absent', value: stats?.summary.absent ?? 0, icon: <CloseCircleOutlined />, tone: 'red' },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <Space wrap>
          <Segmented
            value={preset}
            onChange={(v) => handlePreset(v as Preset)}
            options={[
              { value: 'today', label: 'Daily' },
              { value: 'week', label: 'Weekly' },
              { value: 'month', label: 'Monthly' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          {preset === 'custom' && (
            <RangePicker
              value={range}
              onChange={(v) => {
                if (v && v[0] && v[1]) setRange([v[0], v[1]]);
              }}
            />
          )}
        </Space>
        <Button icon={<DownloadOutlined />} onClick={exportCsv} disabled={!stats || stats.perUser.length === 0}>
          Export CSV
        </Button>
      </div>
      <div className="section-sub">
        {range[0].format('MMM D, YYYY')} – {range[1].format('MMM D, YYYY')} · {stats?.workingDays ?? 0} working days
        (Mon–Fri) · {stats?.totalMembers ?? 0} active members
      </div>

      <Row gutter={[16, 16]}>
        {summaryCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.label}>
            <div className="stat-card">
              <div className={`stat-icon stat-icon-${card.tone}`}>{card.icon}</div>
              <div>
                <div className="stat-value">{card.value}</div>
                <div className="stat-label">{card.label}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <div className="surface-card">
        <div className="section-heading">Daily Check-ins</div>
        <Table rowKey="date" columns={dailyColumns} dataSource={stats?.daily || []} loading={loading} pagination={false} />
      </div>

      <div className="surface-card">
        <div className="section-heading">Per-Member Attendance</div>
        <Table
          rowKey={(record) => record.user._id}
          columns={perUserColumns}
          dataSource={stats?.perUser || []}
          loading={loading}
          scroll={{ x: true }}
        />
      </div>
    </div>
  );
};

const AttendanceRecords = () => {
  return (
    <Tabs
      defaultActiveKey="records"
      items={[
        { key: 'records', label: 'Records', children: <RecordsTab /> },
        { key: 'reports', label: 'Reports', children: <ReportsTab /> },
      ]}
    />
  );
};

export default AttendanceRecords;
