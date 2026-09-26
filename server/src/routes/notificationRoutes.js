import express from 'express';
const router = express.Router();
import notificationController from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const { getMyNotifications, markRead, markAllRead, clearAll } = notificationController;

router.route('/').get(protect, getMyNotifications).delete(protect, clearAll);
router.put('/read-all', protect, markAllRead);
router.put('/:id/read', protect, markRead);

export default router;
