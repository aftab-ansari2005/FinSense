import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-primary-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold">FinSense</span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/dashboard"
                className="hover:text-primary-200 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/transactions"
                className="hover:text-primary-200 transition-colors"
              >
                Transactions
              </Link>
              <Link
                to="/predictions"
                className="hover:text-primary-200 transition-colors"
              >
                Predictions
              </Link>
              <Link
                to="/upload"
                className="hover:text-primary-200 transition-colors"
              >
                Upload
              </Link>

              {/* User Menu */}
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-primary-500">
                <span className="text-sm">
                  {user?.firstName || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/login"
                className="hover:text-primary-200 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded transition-colors"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-primary-500">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 hover:text-primary-200 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/transactions"
                  className="block py-2 hover:text-primary-200 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Transactions
                </Link>
                <Link
                  to="/predictions"
                  className="block py-2 hover:text-primary-200 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Predictions
                </Link>
                <Link
                  to="/upload"
                  className="block py-2 hover:text-primary-200 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Upload
                </Link>
                <div className="pt-4 mt-4 border-t border-primary-500">
                  <p className="text-sm mb-2">{user?.firstName || user?.email}</p>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 hover:text-primary-200 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block py-2 hover:text-primary-200 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
