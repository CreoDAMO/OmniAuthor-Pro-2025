import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

import { GET_MANUSCRIPT } from '../graphql/queries';
import MainEditor from '../components/Editor/MainEditor';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const EditorPage: React.FC = () => {
  const { manuscriptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);

  const { data, loading, error } = useQuery(GET_MANUSCRIPT, {
    variables: { id: manuscriptId },
    skip: !manuscriptId,
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load manuscript');
      navigate('/dashboard');
    }
  }, [error, navigate]);

  useEffect(() => {
    if (!loading && data) {
      setIsLoading(false);
    }
  }, [loading, data]);

  if (!manuscriptId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Manuscript Selected</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen bg-gray-50 dark:bg-gray-900"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {data?.manuscript?.title || 'Untitled Manuscript'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data?.manuscript?.genre || 'No genre specified'}
            </p>
          </header>

          <MainEditor manuscriptId={manuscriptId} />
        </div>
      </div>
    </motion.div>
  );
};

export default EditorPage;
