import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/store';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import './styles/globals.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Header />
        <main className="min-h-[calc(100vh-200px)]">
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Additional routes will be added here */}
          </Routes>
        </main>
        <Footer />
      </Router>
    </Provider>
  );
}

export default App;
