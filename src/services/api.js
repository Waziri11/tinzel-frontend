const API_BASE = import.meta.env.VITE_API_URL || '';

const getHeaders = (token = null, isMultipart = false) => {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
};

export const api = {
  // Public Form Endpoints
  public: {
    getForms: () => fetch(`${API_BASE}/api/public/forms`).then(handleResponse),
    getFormBySlug: (slug) => fetch(`${API_BASE}/api/public/forms/${slug}`).then(handleResponse),
    submitForm: (slug, formData) =>
      fetch(`${API_BASE}/api/public/forms/${slug}/submit`, {
        method: 'POST',
        body: formData, // FormData multipart
      }).then(handleResponse),
  },

  // Client Tracking Endpoints
  client: {
    requestOtp: (trackingId, clientWhatsApp) =>
      fetch(`${API_BASE}/api/client/request-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ trackingId, clientWhatsApp }),
      }).then(handleResponse),

    verifyOtp: (trackingId, otp) =>
      fetch(`${API_BASE}/api/client/verify-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ trackingId, otp }),
      }).then(handleResponse),

    getOrder: (clientToken) =>
      fetch(`${API_BASE}/api/client/order`, {
        headers: getHeaders(clientToken),
      }).then(handleResponse),

    approveDraft: (clientToken, feedback) =>
      fetch(`${API_BASE}/api/client/approve-draft`, {
        method: 'POST',
        headers: getHeaders(clientToken),
        body: JSON.stringify({ feedback }),
      }).then(handleResponse),

    requestRevision: (clientToken, feedback) =>
      fetch(`${API_BASE}/api/client/request-revision`, {
        method: 'POST',
        headers: getHeaders(clientToken),
        body: JSON.stringify({ feedback }),
      }).then(handleResponse),
  },

  // Staff Auth Endpoints
  staffAuth: {
    login: (email, password) =>
      fetch(`${API_BASE}/api/staff/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      }).then(handleResponse),

    getMe: (token) =>
      fetch(`${API_BASE}/api/staff/me`, {
        headers: getHeaders(token),
      }).then(handleResponse),
  },

  // Manager Endpoints
  manager: {
    getOrders: (token, params = {}) => {
      const searchParams = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/api/manager/orders?${searchParams}`, {
        headers: getHeaders(token),
      }).then(handleResponse);
    },

    getOrder: (token, id) =>
      fetch(`${API_BASE}/api/manager/orders/${id}`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    verifyPayment: (token, id, data) =>
      fetch(`${API_BASE}/api/manager/orders/${id}/verify-payment`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    reassign: (token, id, data) =>
      fetch(`${API_BASE}/api/manager/orders/${id}/reassign`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    hold: (token, id, data) =>
      fetch(`${API_BASE}/api/manager/orders/${id}/hold`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    reviewDraft: (token, id, data) =>
      fetch(`${API_BASE}/api/manager/orders/${id}/review-draft`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    authorisePrint: (token, id, data) =>
      fetch(`${API_BASE}/api/manager/orders/${id}/authorise-print`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    printerUpdate: (token, id, data) =>
      fetch(`${API_BASE}/api/manager/orders/${id}/printer-update`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    authoriseDispatch: (token, id, data) =>
      fetch(`${API_BASE}/api/manager/orders/${id}/authorise-dispatch`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    closeOrder: (token, id, data) =>
      fetch(`${API_BASE}/api/manager/orders/${id}/close-order`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
  },

  // Designer Endpoints
  designer: {
    getOrders: (token, params = {}) => {
      const searchParams = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/api/designer/orders?${searchParams}`, {
        headers: getHeaders(token),
      }).then(handleResponse);
    },

    getOrder: (token, id) =>
      fetch(`${API_BASE}/api/designer/orders/${id}`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    downloadPhotoFolder: async (token, id, folder) => {
      const params = new URLSearchParams({ folder });
      const response = await fetch(`${API_BASE}/api/designer/orders/${id}/photo-folder.zip?${params}`, {
        headers: getHeaders(token),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to download photo folder');
      }
      const disposition = response.headers.get('Content-Disposition') || '';
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || 'photos.zip';
      return { blob: await response.blob(), fileName };
    },

    startDesign: (token, id) =>
      fetch(`${API_BASE}/api/designer/orders/${id}/start-design`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),

    uploadDraft: (token, id, formData) =>
      fetch(`${API_BASE}/api/designer/orders/${id}/upload-draft`, {
        method: 'POST',
        headers: getHeaders(token, true),
        body: formData,
      }).then(handleResponse),

    uploadPrintDocument: (token, id, formData) =>
      fetch(`${API_BASE}/api/designer/orders/${id}/upload-print-document`, {
        method: 'POST',
        headers: getHeaders(token, true),
        body: formData,
      }).then(handleResponse),

    flagIssue: (token, id, issue) =>
      fetch(`${API_BASE}/api/designer/orders/${id}/flag-issue`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ issue }),
      }).then(handleResponse),
  },

  // Admin Endpoints
  admin: {
    getForms: (token) =>
      fetch(`${API_BASE}/api/admin/forms`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    createForm: (token, form) =>
      fetch(`${API_BASE}/api/admin/forms`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(form),
      }).then(handleResponse),

    importGoogleForm: (token, url) =>
      fetch(`${API_BASE}/api/admin/forms/import-google`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ url }),
      }).then(handleResponse),

    updateForm: (token, id, form) =>
      fetch(`${API_BASE}/api/admin/forms/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(form),
      }).then(handleResponse),

    publishForm: (token, id) =>
      fetch(`${API_BASE}/api/admin/forms/${id}/publish`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),

    archiveForm: (token, id) =>
      fetch(`${API_BASE}/api/admin/forms/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      }).then(handleResponse),

    uploadCover: (token, file) => {
      const formData = new FormData();
      formData.append('cover', file);
      return fetch(`${API_BASE}/api/admin/forms/upload-cover`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }).then(handleResponse);
    },

    getStaff: (token) =>
      fetch(`${API_BASE}/api/admin/staff`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    getStaffUser: (token, id) =>
      fetch(`${API_BASE}/api/admin/staff/${id}`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    createStaff: (token, staff) =>
      fetch(`${API_BASE}/api/admin/staff`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(staff),
      }).then(handleResponse),

    updateStaff: (token, id, staff) =>
      fetch(`${API_BASE}/api/admin/staff/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(staff),
      }).then(handleResponse),

    deleteStaff: (token, id) =>
      fetch(`${API_BASE}/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      }).then(handleResponse),

    getConfig: (token) =>
      fetch(`${API_BASE}/api/admin/config`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    updateConfig: (token, data) =>
      fetch(`${API_BASE}/api/admin/config`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    getAuditLogs: (token) =>
      fetch(`${API_BASE}/api/admin/audit-logs`, {
        headers: getHeaders(token),
      }).then(handleResponse),
  },
};
