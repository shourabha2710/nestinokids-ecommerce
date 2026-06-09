import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { announcementAPI } from '../api/endpoints';

const DISMISS_PREFIX = 'announcement_dismissed_';
const DISMISS_DAYS = 7;

const AnnouncementBar = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    announcementAPI.getAnnouncements().then((res) => {
      setAnnouncements(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const stored = {};
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(DISMISS_PREFIX)) {
        const expiry = parseInt(localStorage.getItem(key), 10);
        if (Date.now() < expiry) {
          stored[key.replace(DISMISS_PREFIX, '')] = true;
        } else {
          localStorage.removeItem(key);
        }
      }
    });
    setDismissed(new Set(Object.keys(stored)));
  }, [announcements]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const handleDismiss = useCallback((id) => {
    const expiry = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(`${DISMISS_PREFIX}${id}`, expiry.toString());
    setDismissed((prev) => new Set([...prev, String(id)]));
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(String(a.id)));

  if (visible.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-gold/90 to-amber-500 text-white text-center text-sm py-2 px-4 relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={visible[currentIndex % visible.length]?.id || 'empty'}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center gap-2"
        >
          {visible[currentIndex % visible.length]?.link ? (
            <a
              href={visible[currentIndex % visible.length].link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {visible[currentIndex % visible.length]?.message}
            </a>
          ) : (
            <span>{visible[currentIndex % visible.length]?.message}</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss(visible[currentIndex % visible.length].id);
            }}
            className="ml-2 p-0.5 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AnnouncementBar;
