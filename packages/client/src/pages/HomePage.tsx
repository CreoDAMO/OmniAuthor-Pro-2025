import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HomePage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600"
    >
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <motion.h1
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-5xl font-bold text-white mb-6"
          >
            Welcome to OmniAuthor Pro
          </motion.h1>
          <motion.p
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white/90 mb-12 max-w-2xl mx-auto"
          >
            The next generation writing platform powered by AI and blockchain technology.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-white"
            >
              <i className="fas fa-robot text-3xl mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">AI Assistant</h3>
              <p>Get intelligent writing suggestions and real-time analysis.</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-white"
            >
              <i className="fas fa-link text-3xl mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">Blockchain Rights</h3>
              <p>Secure your intellectual property with blockchain technology.</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-white"
            >
              <i className="fas fa-users text-3xl mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">Collaboration</h3>
              <p>Work together in real-time with advanced collaboration tools.</p>
            </motion.div>
          </div>

          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HomePage;
