import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout: React.FC = () => {
  return (
    <div className="wood-desk" style={{ fontFamily: "'Lato', sans-serif" }}>
      <Navbar />

      {/* Wooden desk surface — content area */}
      <div style={{ position: 'relative', zIndex: 1, padding: '32px 16px 60px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;

