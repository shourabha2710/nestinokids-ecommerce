import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from './useDebounce';
import { ADMIN_COMMANDS } from '../constants/adminCommands';
import { searchApi } from '../services/searchApi';
import { saveRecentCommand } from '../utils/recentCommands';

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableTarget(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useCommandPalette() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const debouncedQuery = useDebounce(query, 300);

  const fetchResults = useCallback(async (q) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    if (q.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await searchApi.globalSearch(q);
      if (!controller.signal.aborted) {
        setResults(res.data.results);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        setResults(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchResults(debouncedQuery);
    }
  }, [debouncedQuery, fetchResults, isOpen]);

  const items = useMemo(() => {
    if (query.length >= 2 && results) {
      const flat = [];
      for (const [, categoryItems] of Object.entries(results)) {
        flat.push(...categoryItems);
      }
      return flat;
    }
    return ADMIN_COMMANDS;
  }, [query, results]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setResults(null);
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    setSelectedIndex(0);
    inputRef.current?.blur();
  }, []);

  const handleSelect = useCallback((item) => {
    const isResult = item.type !== undefined;
    if (isResult) {
      searchApi.trackSearch(query, 1);
    }
    saveRecentCommand(item);
    close();
    navigate(item.url);
  }, [close, navigate, query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else if (!isEditableTarget(e.target)) {
          open();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open, close]);

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        handleSelect(items[selectedIndex]);
      }
    }
  }, [items, selectedIndex, handleSelect]);

  const handleInputChange = useCallback((e) => {
    setQuery(e.target.value);
  }, []);

  return {
    isOpen,
    query,
    results,
    isLoading,
    selectedIndex,
    items,
    inputRef,
    handleInputChange,
    handleInputKeyDown,
    handleSelect,
    close,
  };
}
