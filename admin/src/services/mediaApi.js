import api from './api';

export const mediaApi = {
  getMedia: (params) => api.get('/admin/media', { params }),
  uploadMedia: (file, folder) => {
    const fd = new FormData();
    fd.append('file', file);
    if (folder) fd.append('folder', folder);
    return api.post('/admin/media/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateMedia: (id, data) => api.put(`/admin/media/${id}`, data),
  deleteMedia: (id) => api.delete(`/admin/media/${id}`),
};
