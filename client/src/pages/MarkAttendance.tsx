import { useEffect, useRef, useState } from 'react';
import { Button, Alert, Spin, notification, List, Avatar, Tag } from 'antd';
import { CameraOutlined, PauseCircleOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { getAssetUrl } from '../utils/api';
import { loadFaceModels, detectFaceDescriptor } from '../utils/faceApi';
import type { AuthUser } from '../types';

interface RecognitionEvent {
  id: string;
  user: AuthUser;
  time: string;
  status: 'present' | 'late';
  alreadyMarked: boolean;
}

const SCAN_INTERVAL_MS = 1000;
const COOLDOWN_MS = 4000;

const MarkAttendance = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [statusText, setStatusText] = useState('Camera is off');
  const [error, setError] = useState('');
  const [events, setEvents] = useState<RecognitionEvent[]>([]);

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setError('Could not load face recognition models.'));
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const startScanning = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanning(true);
      setStatusText('Scanning for a face…');
    } catch {
      setError('Camera access was denied. Please allow camera permissions and try again.');
    }
  };

  const stopScanning = () => {
    stopCamera();
    setScanning(false);
    setStatusText('Camera is off');
  };

  useEffect(() => {
    if (!scanning || !modelsReady) return;

    intervalRef.current = window.setInterval(async () => {
      if (busyRef.current || !videoRef.current || videoRef.current.readyState < 2) return;

      const result = await detectFaceDescriptor(videoRef.current);
      if (!result) {
        setStatusText('Scanning for a face…');
        return;
      }

      busyRef.current = true;
      setStatusText('Face detected — verifying identity…');

      try {
        const { data } = await api.post('/attendance/mark', { descriptor: result.descriptor });
        const user: AuthUser = data.user;
        notification.success({
          message: data.alreadyMarked ? 'Already Checked In' : 'Attendance Marked',
          description: data.message,
          placement: 'topRight',
        });
        setEvents((prev) => [
          {
            id: `${Date.now()}`,
            user,
            time: new Date().toISOString(),
            status: data.attendance?.status || 'present',
            alreadyMarked: data.alreadyMarked,
          },
          ...prev,
        ].slice(0, 8));
        setStatusText(`Welcome, ${user.name}!`);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Face not recognized';
        notification.warning({ message: 'Recognition Failed', description: msg, placement: 'topRight' });
        setStatusText('Face not recognized — ask an admin to enroll you');
      } finally {
        setTimeout(() => {
          busyRef.current = false;
          setStatusText('Scanning for a face…');
        }, COOLDOWN_MS);
      }
    }, SCAN_INTERVAL_MS);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [scanning, modelsReady]);

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="page-wrap">
      <div className="section-heading">Face Recognition Check-In</div>
      <div className="section-sub">Stand in front of the camera to mark your attendance automatically</div>

      {error && <Alert type="error" showIcon message={error} />}

      <div className="surface-card" style={{ textAlign: 'center' }}>
        <div className="camera-frame">
          <video ref={videoRef} autoPlay muted playsInline />
          {!scanning && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                background: 'rgba(15,15,35,0.55)',
              }}
            >
              <CameraOutlined style={{ fontSize: 42 }} />
            </div>
          )}
          {scanning && !modelsReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin tip="Loading models..." />
            </div>
          )}
          {scanning && <div className="camera-overlay-ring" />}
        </div>

        <p style={{ marginTop: 16, fontWeight: 600, color: 'var(--text-heading)' }}>{statusText}</p>

        {!scanning ? (
          <Button type="primary" size="large" icon={<CameraOutlined />} onClick={startScanning}>
            Start Recognition
          </Button>
        ) : (
          <Button danger size="large" icon={<PauseCircleOutlined />} onClick={stopScanning}>
            Stop Camera
          </Button>
        )}
      </div>

      <div className="surface-card">
        <div className="section-heading">Recent Check-ins This Session</div>
        {events.length === 0 ? (
          <p className="section-sub" style={{ marginTop: 12 }}>
            No one has checked in yet in this session.
          </p>
        ) : (
          <List
            dataSource={events}
            renderItem={(event) => (
              <List.Item
                extra={
                  <Tag className={event.alreadyMarked ? 'status-tag-late' : `status-tag-${event.status}`}>
                    {event.alreadyMarked ? 'ALREADY MARKED' : event.status.toUpperCase()}
                  </Tag>
                }
              >
                <List.Item.Meta
                  avatar={<Avatar src={getAssetUrl(event.user.photoUrl)} icon={<UserOutlined />} />}
                  title={event.user.name}
                  description={dayjs(event.time).format('hh:mm:ss A')}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default MarkAttendance;
