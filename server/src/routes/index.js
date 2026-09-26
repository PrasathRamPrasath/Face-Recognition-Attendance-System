import express from 'express';
const router = express.Router();

import userRoutes from './userRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import notificationRoutes from './notificationRoutes.js';

router.use('/users', userRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/notifications', notificationRoutes);

export default router;
