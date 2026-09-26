export type UserRole = 'admin' | 'employee' | 'student';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  memberId?: string;
  department?: string;
  phone?: string;
  photoUrl?: string;
  isFaceEnrolled?: boolean;
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export interface AttendanceRecord {
  _id: string;
  user: string | AuthUser;
  date: string;
  checkInTime: string;
  status: 'present' | 'late' | 'absent';
  distance?: number;
  markedBy: 'face-recognition' | 'manual';
  notes?: string;
  createdAt?: string;
}

export interface AttendanceSummary {
  totalMarked: number;
  present: number;
  late: number;
  absent: number;
  workingDays: number;
  attendancePercentage: number;
}

export interface TodayOverview {
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  absentUsers: AuthUser[];
  records: AttendanceRecord[];
}

export interface StatsMemberRow {
  user: AuthUser;
  present: number;
  late: number;
  absent: number;
  total: number;
  percentage: number;
}

export interface StatsResponse {
  totalMembers: number;
  workingDays: number;
  summary: { present: number; late: number; absent: number; percentage: number };
  daily: { date: string; count: number }[];
  perUser: StatsMemberRow[];
}

export interface NotificationItem {
  _id: string;
  type: 'attendance-marked' | 'attendance-updated' | 'recognition-failed';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
