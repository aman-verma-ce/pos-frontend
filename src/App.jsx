import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import POSDashboard from './pages/POSDashboard';
import AdminLayout from './layouts/AdminLayout';
import AdminStats from './pages/admin/AdminStats';
import ImportWizard from './pages/admin/ImportWizard';
import ExportLogs from './pages/admin/ExportLogs';
import AdminResource from './pages/admin/AdminResource';
import StoreSettings from './pages/admin/StoreSettings';
import AdminAuthGuard from './pages/admin/AdminAuthGuard';
import { Toaster } from 'sonner';

function App() {
  return (
    <Router>
      <Toaster theme="dark" richColors />
      <Routes>
        {/* PUBLIC ROUTE: The Cashier Terminal */}
        <Route path="/pos" element={<POSDashboard />} />

        {/* SECURE ROUTES: The Enterprise Admin Panel */}
        {/* By wrapping the layout in AdminAuthGuard, it instantly protects 
          EVERY child route inside it. No need for manual state checks!
        */}
        <Route
          path="/admin"
          element={
            <AdminAuthGuard>
              <AdminLayout />
            </AdminAuthGuard>
          }
        >
          {/* Default redirect when hitting /admin */}
          <Route index element={<Navigate to="stats" replace />} />

          {/* Protected Sub-Pages */}
          <Route path="stats" element={<AdminStats />} />
          <Route path="import" element={<ImportWizard />} />
          <Route path="export" element={<ExportLogs />} />
          <Route path="resource" element={<AdminResource />} />
          <Route path="settings" element={<StoreSettings />} />
        </Route>

        {/* FALLBACK: Catch bad URLs and send them to the POS */}
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </Router>
  );
}

export default App;