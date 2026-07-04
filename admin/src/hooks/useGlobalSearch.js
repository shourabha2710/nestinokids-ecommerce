import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from './useDebounce';
import { searchApi } from '../services/searchApi';

export function useGlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const mobileContainerRef = useRef(null);
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
    setSearchError(false);
    try {
      const res = await searchApi.globalSearch(q);
      if (!controller.signal.aborted) {
        setResults(res.data.results);
        setIsOpen(true);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        setResults(null);
        setSearchError(true);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchResults(debouncedQuery);
  }, [debouncedQuery, fetchResults]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [results]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setMobileOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inDesktop = containerRef.current?.contains(e.target);
      const inMobile = mobileContainerRef.current?.contains(e.target);
      if (!inDesktop && !inMobile) {
        setIsOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((item) => {
    setIsOpen(false);
    setMobileOpen(false);
    setQuery('');
    setResults(null);
    navigate(item.url);
  }, [navigate]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen || !results) return;

    const flatResults = Object.values(results).reduce((acc, items) => acc.concat(items), []);
    const totalItems = flatResults.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < totalItems) {
      e.preventDefault();
      handleSelect(flatResults[highlightedIndex]);
    }
  }, [isOpen, results, highlightedIndex, handleSelect]);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    setSearchError(false);
    if (value.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setResults(null);
    }
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleFocus = useCallback(() => {
    if (results && query.length >= 2) {
      setIsOpen(true);
    }
  }, [results, query]);

  const openMobile = useCallback(() => {
    setMobileOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setIsOpen(false);
    setQuery('');
    setResults(null);
  }, []);

  return {
    query,
    results,
    isLoading,
    isOpen,
    mobileOpen,
    searchError,
    highlightedIndex,
    inputRef,
    containerRef,
    mobileContainerRef,
    handleInputChange,
    handleClear,
    handleFocus,
    handleSelect,
    handleKeyDown,
    openMobile,
    closeMobile,
  };
}
