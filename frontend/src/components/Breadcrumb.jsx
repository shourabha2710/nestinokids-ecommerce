import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = ({ items, className = '' }) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  return (
    <nav className={`flex items-center text-sm text-text-muted flex-wrap gap-1 ${className}`}>
      <button onClick={() => navigate('/')} className="hover:text-gold transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Home</span>
      </button>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3.5 h-3.5 mx-1 flex-shrink-0" />
          {index === items.length - 1 ? (
            <span className="text-text font-medium truncate max-w-[200px]">{item.label}</span>
          ) : item.path ? (
            <button
              onClick={() => navigate(item.path)}
              className="hover:text-gold transition-colors truncate max-w-[180px] flex-shrink-0"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-text truncate max-w-[200px]">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
