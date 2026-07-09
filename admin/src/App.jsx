import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import { Permissions } from './constants/permissions';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import AccessDenied from './pages/AccessDenied';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProductList from './pages/admin/AdminProductList';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminCategoryList from './pages/admin/AdminCategoryList';
import AdminCategoryForm from './pages/admin/AdminCategoryForm';
import AdminInventoryList from './pages/admin/AdminInventoryList';
import AdminOrderList from './pages/admin/AdminOrderList';
import Coupons from './pages/admin/Coupons';
import Reviews from './pages/admin/Reviews';
import AdminBannerList from './pages/admin/AdminBannerList';
import HeroSlides from './pages/admin/HeroSlides';
import AdminInstagramFeed from './pages/admin/AdminInstagramFeed';
import AdminNotifications from './pages/admin/AdminNotifications';
import SupportTickets from './pages/admin/SupportTickets';
import FAQs from './pages/admin/FAQs';
import Announcements from './pages/admin/Announcements';
import WebsiteSettings from './pages/admin/WebsiteSettings';
import AdminActivityLogs from './pages/admin/AdminActivityLogs';
import AdminReports from './pages/admin/AdminReports';
import AdminStaff from './pages/admin/AdminStaff';
import AdminSettings from './pages/admin/AdminSettings';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={
            <PermissionRoute permission={Permissions.PRODUCT_VIEW}>
              <AdminProductList />
            </PermissionRoute>
          } />
          <Route path="products/new" element={
            <PermissionRoute permission={Permissions.PRODUCT_CREATE}>
              <AdminProductForm />
            </PermissionRoute>
          } />
          <Route path="products/:id/edit" element={
            <PermissionRoute permission={Permissions.PRODUCT_UPDATE}>
              <AdminProductForm />
            </PermissionRoute>
          } />
          <Route path="categories" element={<AdminCategoryList />} />
          <Route path="categories/new" element={<AdminCategoryForm />} />
          <Route path="categories/:id/edit" element={<AdminCategoryForm />} />
          <Route path="inventory" element={
            <PermissionRoute permission={Permissions.INVENTORY_VIEW}>
              <AdminInventoryList />
            </PermissionRoute>
          } />
          <Route path="orders" element={
            <PermissionRoute permission={Permissions.ORDER_VIEW}>
              <AdminOrderList />
            </PermissionRoute>
          } />
          <Route path="coupons" element={<Coupons />} />
          <Route path="banners" element={<AdminBannerList />} />
          <Route path="hero-slides" element={<HeroSlides />} />
          <Route path="instagram" element={<AdminInstagramFeed />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="support-tickets" element={
            <PermissionRoute permission={Permissions.SUPPORT_VIEW}>
              <SupportTickets />
            </PermissionRoute>
          } />
          <Route path="faqs" element={<FAQs />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="settings" element={
            <PermissionRoute permission={Permissions.SETTINGS_MANAGE}>
              <AdminSettings />
            </PermissionRoute>
          } />
          <Route path="reports" element={
            <PermissionRoute permission={Permissions.REPORT_VIEW}>
              <AdminReports />
            </PermissionRoute>
          } />
          <Route path="activity-logs" element={
            <PermissionRoute permission={Permissions.AUDIT_VIEW}>
              <AdminActivityLogs />
            </PermissionRoute>
          } />
          <Route path="staff" element={
            <PermissionRoute permission={Permissions.USER_VIEW}>
              <AdminStaff />
            </PermissionRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
