import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import QuickReplies from './pages/QuickReplies';
import FollowUpKit from './pages/FollowUpKit';
import Leads from './pages/Leads';
import Packages from './pages/Packages';
import Billing from './pages/Billing';
import Invoices from './pages/Invoices';
import DailyReports from './pages/DailyReports';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/authStore';
import useAutoRefresh from './hooks/useAutoRefresh';

export default function App() {
  const { token, refreshUser } = useAuthStore();

  useEffect(() => {
    if (token) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Permissions are enforced live by the server but cached in the client, so
  // without this the nav and buttons keep showing what the user could do when
  // the page was opened. Re-read them periodically, on tab focus, and as soon
  // as the server turns an action down.
  useAutoRefresh(() => {
    if (useAuthStore.getState().token) refreshUser();
  }, 60000);

  useEffect(() => {
    function onForbidden() {
      if (useAuthStore.getState().token) refreshUser();
    }
    window.addEventListener('anara:forbidden', onForbidden);
    return () => window.removeEventListener('anara:forbidden', onForbidden);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Route
            path="/quick-replies"
            element={
              <ProtectedRoute permission="quick_replies.view">
                <QuickReplies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/follow-up-kit"
            element={
              <ProtectedRoute permission="follow_up.view">
                <FollowUpKit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute permission="leads.view">
                <Leads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/packages"
            element={
              <ProtectedRoute permission="packages.view">
                <Packages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily-report"
            element={
              <ProtectedRoute permission="leads.view">
                <DailyReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute permission="billing.view">
                <Invoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute permission="billing.view">
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute permission="analytics.view">
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
