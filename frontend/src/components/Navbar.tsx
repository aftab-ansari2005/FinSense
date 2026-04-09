import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkStyle = (path: string): React.CSSProperties => ({
    fontFamily: "'Lato', sans-serif",
    fontWeight: isActive(path) ? 700 : 400,
    color: isActive(path) ? '#3a6b3a' : '#3a2e22',
    textDecoration: 'none',
    fontSize: '15px',
    paddingBottom: '4px',
    borderBottom: isActive(path) ? '3px solid #7dae0e' : '3px solid transparent',
    transition: 'all 0.18s ease',
    letterSpacing: '0.01em',
  });

  return (
    <nav className="navbar-paper" style={{ position: 'relative', zIndex: 50 }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>

          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 900,
              fontSize: '24px',
              color: '#1e1610',
              letterSpacing: '-0.5px',
            }}>
              Fin<span style={{ color: '#5a9a10' }}>Sense</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          {isAuthenticated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px', position: 'relative' }}>
              <Link to="/dashboard" style={navLinkStyle('/dashboard')}>Dashboard</Link>
              <Link to="/transactions" style={navLinkStyle('/transactions')}>Transactions</Link>
              <Link to="/predictions" style={navLinkStyle('/predictions')}>Predictions</Link>
              <Link to="/upload" style={navLinkStyle('/upload')}>Upload</Link>

              <div style={{ width: '1px', height: '28px', background: 'rgba(140,100,50,0.2)' }} />
              <span style={{ fontSize: '18px', opacity: 0.6 }}>☀</span>

              <span
                onClick={() => setShowProfile(!showProfile)}
                style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: '#7a6652', cursor: 'pointer' }}
              >
                {user?.email || user?.firstName || 'User'}
              </span>

              <button
                onClick={handleLogout}
                style={{
                  fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '13px',
                  color: '#3a2e22',
                  background: 'linear-gradient(180deg, #f0e8d4, #e4d8be)',
                  border: '1.5px solid rgba(140,100,50,0.4)',
                  borderBottom: '3px solid rgba(120,80,30,0.35)',
                  borderRadius: '20px', padding: '6px 18px',
                  cursor: 'pointer', boxShadow: '0 2px 6px rgba(60,35,10,0.15)',
                  transition: 'all 0.15s ease', letterSpacing: '0.02em',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(180deg, #faf0e6, #ece4ca)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(180deg, #f0e8d4, #e4d8be)')}
              >
                Logout
              </button>

              {/* Profile card */}
              {showProfile && (
                <div style={{
                  position: 'absolute', top: '56px', right: 0,
                  background: 'linear-gradient(160deg, #f8f2e5, #ede4ce)',
                  border: '1px solid rgba(180,140,80,0.35)',
                  borderRadius: '4px',
                  boxShadow: '3px 4px 14px rgba(60,35,10,0.35)',
                  padding: '16px 20px', minWidth: '200px', zIndex: 100,
                }}>
                  <div style={{
                    position: 'absolute', top: '-8px', left: '50%',
                    transform: 'translateX(-50%)', width: '24px', height: '8px',
                    background: 'linear-gradient(90deg, #c8c8c8, #e8e8e8, #a8a8a8)',
                    borderRadius: '4px 4px 0 0',
                  }} />
                  <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '14px', color: '#1e1610', marginBottom: '4px' }}>User Profile</p>
                  <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: '#7a6652' }}>{user?.email}</p>
                </div>
              )}
            </div>
          )}

          {!isAuthenticated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link to="/login" style={navLinkStyle('/login')}>Login</Link>
              <Link
                to="/register"
                style={{
                  fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '14px',
                  color: '#fff', textDecoration: 'none',
                  background: 'linear-gradient(180deg, #9ac414, #7dae0e)',
                  border: 'none', borderBottom: '3px solid #5a8a04',
                  borderRadius: '20px', padding: '7px 20px',
                  boxShadow: '0 2px 8px rgba(80,120,0,0.3)',
                }}
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#3a2e22', display: 'none' }}
            className="mobile-menu-btn"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div style={{ padding: '12px 0 20px', borderTop: '1px solid rgba(140,100,50,0.2)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" style={navLinkStyle('/dashboard')} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                <Link to="/transactions" style={navLinkStyle('/transactions')} onClick={() => setIsMobileMenuOpen(false)}>Transactions</Link>
                <Link to="/predictions" style={navLinkStyle('/predictions')} onClick={() => setIsMobileMenuOpen(false)}>Predictions</Link>
                <Link to="/upload" style={navLinkStyle('/upload')} onClick={() => setIsMobileMenuOpen(false)}>Upload</Link>
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: "'Lato', sans-serif", color: '#7a6652' }}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" style={navLinkStyle('/login')} onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                <Link to="/register" style={navLinkStyle('/register')} onClick={() => setIsMobileMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
