import React from 'react';
import { useParams } from 'react-router-dom';

const CollaborationPage: React.FC = () => {
  const { manuscriptId } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Collaboration
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manuscript ID: {manuscriptId}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Document</h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg min-h-96">
              <p className="text-gray-600 dark:text-gray-400">
                Collaborative editing area would be here...
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Active Collaborators</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                  JD
                </div>
                <div>
                  <div className="font-medium">John Doe</div>
                  <div className="text-sm text-gray-500">Editor</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Comments</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <div className="text-sm font-medium mb-1">Sarah Wilson</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Great opening paragraph! Consider adding more detail about the setting.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationPage;