import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import MarkAttendance from './pages/MarkAttendance';
import MyAttendance from './pages/MyAttendance';
import AttendanceRecords from './pages/AttendanceRecords';
import Profile from './pages/Profile';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mark-attendance" element={<MarkAttendance />} />
        <Route path="/profile" element={<Profile />} />

        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance-records"
          element={
            <ProtectedRoute adminOnly>
              <AttendanceRecords />
            </ProtectedRoute>
          }
        />
        <Route path="/my-attendance" element={<MyAttendance />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
