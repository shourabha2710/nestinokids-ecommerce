export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error == null) return fallback;
  if (typeof error === 'string' && error.trim()) return error;

  const data = error?.response?.data ?? error?.data;

  if (data && typeof data === 'object') {
    const detail = data.detail;

    if (typeof detail === 'string' && detail.trim()) return detail;

    if (Array.isArray(detail)) {
      const parts = detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const loc = Array.isArray(item.loc) ? item.loc.join('.') : null;
            const msg = typeof item.msg === 'string' ? item.msg : item.message;
            return msg ? (loc ? `${loc}: ${msg}` : String(msg)) : null;
          }
          return null;
        })
        .filter(Boolean);
      if (parts.length) return parts.join('; ');
    }

    if (detail && typeof detail === 'object') {
      if (typeof detail.message === 'string' && detail.message.trim()) return detail.message;
      if (typeof detail.detail === 'string' && detail.detail.trim()) return detail.detail;
    }

    if (typeof detail === 'number' || typeof detail === 'boolean') return String(detail);
  }

  if (typeof error?.message === 'string' && error.message.trim()) return error.message;

  return fallback;
}
