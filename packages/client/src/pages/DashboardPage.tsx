import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GET_USER_MANUSCRIPTS } from '../graphql/queries';
import LoadingSpinner from '../components/Common/LoadingSpinner';

interface Manuscript {
  id: string;
  title: string;
  genre: string;
  wordCount: number;
  progress: number;
  updatedAt: string;
}

const DashboardPage: React.FC = () => {
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title' | 'progress'>('updatedAt');
  const { data, loading, error } = useQuery(GET_USER_MANUSCRIPTS);

  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error loading manuscripts</div>;

  const manuscripts: Manuscript[] = data?.manuscripts || [];

  const sortedManuscripts = [...manuscripts].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'progress':
        return b.progress - a.progress;
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Manuscripts</h1>
        <Link
          to="/editor"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          New Manuscript
        </Link>
      </div>

      <div className="mb-6 flex justify-end">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'updatedAt' | 'title' | 'progress')}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2"
        >
          <option value="updatedAt">Last Updated</option>
          <option value="title">Title</option>
          <option value="progress">Progress</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedManuscripts.map((manuscript) => (
          <motion.div
            key={manuscript.id}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <Link to={`/editor/${manuscript.id}`} className="block">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {manuscript.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{manuscript.genre}</p>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {manuscript.wordCount.toLocaleString()} words
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {new Date(manuscript.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                      Progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                      {Math.round(manuscript.progress)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200 dark:bg-gray-700">
                  <div
                    style={{ width: `${manuscript.progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
                  />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {manuscripts.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl text-gray-600 dark:text-gray-400 mb-4">No manuscripts yet</h3>
          <Link
            to="/editor"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Create your first manuscript
          </Link>
        </div>
      )}
    </motion.div>
  );
};

export default DashboardPage;