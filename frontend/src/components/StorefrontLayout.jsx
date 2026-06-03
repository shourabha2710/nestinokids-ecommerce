import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const StorefrontLayout = () => {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-200px)]">
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default StorefrontLayout;
