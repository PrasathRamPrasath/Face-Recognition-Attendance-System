import express from 'express';
const router = express.Router();
import attendanceController from '../controllers/attendanceController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const {
  markAttendance,
  getMyAttendance,
  getMySummary,
  getAllAttendance,
  getTodayOverview,
  getStats,
  updateAttendance,
  deleteAttendance,
} = attendanceController;

router.post('/mark', protect, markAttendance);
router.get('/me', protect, getMyAttendance);
router.get('/me/summary', protect, getMySummary);

router.get('/today', protect, adminOnly, getTodayOverview);
router.get('/stats', protect, adminOnly, getStats);
router.get('/', protect, adminOnly, getAllAttendance);

router.route('/:id').put(protect, adminOnly, updateAttendance).delete(protect, adminOnly, deleteAttendance);

export default router;
