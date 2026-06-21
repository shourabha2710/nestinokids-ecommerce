import React from 'react';

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          NestinoKids Admin Dashboard
        </h1>
        <p className="text-xl text-green-600 font-semibold">
          Bootstrap Successful
        </p>
        <p className="text-gray-400 mt-4">
          Standalone admin application is running on port 3001.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
