import api from './api';

export const auditApi = {
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};
