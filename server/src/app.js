import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import envConfig from './config/envConfig.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// CORS must be applied before helmet so its headers are never overridden
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

if (envConfig.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'Face Recognition Attendance System API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api', routes);

app.use(errorHandler);

export default app;
