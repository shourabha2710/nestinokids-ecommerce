import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-8">
          You do not have permission to access this page.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;
