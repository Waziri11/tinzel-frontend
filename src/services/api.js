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
    const defaultMsg =
      res.status === 413
        ? 'Upload is too large for a single request. Please try fewer or smaller photos.'
        : `Request failed with status ${res.status}`;
    const err = new Error(data.message || defaultMsg);
    err.status = res.status;
    throw err;
  }
  return data;
};

const handleBlob = async (res) => {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return res.blob();
};

export const api = {
  // Public Form Endpoints
  public: {
    getForms: () => fetch(`${API_BASE}/api/public/forms`).then(handleResponse),
    getFormBySlug: (slug) => fetch(`${API_BASE}/api/public/forms/${slug}`).then(handleResponse),
    uploadOrderPhoto: (slug, file, { fieldId = '', folderName = 'General Photos' } = {}) => {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('fieldId', fieldId);
      fd.append('folderName', folderName);
      return fetch(`${API_BASE}/api/public/forms/${slug}/photos`, {
        method: 'POST',
        body: fd,
      }).then(handleResponse);
    },
    submitForm: (slug, payload) => {
      const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
      return fetch(`${API_BASE}/api/public/forms/${slug}/submit`, {
        method: 'POST',
        headers: isFormData ? undefined : getHeaders(),
        body: isFormData ? payload : JSON.stringify(payload),
      }).then(handleResponse);
    },
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

    requestRevision: (clientToken, items, expectedVersion) =>
      fetch(`${API_BASE}/api/client/request-revision`, {
        method: 'POST',
        headers: getHeaders(clientToken),
        body: JSON.stringify({ items, expectedVersion }),
      }).then(handleResponse),
    viewDraft: (clientToken) => fetch(`${API_BASE}/api/client/draft/view`, {
      headers: getHeaders(clientToken),
    }).then(handleBlob),
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
    getDesigners: (token) =>
      fetch(`${API_BASE}/api/manager/designers`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    getSettings: (token) =>
      fetch(`${API_BASE}/api/manager/settings`, {
        headers: getHeaders(token),
      }).then(handleResponse),

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
    viewDraft: (token, id, version) => fetch(`${API_BASE}/api/designer/orders/${id}/drafts/${version}/view`, {
      headers: getHeaders(token),
    }).then(handleBlob),
    downloadDraft: (token, id, version) => fetch(`${API_BASE}/api/designer/orders/${id}/drafts/${version}/download`, {
      headers: getHeaders(token),
    }).then(handleBlob),

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

    getReturns: (token, params = {}) => {
      const searchParams = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/api/designer/returns?${searchParams}`, { headers: getHeaders(token) }).then(handleResponse);
    },

    addressFix: (token, orderId, requestId, itemId, response) =>
      fetch(`${API_BASE}/api/designer/orders/${orderId}/returns/${requestId}/items/${itemId}`, {
        method: 'PATCH', headers: getHeaders(token), body: JSON.stringify({ response }),
      }).then(handleResponse),

    viewDraft: (token, id, version) => fetch(`${API_BASE}/api/designer/orders/${id}/drafts/${version}/view`, {
      headers: getHeaders(token),
    }).then(handleBlob),

    downloadPhotoFolder: async (token, id, folder, { signal, onStatus } = {}) => {
      const requestSignal = () => signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
      let result = await fetch(`${API_BASE}/api/designer/orders/${id}/photo-folder-download`, {
        method: 'POST', headers: getHeaders(token), body: JSON.stringify({ folder }), signal: requestSignal(),
      }).then(handleResponse);
      const deadline = Date.now() + 5 * 60000;
      while (result.state !== 'ready') {
        onStatus?.(result.state);
        signal?.throwIfAborted();
        if (result.state === 'failed') throw new Error(result.message || 'Unable to prepare this folder');
        if (Date.now() >= deadline) throw new Error('Your folder is still being prepared. Try downloading again shortly; completed work is saved.');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        signal?.throwIfAborted();
        result = await fetch(`${API_BASE}/api/designer/orders/${id}/media-jobs/${encodeURIComponent(result.jobId)}`, { headers: getHeaders(token), signal: requestSignal() }).then(handleResponse);
      }
      onStatus?.('ready');
      return { url: `${API_BASE}${result.url}` };
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

  notifications: {
    getHistory: (token, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/api/notifications/history${query ? `?${query}` : ''}`, {
        headers: getHeaders(token),
      }).then(handleResponse);
    },
    getDiagnostics: (token) =>
      fetch(`${API_BASE}/api/notifications/diagnostics`, {
        headers: getHeaders(token),
      }).then(handleResponse),
    markRead: (token, id) =>
      fetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        headers: getHeaders(token),
      }).then(handleResponse),
    markAllRead: (token) =>
      fetch(`${API_BASE}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),
    resend: (token, id, channel) =>
      fetch(`${API_BASE}/api/notifications/resend/${id}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ channel }),
      }).then(handleResponse),
    testSend: (token, data) =>
      fetch(`${API_BASE}/api/notifications/test-send`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
    getSettings: (token) =>
      fetch(`${API_BASE}/api/notifications/settings`, {
        headers: getHeaders(token),
      }).then(handleResponse),
    updateSettings: (token, data) =>
      fetch(`${API_BASE}/api/notifications/settings`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
    resetSettings: (token) =>
      fetch(`${API_BASE}/api/notifications/settings/reset`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),
    testSmsHealth: (token, data) =>
      fetch(`${API_BASE}/api/notifications/health-test/sms`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
    testEmailHealth: (token, data) =>
      fetch(`${API_BASE}/api/notifications/health-test/email`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
  },
};

