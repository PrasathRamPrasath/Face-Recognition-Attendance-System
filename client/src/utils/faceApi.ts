import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export const loadFaceModels = (): Promise<void> => {
  if (modelsLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => {
    modelsLoaded = true;
  });

  return loadingPromise;
};

export const areModelsLoaded = (): boolean => modelsLoaded;

export const detectFaceDescriptor = async (
  input: HTMLVideoElement
): Promise<{ descriptor: number[]; box: faceapi.Box } | null> => {
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    descriptor: Array.from(detection.descriptor),
    box: detection.detection.box,
  };
};

export const captureFrameAsBlob = (video: HTMLVideoElement): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9));
};
