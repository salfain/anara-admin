import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import QuickReplies from './pages/QuickReplies';
import FollowUpKit from './pages/FollowUpKit';
import Leads from './pages/Leads';
import Packages from './pages/Packages';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/quick-replies" element={<QuickReplies />} />
          <Route path="/follow-up-kit" element={<FollowUpKit />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/packages" element={<Packages />} />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute adminOnly>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
