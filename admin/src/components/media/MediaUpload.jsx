import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, AlertTriangle, CheckCircle } from 'lucide-react';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export default function MediaUpload({ onClose, onUploaded, saving }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const validateFile = (f) => {
    if (!ALLOWED.includes(f.type)) {
      setError('Invalid file type. Only JPG, PNG, and WebP are allowed.');
      return false;
    }
    if (f.size > MAX_SIZE) {
      setError('File is too large. Maximum size is 5MB.');
      return false;
    }
    return true;
  };

  const handleFile = useCallback((f) => {
    setError('');
    if (!f) return;
    if (!validateFile(f)) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUpload = async () => {
    if (!file || saving) return;
    try {
      await onUploaded(file);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Upload failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Upload Media</h3>
          <p className="text-sm text-gray-500 mt-0.5">Add new images</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        onDragOver={handleDrag}
        onDragEnter={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl cursor-pointer transition-all p-12 flex flex-col items-center justify-center text-center ${
          dragOver
            ? 'border-gold bg-gold/5'
            : file
            ? 'border-green-300 bg-green-50'
            : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {preview ? (
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-xl overflow-hidden bg-white">
              <img src={preview} alt="preview" className="w-full h-full object-contain" />
            </div>
            <p className="text-sm text-gray-700 mt-3 font-medium">{file.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              Drop your image here, or click to browse
            </p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP up to 5MB</p>
          </>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || saving}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all text-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <File className="w-4 h-4 animate-pulse" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
