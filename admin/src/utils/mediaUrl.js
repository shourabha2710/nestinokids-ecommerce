export const getMediaUrl = (value) => {
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8001';
  const apiUrl = new URL(baseUrl);
  const origin = `${apiUrl.protocol}//${apiUrl.host}`;
  const normalizedPath = value.startsWith('/') ? value : `/${value}`;

  return `${origin}${normalizedPath}`;
};
