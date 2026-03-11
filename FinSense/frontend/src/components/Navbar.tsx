import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white dark:bg-dark-bg-sidebar border-b border-gray-200 dark:border-dark-border-subtle shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              Fin<span className="text-accent-lime">Sense</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/dashboard"
                className="text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/transactions"
                className="text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
              >
                Transactions
              </Link>
              <Link
                to="/predictions"
                className="text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
              >
                Predictions
              </Link>
              <Link
                to="/upload"
                className="text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
              >
                Upload
              </Link>

              {/* User Menu */}
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-gray-300 dark:border-dark-border-subtle">
                <ThemeToggle />
                <span className="text-sm text-gray-700 dark:text-dark-text-secondary">
                  {user?.firstName || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-gray-200 dark:bg-dark-bg-tertiary hover:bg-gray-300 dark:hover:bg-dark-border-focus text-gray-800 dark:text-dark-text-primary px-4 py-2 rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div className="hidden md:flex items-center space-x-4">
              <ThemeToggle />
              <Link
                to="/login"
                className="text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-accent-lime hover:brightness-110 text-dark-bg-primary px-4 py-2 rounded font-semibold transition-all"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700 dark:text-dark-text-primary"
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
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-dark-border-subtle">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/transactions"
                  className="block py-2 text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Transactions
                </Link>
                <Link
                  to="/predictions"
                  className="block py-2 text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Predictions
                </Link>
                <Link
                  to="/upload"
                  className="block py-2 text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Upload
                </Link>
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-dark-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{user?.firstName || user?.email}</p>
                    <ThemeToggle />
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-200 dark:bg-dark-bg-tertiary hover:bg-gray-300 dark:hover:bg-dark-border-focus text-gray-800 dark:text-dark-text-primary px-4 py-2 rounded transition-colors w-full"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block py-2 text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-accent-lime transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Register
                </Link>
                <div className="pt-4 mt-4">
                  <ThemeToggle />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
