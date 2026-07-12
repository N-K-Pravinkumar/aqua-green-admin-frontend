import axios from 'axios';

const api = axios.create({
  // Uses REACT_APP_API_URL when set (e.g. on Render/production build).
  // Falls back to localhost for local development.
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request: attach JWT ───────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('aga_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: single interceptor — handles 401 refresh then logs ─
api.interceptors.response.use(
  r => r,
  async err => {
    const original = err.config;
    // Auto-refresh on 401 (only attempt once per request)
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('aga_refresh');
      if (refreshToken) {
        try {
          const r = await api.post('/auth/refresh', { refreshToken });
          const newToken = r.data.data.token;
          localStorage.setItem('aga_token', newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api.request(original);
        } catch {
          localStorage.removeItem('aga_token');
          localStorage.removeItem('aga_refresh');
          window.location.href = '/login';
          return Promise.reject(err);
        }
      }
    }
    // Log all other errors in one place
    const msg = err.response?.data?.message || err.message;
    console.error(`API ${err.config?.method?.toUpperCase()} ${err.config?.url} →`, msg);
    return Promise.reject(err);
  }
);

// ── Pagination helper ─────────────────────────────────────────────
// Converts a Spring Page<T> response into { content, totalElements, totalPages, number }
export const pageParams = (page = 0, size = 20) => ({ page, size });

export const productAPI = {
  getAll: () => api.get('/products'),
  getAllAdmin: () => api.get('/products/all-admin'),
  getFeatured: () => api.get('/products/featured'),
  getById: id => api.get(`/products/${id}`),
  getByCategory: cat => api.get(`/products/category/${cat}`),
  create: data => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: id => api.delete(`/products/${id}`),
};

export const serviceAPI = {
  getAll: () => api.get('/services'),
  getAllAdmin: () => api.get('/services/all-admin'),
  getFeatured: () => api.get('/services/featured'),
  getById: id => api.get(`/services/${id}`),
  create: data => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: id => api.delete(`/services/${id}`),
};

export const customerAPI = {
  // Returns Page<Customer> — use .data.data.content for the array
  getAll: (page = 0, size = 20) => api.get('/customers', { params: { page, size } }),
  search: q => api.get(`/customers/search?q=${q}`),
  lookupByMobile: mobile => api.get(`/customers/lookup?mobile=${mobile}`),
  getById: id => api.get(`/customers/${id}`),
  getTimeline: id => api.get(`/customers/${id}/timeline`),
  create: data => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: id => api.delete(`/customers/${id}`),
};

export const leadAPI = {
  // Returns Page<Lead>
  getAll: (status, page = 0, size = 20) =>
    api.get('/leads', { params: { ...(status ? { status } : {}), page, size } }),
  getCounts: () => api.get('/leads/counts'),
  getById: id => api.get(`/leads/${id}`),
  create: data => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  updateStatus: (id, status) => api.patch(`/leads/${id}/status?status=${status}`),
  addNote: (id, notes) => api.patch(`/leads/${id}/notes?notes=${encodeURIComponent(notes)}`),
  delete: id => api.delete(`/leads/${id}`),
};

export const enquiryAPI = {
  submit: data => api.post('/enquiries', data),
  // Returns Page<Enquiry>
  getAll: (status, page = 0, size = 20) =>
    api.get('/enquiries', { params: { ...(status ? { status } : {}), page, size } }),
  getCounts: () => api.get('/enquiries/counts'),
  updateStatus: (id, status) => api.patch(`/enquiries/${id}/status?status=${status}`),
  delete: id => api.delete(`/enquiries/${id}`),
};

export const saleAPI = {
  // Returns Page<Sale>
  getAll: (page = 0, size = 20) => api.get('/sales', { params: { page, size } }),
  getStats: () => api.get('/sales/stats'),
  getById: id => api.get(`/sales/${id}`),
  create: data => api.post('/sales', data),
  update: (id, data) => api.put(`/sales/${id}`, data),
  delete: id => api.delete(`/sales/${id}`),
};

export const serviceRequestAPI = {
  // Returns Page<ServiceRequest>
  getAll: (status, technician, page = 0, size = 20) =>
    api.get('/service-requests', { params: { ...(status ? { status } : {}), ...(technician ? { technician } : {}), page, size } }),
  getCounts: () => api.get('/service-requests/counts'),
  getById: id => api.get(`/service-requests/${id}`),
  create: data => api.post('/service-requests', data),
  update: (id, data) => api.put(`/service-requests/${id}`, data),
  updateStatus: (id, status, notes) =>
    api.patch(`/service-requests/${id}/status?status=${status}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),
  delete: id => api.delete(`/service-requests/${id}`),
};

export const quotationAPI = {
  getAll: (status, page = 0, size = 20) =>
    api.get('/quotations', { params: { ...(status ? { status } : {}), page, size } }),
  getCounts: () => api.get('/quotations/counts'),
  getById: id => api.get(`/quotations/${id}`),
  create: data => api.post('/quotations', data),
  update: (id, data) => api.put(`/quotations/${id}`, data),
  updateStatus: (id, status) => api.patch(`/quotations/${id}/status?status=${status}`),
  delete: id => api.delete(`/quotations/${id}`),
  downloadPdf: id => api.get(`/quotations/${id}/pdf`, { responseType: 'blob' }),
};

export const employeeAPI = {
  getAll: () => api.get('/employees'),
  getById: id => api.get(`/employees/${id}`),
  create: data => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: id => api.delete(`/employees/${id}`),
};

export const stockAPI = {
  getAll: (category) => api.get('/stock' + (category && category !== 'ALL' ? `?category=${category}` : '')),
  getPublic: (category) => api.get('/stock' + (category && category !== 'ALL' ? `?category=${category}` : '')),  // no auth needed
  getLow: () => api.get('/stock/low'),
  getById: id => api.get(`/stock/${id}`),
  create: data => api.post('/stock', data),
  update: (id, data) => api.put(`/stock/${id}`, data),
  updateStock: (id, qty, type) => api.patch(`/stock/${id}/stock?qty=${qty}&type=${type}`),
  delete: id => api.delete(`/stock/${id}`),
};

export const blogAPI = {
  getAll: (status) => api.get(`/blogs${status ? `?status=${status}` : ''}`),
  getPublished: () => api.get('/blogs/published'),
  getLatest: () => api.get('/blogs/latest'),
  getById: id => api.get(`/blogs/${id}`),
  getBySlug: slug => api.get(`/blogs/slug/${slug}`),
  create: data => api.post('/blogs', data),
  update: (id, data) => api.put(`/blogs/${id}`, data),
  delete: id => api.delete(`/blogs/${id}`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts'),
};

export default api;

export const galleryAPI = {
  getAll: (category) => api.get(`/gallery${category ? `?category=${category}` : ''}`),
  getFeatured: () => api.get('/gallery/featured'),
  getPreview: () => api.get('/gallery/preview'),
  getAllAdmin: () => api.get('/gallery/all-admin'),
  getById: id => api.get(`/gallery/${id}`),
  create: data => api.post('/gallery', data),
  update: (id, data) => api.put(`/gallery/${id}`, data),
  delete: id => api.delete(`/gallery/${id}`),
};

export const awardAPI = {
  getAll: () => api.get('/awards'),
  getAllAdmin: () => api.get('/awards/all-admin'),
  create: data => api.post('/awards', data),
  update: (id, data) => api.put(`/awards/${id}`, data),
  delete: id => api.delete(`/awards/${id}`),
};

export const templateAPI = {
  getAll: (type, category) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (category) params.append('category', category);
    return api.get(`/templates?${params.toString()}`);
  },
  getById: id => api.get(`/templates/${id}`),
  create: data => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: id => api.delete(`/templates/${id}`),
  setDefault: id => api.patch(`/templates/${id}/default`),
  preview: (id, vars) => api.post(`/templates/${id}/preview`, vars || {}),
  generateDocx: (id, vars) => api.post(`/templates/${id}/generate-docx`, vars || {}, { responseType: 'blob' }),
  generatePdf: (id, vars) => api.post(`/templates/${id}/generate-pdf`, vars || {}, { responseType: 'blob' }),
  generateQuotationPdf: (quotationId) => api.get(`/templates/quotation/${quotationId}/pdf`, { responseType: 'blob' }),
  extractPlaceholders: content => api.post('/templates/extract-placeholders', { content }),
  getCounts: () => api.get('/templates/counts'),
  getPlaceholders: () => api.get('/templates/placeholders'),
};

export const communicationAPI = {
  testEmail: (email) => api.post('/communications/test-email', { email }),
  getAll: (status, channel) => {
    const p = new URLSearchParams();
    if (status) p.append('status', status);
    if (channel) p.append('channel', channel);
    return api.get(`/communications?${p.toString()}`);
  },
  getStats: () => api.get('/communications/stats'),
  getTimeline: customerId => api.get(`/communications/customer/${customerId}/timeline`),
  send: data => api.post('/communications/send', data),
  bulkSend: data => api.post('/communications/bulk-send', data),
  updateStatus: (id, status) => api.patch(`/communications/${id}/status?status=${status}`),
  delete: id => api.delete(`/communications/${id}`),
  getAutomation: () => api.get('/communications/automation'),
  createAutomation: data => api.post('/communications/automation', data),
  updateAutomation: (id, data) => api.put(`/communications/automation/${id}`, data),
  deleteAutomation: id => api.delete(`/communications/automation/${id}`),
  getFilterPresets: () => api.get('/communications/filter-presets'),
  createFilterPreset: data => api.post('/communications/filter-presets', data),
  deleteFilterPreset: id => api.delete(`/communications/filter-presets/${id}`),
  filterCustomers: filters => api.post('/communications/filter-customers', filters),
};

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (data) => api.post('/auth/change-password', data),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

export const historyAPI = {
  getAll: () => api.get('/history'),
  getByCustomer: (id) => api.get(`/history/customer/${id}`),
  getByEntity: (type, id) => api.get(`/history/entity/${type}/${id}`),
  log: (data) => api.post('/history', data),
};

export const paymentAPI = {
  getAll: () => api.get('/payments'),
  getByCustomer: (id) => api.get(`/payments/customer/${id}`),
  getStats: () => api.get('/payments/stats'),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
};

export const brandAPI = {
  getAll: () => api.get('/brands'),
  create: (data) => api.post('/brands', data),
  update: (id, data) => api.put(`/brands/${id}`, data),
  delete: (id) => api.delete(`/brands/${id}`),
};

export const employeeReportAPI = {
  getStats: (id) => api.get(`/employees/${id}/stats`),
  getServices: (id, from, to) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return api.get(`/employees/${id}/services?${params.toString()}`);
  },
  downloadPdf: (id, from, to) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return api.get(`/employees/${id}/report/pdf?${params.toString()}`, { responseType: 'blob' });
  },
};

export const uploadAPI = {
  /** Upload a local file to the server (or Supabase if configured) */
  uploadImage: async (file, folder = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const token = localStorage.getItem('aga_token');
    const response = await fetch('http://localhost:8080/api/upload/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  },
  /** Fetch a remote image URL and save it to the server */
  saveFromUrl: (url, folder = 'general') =>
    api.post('/upload/image-from-url', { url, folder }),
};

export const serviceRequestExtAPI = {
  addSpareParts:   (id, parts) => api.post(`/service-requests/${id}/spare-parts`, { parts }),
  sellProduct:     (id, data)  => api.post(`/service-requests/${id}/sell-product`, data),
  completeBilling: (id, data)  => api.post(`/service-requests/${id}/complete-billing`, data),
  downloadInvoice: (id) => api.get(`/service-requests/${id}/invoice/pdf`, { responseType: 'blob' }),
  updateStatus:    (id, status) => api.patch(`/service-requests/${id}/status?status=${status}`),
};

export const saleInvoiceAPI = {
  downloadInvoice: (id) => api.get(`/sales/${id}/invoice/pdf`, { responseType: 'blob' }),
};

export const smsAPI = {
  listTemplates:  (event) => api.get('/sms/templates', { params: event ? { event } : {} }),
  preview:        (templateId, variables) => api.post('/sms/preview', { templateId, variables }),
  test:           (mobile, templateId, variables) => api.post('/sms/test', { mobile, templateId, variables }),
  sendByEvent:    (event, mobile, variables) => api.post('/sms/send', { event, mobile, variables }),
  leadFollowup:   (leadId) => api.post(`/sms/lead-followup/${leadId}`),
};

export const alertAPI = {
  getDue:       (days = 30) => api.get(`/alerts/due?days=${days}`),
  sendAlert:    (data)      => api.post('/alerts/send', data),
  sendAllDue:   (channel, days) => api.post(`/alerts/send-all-due?channel=${channel}&days=${days}`),
};
