import { useEffect, useState } from 'react';
import { Table, Tag, DatePicker, Row, Col } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, PercentageOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import api from '../utils/api';
import type { AttendanceRecord, AttendanceSummary } from '../types';

const { RangePicker } = DatePicker;

const MyAttendance = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);

  const fetchData = async (from: Dayjs, to: Dayjs) => {
    setLoading(true);
    try {
      const params = { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') };
      const [historyRes, summaryRes] = await Promise.all([
        api.get('/attendance/me', { params }),
        api.get('/attendance/me/summary', { params }),
      ]);
      setRecords(historyRes.data);
      setSummary(summaryRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range[0], range[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (v: string) => dayjs(v).format('dddd, MMM D, YYYY') },
    { title: 'Check-in Time', dataIndex: 'checkInTime', render: (v: string) => dayjs(v).format('hh:mm A') },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: AttendanceRecord['status']) => <Tag className={`status-tag-${status}`}>{status.toUpperCase()}</Tag>,
    },
    {
      title: 'Marked By',
      dataIndex: 'markedBy',
      render: (v: string) => (v === 'face-recognition' ? 'Face Recognition' : 'Manual'),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <div>
          <div className="section-heading">My Attendance History</div>
          <div className="section-sub">Review your past check-ins and overall attendance rate</div>
        </div>
        <RangePicker
          value={range}
          onChange={(values) => {
            if (values && values[0] && values[1]) {
              const next: [Dayjs, Dayjs] = [values[0], values[1]];
              setRange(next);
              fetchData(next[0], next[1]);
            }
          }}
        />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-indigo">
              <PercentageOutlined />
            </div>
            <div>
              <div className="stat-value">{summary?.attendancePercentage ?? 0}%</div>
              <div className="stat-label">Attendance Rate</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
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
        <Col xs={24} sm={8}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-orange">
              <ClockCircleOutlined />
            </div>
            <div>
              <div className="stat-value">{summary?.late ?? 0}</div>
              <div className="stat-label">Days Late</div>
            </div>
          </div>
        </Col>
      </Row>

      <div className="surface-card">
        <Table rowKey="_id" columns={columns} dataSource={records} loading={loading} scroll={{ x: true }} />
      </div>
    </div>
  );
};

export default MyAttendance;
