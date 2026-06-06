import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const MobilePageHeader = ({ title, className = '' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className={`md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white ${className}`}>
      <button
        onClick={handleBack}
        className="p-1 -ml-1 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-text" />
      </button>
      <span className="font-semibold text-text text-base truncate">{title}</span>
    </div>
  );
};

export default MobilePageHeader;
