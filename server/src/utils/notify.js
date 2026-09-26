import Notification from '../models/Notification.js';
import User from '../models/User.js';

const FAILED_DEDUPE_MS = 60 * 1000;

// Notifications are best-effort: a failure here must never break attendance marking.
const notifyUser = async (userId, { type, title, message }) => {
  try {
    await Notification.create({ user: userId, type, title, message });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

// Alert every admin about a failed scan. Repeated failures within a minute are
// collapsed into one alert so a camera left running does not flood the inbox.
const notifyAdminsRecognitionFailed = async () => {
  try {
    const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
    const since = new Date(Date.now() - FAILED_DEDUPE_MS);

    await Promise.all(
      admins.map(async (admin) => {
        const recent = await Notification.exists({
          user: admin._id,
          type: 'recognition-failed',
          createdAt: { $gte: since },
        });
        if (recent) return;
        await Notification.create({
          user: admin._id,
          type: 'recognition-failed',
          title: 'Face not recognized',
          message: 'A face was scanned at the attendance camera but did not match any enrolled member.',
        });
      })
    );
  } catch (error) {
    console.error('Failed to notify admins:', error.message);
  }
};

export { notifyUser, notifyAdminsRecognitionFailed };
