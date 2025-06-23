import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  toggleTheme: () => void;
  'data-testid'?: string;
}

const Header: React.FC<HeaderProps> = ({ toggleTheme, 'data-testid': testId = 'header' }) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <header
      className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center"
      data-testid={testId}
    >
      <Link to="/dashboard" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        OmniAuthor Pro
      </Link>
      <nav className="flex space-x-4">
        {user && (
          <Fragment>
            <Link
              to="/dashboard"
              className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              data-testid="nav-dashboard"
            >
              Dashboard
            </Link>
            <Link
              to="/editor"
              className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              data-testid="nav-editor"
            >
              Editor
            </Link>
            <Link
              to="/subscription"
              className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              data-testid="nav-subscription"
            >
              Subscription
            </Link>
          </Fragment>
        )}
        <motion.button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          data-testid="theme-toggle-btn"
        >
          {theme === 'light' ? (
            <MoonIcon className="h-6 w-6" />
          ) : (
            <SunIcon className="h-6 w-6" />
          )}
        </motion.button>
      </nav>
    </header>
  );
};

export default Header;