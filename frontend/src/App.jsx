import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store/store';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import { setUser, logout } from './store/slices/authSlice';
import { authAPI } from './api/endpoints';
import './styles/globals.css';

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
        <AuthProvider>
          <Header />
          <main className="min-h-[calc(100vh-200px)]">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </main>
          <Footer />
        </AuthProvider>
      </Router>
    </Provider>
  );
}

export default App;
