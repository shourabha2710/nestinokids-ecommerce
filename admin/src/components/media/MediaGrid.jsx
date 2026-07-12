import React from 'react';
import { motion } from 'framer-motion';
import MediaCard from './MediaCard';

export default function MediaGrid({ items, imgErrors, setImgErrors, onEdit, onDelete, showToast }) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((media, index) => (
        <MediaCard
          key={media.id}
          media={media}
          index={index}
          imgErrors={imgErrors}
          setImgErrors={setImgErrors}
          onEdit={onEdit}
          onDelete={onDelete}
          showToast={showToast}
        />
      ))}
    </div>
  );
}
