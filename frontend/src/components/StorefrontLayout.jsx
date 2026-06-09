import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import AnnouncementBar from './AnnouncementBar';
import WhatsAppButton from './WhatsAppButton';

const StorefrontLayout = () => {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <CartDrawer />
      <main className="min-h-[calc(100vh-200px)]">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
};

export default StorefrontLayout;
