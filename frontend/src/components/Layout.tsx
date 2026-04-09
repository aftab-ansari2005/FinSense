import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout: React.FC = () => {
  return (
    <div className="wood-desk" style={{ fontFamily: "'Lato', sans-serif", minHeight: '100vh' }}>
      <Navbar />
      {/* Content sits directly on the wood — no white paper wrapper */}
      <div style={{ padding: '28px 28px 60px', position: 'relative', zIndex: 1, maxWidth: '1140px', margin: '0 auto' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
