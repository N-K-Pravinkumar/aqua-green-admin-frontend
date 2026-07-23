import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './services/AuthContext';
import { AdminRoute } from './components/ProtectedRoute';

// Auth — eagerly loaded (needed immediately on entry)
import LoginPage from './pages/LoginPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/AuthPages';

// Admin layout — eagerly loaded (shell needed before any admin page)
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';

// Admin pages — lazily loaded (only fetched when the user navigates there)
const AdminLeads           = lazy(() => import('./pages/admin/AdminLeads'));
const AdminEnquiries       = lazy(() => import('./pages/admin/AdminEnquiries'));
const AdminCustomers       = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminProducts        = lazy(() => import('./pages/admin/AdminProducts'));
const AdminServiceItems    = lazy(() => import('./pages/admin/AdminServiceItems'));
const AdminServiceRequests = lazy(() => import('./pages/admin/AdminServiceRequests'));
const AdminMaintenance = lazy(() => import('./pages/admin/AdminMaintenance'));
const AdminSalesPage       = lazy(() => import('./pages/admin/AdminSales').then(m => ({ default: m.AdminSales })));
const AdminReports         = lazy(() => import('./pages/admin/AdminReports'));
const AdminTemplates       = lazy(() => import('./pages/admin/AdminTemplates'));
const AdminCommunication   = lazy(() => import('./pages/admin/AdminCommunication'));
const AdminGallery         = lazy(() => import('./pages/admin/AdminGallery'));
const AdminUsers           = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSms             = lazy(() => import('./pages/admin/AdminSms'));
const AdminBilling         = lazy(() => import('./pages/admin/AdminBilling'));
const AdminImport          = lazy(() => import('./pages/admin/AdminImport'));
const AdminCommsHub        = lazy(() => import('./pages/admin/AdminCommsHub'));
// Named exports from AdminModules
const AdminQuotations  = lazy(() => import('./pages/admin/AdminModules').then(m => ({ default: m.AdminQuotations })));
const AdminStock       = lazy(() => import('./pages/admin/AdminModules').then(m => ({ default: m.AdminStock })));
const AdminEmployees   = lazy(() => import('./pages/admin/AdminModules').then(m => ({ default: m.AdminEmployees })));
const AdminBlogs       = lazy(() => import('./pages/admin/AdminModules').then(m => ({ default: m.AdminBlogs })));

function AdminFallback() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9aa0a6', fontSize: 14 }}>
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root redirects straight into the admin login/dashboard */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* Auth pages */}
          <Route path="/admin/login"     element={<LoginPage />} />
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />

          {/* Admin portal — lazy pages wrapped in Suspense */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="leads"            element={<Suspense fallback={<AdminFallback />}><AdminLeads /></Suspense>} />
            <Route path="enquiries"        element={<Suspense fallback={<AdminFallback />}><AdminEnquiries /></Suspense>} />
            <Route path="customers"        element={<Suspense fallback={<AdminFallback />}><AdminCustomers /></Suspense>} />
            <Route path="products"         element={<Suspense fallback={<AdminFallback />}><AdminProducts /></Suspense>} />
            <Route path="service-items"    element={<Suspense fallback={<AdminFallback />}><AdminServiceItems /></Suspense>} />
            <Route path="service-requests" element={<Suspense fallback={<AdminFallback />}><AdminServiceRequests /></Suspense>} />
            <Route path="maintenance" element={<Suspense fallback={<AdminFallback />}><AdminMaintenance /></Suspense>} />
            <Route path="sales"            element={<Suspense fallback={<AdminFallback />}><AdminSalesPage /></Suspense>} />
            <Route path="quotations"       element={<Suspense fallback={<AdminFallback />}><AdminQuotations /></Suspense>} />
            <Route path="stock"            element={<Suspense fallback={<AdminFallback />}><AdminStock /></Suspense>} />
            <Route path="employees"        element={<Suspense fallback={<AdminFallback />}><AdminEmployees /></Suspense>} />
            <Route path="users"            element={<Suspense fallback={<AdminFallback />}><AdminUsers /></Suspense>} />
            <Route path="blogs"            element={<Suspense fallback={<AdminFallback />}><AdminBlogs /></Suspense>} />
            <Route path="reports"          element={<Suspense fallback={<AdminFallback />}><AdminReports /></Suspense>} />
            <Route path="templates"        element={<Suspense fallback={<AdminFallback />}><AdminTemplates /></Suspense>} />
            <Route path="communication"    element={<Suspense fallback={<AdminFallback />}><AdminCommunication /></Suspense>} />
            <Route path="gallery"          element={<Suspense fallback={<AdminFallback />}><AdminGallery /></Suspense>} />
            <Route path="sms"              element={<Suspense fallback={<AdminFallback />}><AdminSms /></Suspense>} />
            <Route path="billing"          element={<Suspense fallback={<AdminFallback />}><AdminBilling /></Suspense>} />
            <Route path="comms-hub"        element={<Suspense fallback={<AdminFallback />}><AdminCommsHub /></Suspense>} />
            <Route path="import"           element={<Suspense fallback={<AdminFallback />}><AdminImport /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
