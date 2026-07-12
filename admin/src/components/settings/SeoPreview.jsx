import React from 'react';

const SeoPreview = ({ title, url, description }) => {
  const displayTitle = title || 'Page Title';
  const displayUrl = url || 'nestinokids.com/...';
  const displayDesc = description || 'Page description will appear here...';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Search Preview</p>
      <div className="space-y-1">
        <p className="text-[18px] leading-snug text-[#1a0dab] font-normal truncate">
          {displayTitle}
        </p>
        <p className="text-[13px] text-[#006621] truncate">{displayUrl}</p>
        <p className="text-[13px] text-[#545454] leading-relaxed line-clamp-2">
          {displayDesc}
        </p>
      </div>
    </div>
  );
};

export default SeoPreview;
