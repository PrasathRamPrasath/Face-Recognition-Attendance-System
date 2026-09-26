import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import { findBestMatch } from '../utils/faceMatch.js';
import { notifyUser, notifyAdminsRecognitionFailed } from '../utils/notify.js';

const startOfDay = (input) => {
  const d = input ? new Date(input) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (input) => {
  const d = input ? new Date(input) : new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const pad = (n) => String(n).padStart(2, '0');

// Local calendar date (YYYY-MM-DD); toISOString() would shift the day for non-UTC servers.
const localDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Working days are Monday to Friday. The range is capped at today so future days never count as absences.
const getWorkingDayKeys = (from, to) => {
  const keys = [];
  const cursor = startOfDay(from);
  const last = new Date(Math.min(endOfDay(to).getTime(), endOfDay().getTime()));
  while (cursor <= last) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

const percentage = (part, total) => (total === 0 ? 0 : Math.min(Math.round((part / total) * 100), 100));

// @desc    Mark attendance from a face descriptor captured in the browser
// @route   POST /api/attendance/mark
// @access  Private
const markAttendance = async (req, res) => {
  try {
    const { descriptor } = req.body;

    const enrolledUsers = await User.find({ isFaceEnrolled: true, status: 'active' });
    const match = findBestMatch(descriptor, enrolledUsers);

    if (!match) {
      notifyAdminsRecognitionFailed();
      return res.status(404).json({ message: 'Face not recognized. Please try again or contact an admin.' });
    }

    const today = startOfDay();
    const existing = await Attendance.findOne({ user: match.user._id, date: today });

    if (existing) {
      return res.status(200).json({
        alreadyMarked: true,
        message: `Attendance already marked for ${match.user.name} today`,
        user: match.user.toSafeObject(),
        attendance: existing,
      });
    }

    const now = new Date();
    const isLate = now.getHours() >= 10;

    const attendance = await Attendance.create({
      user: match.user._id,
      date: today,
      checkInTime: now,
      status: isLate ? 'late' : 'present',
      distance: match.distance,
      markedBy: 'face-recognition',
    });

    await notifyUser(match.user._id, {
      type: 'attendance-marked',
      title: isLate ? 'Attendance marked (late)' : 'Attendance marked',
      message: `You were checked in at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} on ${localDateKey(now)}.`,
    });

    res.status(201).json({
      alreadyMarked: false,
      message: `Attendance marked for ${match.user.name}`,
      user: match.user.toSafeObject(),
      attendance,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    My own attendance history
// @route   GET /api/attendance/me
// @access  Private
const getMyAttendance = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { user: req.user._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    }

    const records = await Attendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    My own attendance summary
// @route   GET /api/attendance/me/summary
// @access  Private
const getMySummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { user: req.user._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    }

    const records = await Attendance.find(filter);
    const present = records.filter((r) => r.status === 'present').length;
    const late = records.filter((r) => r.status === 'late').length;
    const totalMarked = records.length;

    // Percentage is measured against working days since the later of the range start and account creation.
    const rangeStart = from ? startOfDay(from) : new Date(req.user.createdAt);
    const start = rangeStart > new Date(req.user.createdAt) ? rangeStart : new Date(req.user.createdAt);
    const workingDayKeys = new Set(getWorkingDayKeys(start, to || new Date()));
    const workingDays = workingDayKeys.size;
    // Weekend check-ins are recorded but do not count toward the working-day percentage.
    const attended = records.filter(
      (r) => r.status !== 'absent' && workingDayKeys.has(localDateKey(r.date))
    ).length;

    res.json({
      totalMarked,
      present,
      late,
      workingDays,
      absent: Math.max(workingDays - attended, 0),
      attendancePercentage: percentage(attended, workingDays),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    All attendance records (filterable)
// @route   GET /api/attendance
// @access  Private/Admin
const getAllAttendance = async (req, res) => {
  try {
    const { from, to, user, status, department } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    }
    if (user) filter.user = user;
    if (status) filter.status = status;

    let query = Attendance.find(filter).populate('user', 'name email memberId department role').sort({ date: -1 });
    let records = await query;

    if (department) {
      records = records.filter((r) => r.user && r.user.department === department);
    }

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Today's overview for the admin dashboard
// @route   GET /api/attendance/today
// @access  Private/Admin
const getTodayOverview = async (req, res) => {
  try {
    const today = startOfDay();
    const members = await User.find({ role: { $ne: 'admin' }, status: 'active' }).sort({ name: 1 });
    const todayRecords = await Attendance.find({ date: today }).populate('user', 'name email memberId department');

    const attended = todayRecords.filter((r) => r.status === 'present' || r.status === 'late');
    const attendedIds = new Set(attended.map((r) => r.user?._id.toString()));
    const absentUsers = members.filter((m) => !attendedIds.has(m._id.toString())).map((m) => m.toSafeObject());

    res.json({
      totalMembers: members.length,
      presentCount: attended.length,
      absentCount: absentUsers.length,
      absentUsers,
      records: todayRecords,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Attendance analytics for reports
// @route   GET /api/attendance/stats
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    const now = new Date();
    const from = req.query.from ? startOfDay(req.query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = req.query.to ? endOfDay(req.query.to) : endOfDay();

    const members = await User.find({ role: { $ne: 'admin' }, status: 'active' }).sort({ name: 1 });
    const records = await Attendance.find({ date: { $gte: from, $lte: to } });

    const workingDayKeys = getWorkingDayKeys(from, to);
    const workingDays = workingDayKeys.length;

    const workingDaySet = new Set(workingDayKeys);
    const dailyMap = new Map(workingDayKeys.map((key) => [key, 0]));
    const memberMap = new Map(
      members.map((m) => [m._id.toString(), { user: m.toSafeObject(), present: 0, late: 0, onWorkingDays: 0 }])
    );

    for (const record of records) {
      if (record.status === 'absent') continue;

      const dateKey = localDateKey(record.date);
      // A weekend check-in still shows up in the daily list, just outside the working-day totals.
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);

      const entry = memberMap.get(record.user.toString());
      if (!entry) continue;
      entry[record.status === 'late' ? 'late' : 'present'] += 1;
      if (workingDaySet.has(dateKey)) entry.onWorkingDays += 1;
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const perUser = Array.from(memberMap.values()).map((entry) => ({
      user: entry.user,
      present: entry.present,
      late: entry.late,
      absent: Math.max(workingDays - entry.onWorkingDays, 0),
      total: entry.present + entry.late,
      percentage: percentage(entry.onWorkingDays, workingDays),
    }));

    const attendedOnWorkingDays = Array.from(memberMap.values()).reduce((sum, e) => sum + e.onWorkingDays, 0);
    const expected = members.length * workingDays;

    res.json({
      totalMembers: members.length,
      workingDays,
      summary: {
        present: perUser.reduce((sum, u) => sum + u.present, 0),
        late: perUser.reduce((sum, u) => sum + u.late, 0),
        absent: Math.max(expected - attendedOnWorkingDays, 0),
        percentage: percentage(attendedOnWorkingDays, expected),
      },
      daily,
      perUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Manually correct an attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Admin
const updateAttendance = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (status) attendance.status = status;
    if (notes !== undefined) attendance.notes = notes;
    attendance.markedBy = 'manual';

    const updated = await attendance.save();

    await notifyUser(attendance.user, {
      type: 'attendance-updated',
      title: 'Attendance record updated',
      message: `An admin updated your attendance for ${localDateKey(attendance.date)} to "${attendance.status}".`,
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an attendance record
// @route   DELETE /api/attendance/:id
// @access  Private/Admin
const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance record removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  markAttendance,
  getMyAttendance,
  getMySummary,
  getAllAttendance,
  getTodayOverview,
  getStats,
  updateAttendance,
  deleteAttendance,
};
