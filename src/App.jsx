import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { CartProvider } from '@/context/CartContext';

// Public auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Admin auth + guard
import AdminLogin from '@/pages/admin/AdminLogin';
import Unauthorized from '@/pages/admin/Unauthorized';
import AdminLayout from '@/components/admin/AdminLayout';

// Admin pages
import Dashboard from '@/pages/admin/Dashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminCustomers from '@/pages/admin/AdminCustomers';
import AdminCoupons from '@/pages/admin/AdminCoupons';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminContent from '@/pages/admin/AdminContent';
import AdminSettings from '@/pages/admin/AdminSettings';
import SalesLeads from '@/pages/admin/SalesLeads';
import BusinessManagement from '@/pages/admin/BusinessManagement';
import EcommerceAnalytics from '@/pages/admin/EcommerceAnalytics';

// Public store pages
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Catalog from '@/pages/Catalog';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Contact from '@/pages/Contact';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-4">אוצר הקדושה</h2>
          <div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin login — hidden URL */}
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/403" element={<Unauthorized />} />

      {/* Admin panel — protected, role=admin only */}
      <Route path="/secret-admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="sales-leads" element={<SalesLeads />} />
        <Route path="business" element={<BusinessManagement />} />
        <Route path="analytics" element={<EcommerceAnalytics />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Public store — accessible to all */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CartProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </CartProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
