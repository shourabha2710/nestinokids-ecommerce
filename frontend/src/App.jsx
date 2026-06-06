import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./store/store";
import ScrollToTop from "./components/ScrollToTop";
import StorefrontLayout from "./components/StorefrontLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderListPage from "./pages/OrderListPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import AddressListPage from "./pages/AddressListPage";
import WishlistPage from "./pages/WishlistPage";
import ProfilePage from "./pages/ProfilePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductsListingPage from "./pages/ProductsListingPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import CategoryListPage from "./pages/CategoryListPage";
import AboutUsPage from "./pages/AboutUsPage";
import ContactUsPage from "./pages/ContactUsPage";
import FAQPage from "./pages/FAQPage";
import ShippingPolicyPage from "./pages/ShippingPolicyPage";
import ReturnPolicyPage from "./pages/ReturnPolicyPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";
import AdminLayout from "./components/admin/AdminLayout";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProductList from "./pages/admin/AdminProductList";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminCategoryList from "./pages/admin/AdminCategoryList";
import AdminCategoryForm from "./pages/admin/AdminCategoryForm";
import AdminInventoryList from "./pages/admin/AdminInventoryList";
import AdminBannerList from "./pages/admin/AdminBannerList";
import AdminInstagramFeed from "./pages/admin/AdminInstagramFeed";
import AdminOrderList from "./pages/admin/AdminOrderList";
import { setUser, logout } from "./store/slices/authSlice";
import { setCartItems } from "./store/slices/cartSlice";
import { setWishlist } from "./store/slices/wishlistSlice";
import { authAPI, shoppingAPI } from "./api/endpoints";
import "./styles/globals.css";

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      if (token) {
        try {
          const res = await authAPI.getCurrentUser();
          dispatch(setUser(res.data));
          const [cartRes, wishlistRes] = await Promise.all([
            shoppingAPI.getCart(),
            shoppingAPI.getWishlist(),
          ]);
          dispatch(setCartItems(cartRes.data));
          dispatch(setWishlist(wishlistRes.data));
        } catch {
          dispatch(logout());
        }
      }
      setAuthReady(true);
    };

    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authReady) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return children;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route element={<StorefrontLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/products" element={<ProductsListingPage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/categories" element={<CategoryListPage />} />
              <Route path="/bestsellers" element={<ProductsListingPage filter="featured" />} />
              <Route path="/new-arrivals" element={<ProductsListingPage sort="newest" />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/contact" element={<ContactUsPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
              <Route path="/return-policy" element={<ReturnPolicyPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><OrderListPage /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
              <Route path="/addresses" element={<ProtectedRoute><AddressListPage /></ProtectedRoute>} />
              <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            </Route>

            <Route path="/admin/login" element={<AdminLoginPage />} />

            <Route element={<ProtectedAdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/products" element={<AdminProductList />} />
                <Route path="/admin/products/new" element={<AdminProductForm />} />
                <Route path="/admin/products/:id/edit" element={<AdminProductForm />} />
                <Route path="/admin/categories" element={<AdminCategoryList />} />
                <Route path="/admin/categories/new" element={<AdminCategoryForm />} />
                <Route path="/admin/categories/:id/edit" element={<AdminCategoryForm />} />
                <Route path="/admin/inventory" element={<AdminInventoryList />} />
                <Route path="/admin/banners" element={<AdminBannerList />} />
                <Route path="/admin/instagram" element={<AdminInstagramFeed />} />
                <Route path="/admin/orders" element={<AdminOrderList />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </Provider>
  );
}

export default App;
