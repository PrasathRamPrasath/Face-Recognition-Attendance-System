import { useEffect, useRef, useState } from 'react';
import { Modal, Button, Alert, Spin } from 'antd';
import { CameraOutlined, CheckCircleFilled } from '@ant-design/icons';
import { loadFaceModels, detectFaceDescriptor, captureFrameAsBlob } from '../utils/faceApi';

interface FaceCaptureModalProps {
  open: boolean;
  memberName: string;
  onClose: () => void;
  onCapture: (descriptor: number[], photo: Blob | null) => Promise<void>;
}

const FaceCaptureModal = ({ open, memberName, onClose, onCapture }: FaceCaptureModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState<number[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError('');
    setFaceDetected(null);

    loadFaceModels()
      .then(() => {
        if (!cancelled) setModelsReady(true);
      })
      .catch(() => setError('Could not load face recognition models.'));

    navigator.mediaDevices
      .getUserMedia({ video: { width: 480, height: 360 } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => setError('Camera access was denied. Please allow camera permissions.'));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !modelsReady) return;

    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      const result = await detectFaceDescriptor(videoRef.current);
      setFaceDetected(result ? result.descriptor : null);
    }, 600);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [open, modelsReady]);

  const handleCapture = async () => {
    if (!faceDetected || !videoRef.current) return;
    setSubmitting(true);
    try {
      const blob = await captureFrameAsBlob(videoRef.current);
      await onCapture(faceDetected, blob);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} title={`Enroll Face — ${memberName}`} destroyOnHidden centered>
      <div className="page-wrap">
        {error && <Alert type="error" showIcon message={error} />}
        <div className="camera-frame">
          <video ref={videoRef} autoPlay muted playsInline />
          {!modelsReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin tip="Loading recognition models..." />
            </div>
          )}
          <div className="camera-overlay-ring" />
        </div>

        <Alert
          type={faceDetected ? 'success' : 'warning'}
          showIcon
          icon={faceDetected ? <CheckCircleFilled /> : undefined}
          message={faceDetected ? 'Face detected — ready to capture' : 'Position the face clearly inside the frame'}
        />

        <Button
          type="primary"
          icon={<CameraOutlined />}
          size="large"
          block
          disabled={!faceDetected}
          loading={submitting}
          onClick={handleCapture}
        >
          Capture &amp; Save Face
        </Button>
      </div>
    </Modal>
  );
};

export default FaceCaptureModal;
