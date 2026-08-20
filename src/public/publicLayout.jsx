import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/partials/header';
import Footer from '../components/partials/footer'
import './publicLayout.css';

export default function PublicLayout() {
  const scrollRef = useRef(null);
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="scrollbar-custom public" ref={scrollRef}>
      <Header />
        <div className={`content ${isHome ? 'content--home' : 'content--inner'}`}>
          <Outlet />
        </div>
      <Footer />
    </div>
  );
}