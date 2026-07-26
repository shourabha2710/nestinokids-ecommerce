import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import AnnouncementBar from './AnnouncementBar';
import WhatsAppButton from './WhatsAppButton';
import PromotionRibbon from './promotions/PromotionRibbon';
import { fetchActivePromotions } from '../store/slices/promotionsSlice';
import { useSelector } from 'react-redux';

const StorefrontLayout = () => {
  const dispatch = useDispatch();
  const promotions = useSelector((state) => state.promotions.items);

  useEffect(() => {
    dispatch(fetchActivePromotions());
  }, [dispatch]);

  return (
    <>
      <AnnouncementBar />
      <PromotionRibbon promotions={promotions} />
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
