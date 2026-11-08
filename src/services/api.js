import { normalizePhonePayload } from './phonePayload';
import { uploadMultipart } from './uploadTransport';
import { runTransfer, readDownload, saveDownload } from './fileTransfers';
import { errorText } from '../i18n/errors';
import { createCsrfTransport } from './csrf';
const API_BASE = import.meta.env.VITE_API_URL || '';
const csrf = createCsrfTransport({ apiBase: API_BASE });
let pendingStepUp;
export const securityHeaders = csrf.headers;
export const ensureCsrfToken = csrf.ensureToken;
export const requestVerification=options=>new Promise((resolve,reject)=>window.dispatchEvent(new CustomEvent('tinzel:verify',{detail:{...options,resolve,reject}})));
async function otpFlow(challenge,purpose='login'){
 let current=challenge;
 const call=async(path,body)=>{const response=await fetchWithTimeout(`${API_BASE}/api/staff/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return handleResponse(response);};
 return requestVerification({challengeId:current.challengeId,channel:current.channel,expiresIn:current.expiresIn,resendAfter:current.resendAfter,allowTrust:purpose==='login',verify:(code,trustDevice=false)=>call(purpose==='login'?'otp/verify':'step-up/verify',{challengeId:current.challengeId,code,trustDevice}),resend:async channel=>{current=await call(purpose==='login'?'otp/resend':'step-up',{challengeId:current.challengeId,channel});return current;}});
}
export const DEFAULT_API_TIMEOUT_MS = 25000;
export const UPLOAD_API_TIMEOUT_MS = 60000;

export const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
) => {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;
  try {
    let body = options.body;
    if (typeof body === 'string' && new Headers(options.headers).get('content-type')?.includes('application/json')) {
      body = JSON.stringify(normalizePhonePayload(JSON.parse(body)));
    } else if (typeof FormData !== 'undefined' && body instanceof FormData && body.has('clientWhatsApp')) {
      const canonical = normalizePhonePayload({ clientWhatsApp: body.get('clientWhatsApp') });
      body.set('clientWhatsApp', canonical.clientWhatsApp);
    }
    const response=await csrf.send(url, { ...options, body, signal });
    const data=response.headers.get('content-type')?.includes('application/json')?await response.clone().json().catch(()=>({})):{};
    if(response.status===403 && data.errorCode==='OTP_REQUIRED' && !options._verifiedRetry){
      if(!pendingStepUp)pendingStepUp=otpFlow({channel:'sms'},'step-up').finally(()=>{pendingStepUp=null;});
      await pendingStepUp;return fetchWithTimeout(url,{...options,_verifiedRetry:true},timeoutMs);
    }
    return response;
  } catch (err) {
    if (err?.status === 401) notifyUnauthorized({ status: 401, url }, err.message);
    if (
      err?.name === 'TimeoutError' ||
      (err?.name === 'AbortError' && !options.signal?.aborted)
    ) {
      const timeoutErr = new Error(
        errorText(
          'Request timed out. Please check your connection and try again.',
          504,
        ),
      );
      timeoutErr.status = 504;
      timeoutErr.retryable = true;
      throw timeoutErr;
    }
    if (err?.status === 400) err.message = errorText(err.message, 400);
    throw err;
  }
};

const getHeaders = (token = null, isMultipart = false) => {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (token && token !== 'cookie') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const notifyUnauthorized = (res, message) => {
  if (res.status !== 401 || typeof window === 'undefined') return;
  let path = '';
  try {
    path = new URL(res.url, window.location.origin).pathname;
  } catch {
    return;
  }
  if(/^\/api\/staff\/(?:otp|step-up|contact|recovery)(?:\/|$)/.test(path))return;
  if (/^\/api\/client\/(?:request-otp|verify-otp)$/.test(path)) return;
  const client = /^\/api\/(?:client(?:\/|$)|proofs\/client(?:\/|$))/.test(path);
  const staff =
    /^\/api\/(?:staff|admin|manager|designer|notifications|proofs\/staff)(?:\/|$)/.test(
      path,
    );
  if (client || staff)
    window.dispatchEvent(
      new CustomEvent(
        client ? 'tinzel:client:unauthorized' : 'tinzel:staff:unauthorized',
        {
          detail: {
            message: errorText(
              message || 'Your session has expired. Please sign in again.',
              401,
            ),
          },
        },
      ),
    );
};

const handleResponse = async (res, { silentUnauthorized = false } = {}) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (!silentUnauthorized) notifyUnauthorized(res, data.message);
    const defaultMsg =
      res.status === 413
        ? 'Upload is too large for a single request. Please try fewer or smaller photos.'
        : `Request failed with status ${res.status}`;
    const err = new Error(errorText(data.message || defaultMsg, res.status));
    err.status = res.status;
    err.code = data.errorCode || data.code;
    throw err;
  }
  return data;
};

const handleBlob = async (res) => {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    notifyUnauthorized(res, data.message);
    throw new Error(
      errorText(
        data.message || `Request failed with status ${res.status}`,
        res.status,
      ),
    );
  }
  return res.blob();
};

// Preserve the same CSRF, step-up and error handling as ordinary API requests.
async function uploadForm(url, token, body, options = {}, csrfRetried = false, verified = false) {
  options.signal?.throwIfAborted();
  if (!token || token === 'cookie') await ensureCsrfToken('staff', { signal: options.signal });
  const response = await uploadMultipart(url, body, { ...options, headers: { ...getHeaders(token, true), ...securityHeaders('staff') } });
  const data = await response.clone().json().catch(() => ({}));
  if (response.status === 403 && data.errorCode === 'CSRF_TOKEN_INVALID' && !csrfRetried) {
    await ensureCsrfToken('staff', { force: true, signal: options.signal });
    return uploadForm(url, token, body, options, true, verified);
  }
  if (response.status === 403 && data.errorCode === 'OTP_REQUIRED' && !verified) {
    options.progress?.({ stage: 'verifying', percent: null });
    if (!pendingStepUp) pendingStepUp = otpFlow({ channel: 'sms' }, 'step-up').finally(() => { pendingStepUp = null; });
    await pendingStepUp;
    return uploadForm(url, token, body, options, csrfRetried, true);
  }
  const result = await handleResponse(response);
  options.progress?.({ stage: 'complete', percent: 100 });
  return result;
}

export function downloadFile(url, filename, { key = url, token } = {}) {
  return runTransfer({ key, name: filename, kind: 'download' }, async context => {
    const response = await fetchWithTimeout(url, { headers: getHeaders(token), signal: context.signal }, 300000);
    const blob = await readDownload(response, context);
    context.signal.throwIfAborted();
    saveDownload(blob, filename);
  });
}

export const api = {
  // Public Form Endpoints
  public: {
    getForms: () =>
      fetchWithTimeout(`${API_BASE}/api/public/forms`).then(handleResponse),
    getFormBySlug: (slug) =>
      fetchWithTimeout(`${API_BASE}/api/public/forms/${slug}`).then(
        handleResponse,
      ),
    uploadOrderPhoto: (
      slug,
      file,
      { fieldId = '', folderName = 'General Photos' } = {},
    ) => {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('fieldId', fieldId);
      fd.append('folderName', folderName);
      return fetchWithTimeout(
        `${API_BASE}/api/public/forms/${slug}/photos`,
        {
          method: 'POST',
          body: fd,
        },
        UPLOAD_API_TIMEOUT_MS,
      ).then(handleResponse);
    },
    submitForm: (slug, payload) => {
      const isFormData =
        typeof FormData !== 'undefined' && payload instanceof FormData;
      return fetchWithTimeout(
        `${API_BASE}/api/public/forms/${slug}/submit`,
        {
          method: 'POST',
          headers: isFormData ? undefined : getHeaders(),
          body: isFormData ? payload : JSON.stringify(payload),
        },
        UPLOAD_API_TIMEOUT_MS,
      ).then(handleResponse);
    },
  },

  // Client Tracking Endpoints
  revisionAudio: (token, { client, orderId, requestId, itemId, signal }) =>
    fetchWithTimeout(`${API_BASE}${client ? '/api/client' : `/api/designer/orders/${orderId}`}/revisions/${requestId}/items/${itemId}/audio`, {
      headers: getHeaders(token), signal,
    }).then(handleBlob),

  client: {
    logout: (forgetDevice = false) => fetchWithTimeout(`${API_BASE}/api/client/logout`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ forgetDevice }) }).then(handleResponse),
    setPreferences: (token, preferredLanguage) =>
      fetchWithTimeout(`${API_BASE}/api/client/preferences`, {
        method: 'PATCH',
        headers: getHeaders(token),
        body: JSON.stringify({ preferredLanguage }),
      }).then(handleResponse),
    getNotifications: (token) =>
      fetchWithTimeout(`${API_BASE}/api/client/notifications`, {
        headers: getHeaders(token),
      }).then(handleResponse),
    readNotification: (token, id) =>
      fetchWithTimeout(`${API_BASE}/api/client/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getHeaders(token),
      }).then(handleResponse),
    requestOtp: (trackingId, clientWhatsApp) =>
      fetchWithTimeout(`${API_BASE}/api/client/request-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ trackingId, clientWhatsApp }),
      }).then(handleResponse),

    resumeTracking: (trackingId) =>
      fetchWithTimeout(`${API_BASE}/api/client/request-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ trackingId, resumeOnly: true }),
      }).then(handleResponse),

    verifyOtp: (trackingId, otp) =>
      fetchWithTimeout(`${API_BASE}/api/client/verify-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ trackingId, otp }),
      }).then(handleResponse),

    getOrder: (clientToken, { silentUnauthorized = false } = {}) =>
      fetchWithTimeout(`${API_BASE}/api/client/order`, {
        headers: getHeaders(clientToken),
      }).then(res => handleResponse(res, { silentUnauthorized })),

    approveDraft: (clientToken, feedback, expectedVersion) =>
      fetchWithTimeout(`${API_BASE}/api/client/approve-draft`, {
        method: 'POST',
        headers: getHeaders(clientToken),
        body: JSON.stringify({ feedback, expectedVersion }),
      }).then(handleResponse),

    requestRevision: (clientToken, items, expectedVersion, audio = null) => {
      const body = audio ? new FormData() : JSON.stringify({ items, expectedVersion });
      if (audio) {
        body.append('items', JSON.stringify(items));
        body.append('expectedVersion', String(expectedVersion));
        body.append('audio', audio);
      }
      return fetchWithTimeout(`${API_BASE}/api/client/request-revision`, {
        method: 'POST', headers: getHeaders(clientToken, Boolean(audio)), body,
      }, audio ? UPLOAD_API_TIMEOUT_MS : DEFAULT_API_TIMEOUT_MS).then(handleResponse);
    },
    viewDraft: (clientToken) =>
      fetchWithTimeout(`${API_BASE}/api/client/draft/view`, {
        headers: getHeaders(clientToken),
      }).then(handleBlob),
  },

  staffManagement: (role) => {
    const base = role === 'manager' ? '/api/manager/staff' : '/api/admin/staff';
    const call = (token, path = '', method = 'GET', body) =>
      fetchWithTimeout(`${API_BASE}${base}${path}`, {
        method,
        headers: getHeaders(token),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }).then(handleResponse);
    return {
      getStaff: (token) => call(token),
      getStaffUser: (token, id) => call(token, `/${id}`),
      createStaff: (token, data) => call(token, '', 'POST', data),
      updateStaff: (token, id, data) => call(token, `/${id}`, 'PUT', data),
      deleteStaff: (token, id) => call(token, `/${id}`, 'DELETE'),
      issueInitialPassword: (token, id) =>
        call(token, `/${id}/initial-password`, 'POST'),
      retryCredentialDelivery: (token, id, channel, confirmUncertain = false) =>
        call(token, `/${id}/credential-delivery/retry`, 'POST', {
          channel,
          confirmUncertain,
        }),
    };
  },
  providerConfig: {
    get: (token) =>
      fetchWithTimeout(`${API_BASE}/api/admin/providers`, {
        headers: getHeaders(token),
      }).then(handleResponse),
    save: (token, provider, data) =>
      fetchWithTimeout(`${API_BASE}/api/admin/providers/${provider}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
    check: (token, provider) =>
      fetchWithTimeout(`${API_BASE}/api/admin/providers/${provider}/check`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),
  },
  system: {
    section: (token, section) =>
      fetchWithTimeout(`${API_BASE}/api/system/summary/${section}`, {
        headers: getHeaders(token),
      }).then(handleResponse),
  },
  // Staff Auth Endpoints
  staffAuth: {
    config: () => fetchWithTimeout(`${API_BASE}/api/staff/auth-config`).then(handleResponse),
    recovery: (step, body) => fetchWithTimeout(`${API_BASE}/api/staff/recovery/${step}`, { method:'POST', headers:getHeaders(), body:JSON.stringify(body) }).then(handleResponse),
    updateProfile: (token, profile) =>
      fetchWithTimeout(`${API_BASE}/api/staff/profile`, {
        method: 'PATCH',
        headers: getHeaders(token),
        body: JSON.stringify(profile),
      }).then(handleResponse),
    changePassword: (token, currentPassword, newPassword) =>
      fetchWithTimeout(`${API_BASE}/api/staff/change-password`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ currentPassword, newPassword }),
      }).then(handleResponse),
    setPreferences: (token, preferredLanguage) =>
      fetchWithTimeout(`${API_BASE}/api/staff/preferences`, {
        method: 'PATCH',
        headers: getHeaders(token),
        body: JSON.stringify({ preferredLanguage }),
      }).then(handleResponse),
    login: (email, password, captchaToken='') =>
      fetchWithTimeout(`${API_BASE}/api/staff/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password,captchaToken }),
      }).then(handleResponse).then(data=>data.otpRequired?otpFlow(data):data),

    getMe: (token) =>
      fetchWithTimeout(`${API_BASE}/api/staff/me`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    logout: (token) =>
      fetchWithTimeout(`${API_BASE}/api/staff/logout`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),
  },

  // Manager Endpoints
  manager: {
    getDesigners: (token) =>
      fetchWithTimeout(`${API_BASE}/api/manager/designers`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    getSettings: (token) =>
      fetchWithTimeout(`${API_BASE}/api/manager/settings`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    getOrders: (token, params = {}) => {
      const searchParams = new URLSearchParams(params).toString();
      return fetchWithTimeout(
        `${API_BASE}/api/manager/orders?${searchParams}`,
        {
          headers: getHeaders(token),
        },
      ).then(handleResponse);
    },

    getOrder: (token, id) =>
      fetchWithTimeout(`${API_BASE}/api/manager/orders/${id}`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    verifyPayment: (token, id, data) =>
      fetchWithTimeout(`${API_BASE}/api/manager/orders/${id}/verify-payment`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    reassign: (token, id, data) =>
      fetchWithTimeout(`${API_BASE}/api/manager/orders/${id}/reassign`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    hold: (token, id, data) =>
      fetchWithTimeout(`${API_BASE}/api/manager/orders/${id}/hold`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    reviewDraft: (token, id, data) =>
      fetchWithTimeout(`${API_BASE}/api/manager/orders/${id}/review-draft`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
    viewDraft: (token, id, version) =>
      fetchWithTimeout(
        `${API_BASE}/api/designer/orders/${id}/drafts/${version}/view`,
        {
          headers: getHeaders(token),
        },
      ).then(handleBlob),
    downloadDraft: (token, id, version) =>
      fetchWithTimeout(
        `${API_BASE}/api/designer/orders/${id}/drafts/${version}/download`,
        {
          headers: getHeaders(token),
        },
      ).then(handleBlob),

    authorisePrint: (token, id, data) =>
      fetchWithTimeout(`${API_BASE}/api/manager/orders/${id}/authorise-print`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    printerUpdate: (token, id, data) =>
      fetchWithTimeout(`${API_BASE}/api/manager/orders/${id}/printer-update`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    authoriseDispatch: (token, id, data) =>
      fetchWithTimeout(
        `${API_BASE}/api/manager/orders/${id}/authorise-dispatch`,
        {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        },
      ).then(handleResponse),

    closeOrder: (token, id, data) =>
      fetchWithTimeout(`${API_BASE}/api/manager/orders/${id}/close-order`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
  },

  // Designer Endpoints
  designer: {
    getOrders: (token, params = {}) => {
      const searchParams = new URLSearchParams(params).toString();
      return fetchWithTimeout(
        `${API_BASE}/api/designer/orders?${searchParams}`,
        {
          headers: getHeaders(token),
        },
      ).then(handleResponse);
    },

    getOrder: (token, id) =>
      fetchWithTimeout(`${API_BASE}/api/designer/orders/${id}`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    getReturns: (token, params = {}) => {
      const searchParams = new URLSearchParams(params).toString();
      return fetchWithTimeout(
        `${API_BASE}/api/designer/returns?${searchParams}`,
        { headers: getHeaders(token) },
      ).then(handleResponse);
    },

    addressFix: (token, orderId, requestId, itemId, response) =>
      fetchWithTimeout(
        `${API_BASE}/api/designer/orders/${orderId}/returns/${requestId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: getHeaders(token),
          body: JSON.stringify({ response }),
        },
      ).then(handleResponse),

    viewDraft: (token, id, version) =>
      fetchWithTimeout(
        `${API_BASE}/api/designer/orders/${id}/drafts/${version}/view`,
        {
          headers: getHeaders(token),
        },
      ).then(handleBlob),

    downloadPhotoFolder: async (
      token,
      id,
      folder,
      { signal, onStatus } = {},
    ) => {
      const requestSignal = () =>
        signal
          ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
          : AbortSignal.timeout(30000);
      let result = await fetchWithTimeout(
        `${API_BASE}/api/designer/orders/${id}/photo-folder-download`,
        {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify(folder === null ? { scope: 'all' } : { folder }),
          signal: requestSignal(),
        },
      ).then(handleResponse);
      const deadline = Date.now() + 5 * 60000;
      while (result.state !== 'ready') {
        onStatus?.(result.state);
        signal?.throwIfAborted();
        if (result.state === 'failed')
          throw new Error(result.message || 'Unable to prepare this folder');
        if (Date.now() >= deadline)
          throw new Error(
            'Your folder is still being prepared. Try downloading again shortly; completed work is saved.',
          );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        signal?.throwIfAborted();
        result = await fetchWithTimeout(
          `${API_BASE}/api/designer/orders/${id}/media-jobs/${encodeURIComponent(result.jobId)}`,
          {
            headers: getHeaders(token),
            signal: requestSignal(),
          },
        ).then(handleResponse);
      }
      onStatus?.('ready');
      return { url: `${API_BASE}${result.url}`, fileName: result.fileName };
    },

    startDesign: (token, id) =>
      fetchWithTimeout(`${API_BASE}/api/designer/orders/${id}/start-design`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),

    uploadDraft: (token, id, formData) =>
      fetchWithTimeout(
        `${API_BASE}/api/designer/orders/${id}/upload-draft`,
        {
          method: 'POST',
          headers: getHeaders(token, true),
          body: formData,
        },
        UPLOAD_API_TIMEOUT_MS,
      ).then(handleResponse),

    uploadPrintDocument: (token, id, formData, options = {}) =>
      uploadForm(`${API_BASE}/api/designer/orders/${id}/upload-print-document`, token, formData, options),

    flagIssue: (token, id, issue) =>
      fetchWithTimeout(`${API_BASE}/api/designer/orders/${id}/flag-issue`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ issue }),
      }).then(handleResponse),
  },

  // Admin Endpoints
  admin: {
    issueInitialPassword: (token, id) =>
      fetchWithTimeout(`${API_BASE}/api/admin/staff/${id}/initial-password`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),
    retryCredentialDelivery: (token, id, channel, confirmUncertain = false) =>
      fetchWithTimeout(
        `${API_BASE}/api/admin/staff/${id}/credential-delivery/retry`,
        {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify({ channel, confirmUncertain }),
        },
      ).then(handleResponse),
    getForms: (token) =>
      fetchWithTimeout(`${API_BASE}/api/admin/forms`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    createForm: (token, form) =>
      fetchWithTimeout(`${API_BASE}/api/admin/forms`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(form),
      }).then(handleResponse),

    importGoogleForm: (token, url, formData) =>
      fetchWithTimeout(`${API_BASE}/api/admin/forms/import-google`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ url, ...(formData === undefined ? {} : { formData }) }),
      }).then(handleResponse),

    updateForm: (token, id, form) =>
      fetchWithTimeout(`${API_BASE}/api/admin/forms/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(form),
      }).then(handleResponse),

    publishForm: (token, id) =>
      fetchWithTimeout(`${API_BASE}/api/admin/forms/${id}/publish`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),

    archiveForm: (token, id) =>
      fetchWithTimeout(`${API_BASE}/api/admin/forms/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      }).then(handleResponse),

    uploadCover: (token, file, options = {}) => {
      const formData = new FormData();
      formData.append('cover', file);
      return uploadForm(`${API_BASE}/api/admin/forms/upload-cover`, token, formData, options);
    },

    getStaff: (token) =>
      fetchWithTimeout(`${API_BASE}/api/admin/staff`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    getStaffUser: (token, id) =>
      fetchWithTimeout(`${API_BASE}/api/admin/staff/${id}`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    createStaff: (token, staff) =>
      fetchWithTimeout(`${API_BASE}/api/admin/staff`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(staff),
      }).then(handleResponse),

    updateStaff: (token, id, staff) =>
      fetchWithTimeout(`${API_BASE}/api/admin/staff/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(staff),
      }).then(handleResponse),

    deleteStaff: (token, id) =>
      fetchWithTimeout(`${API_BASE}/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      }).then(handleResponse),

    getConfig: (token) =>
      fetchWithTimeout(`${API_BASE}/api/admin/config`, {
        headers: getHeaders(token),
      }).then(handleResponse),

    updateConfig: (token, data) =>
      fetchWithTimeout(`${API_BASE}/api/admin/config`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),

    getAuditLogs: (token) =>
      fetchWithTimeout(`${API_BASE}/api/admin/audit-logs`, {
        headers: getHeaders(token),
      }).then(handleResponse),
  },

  notifications: {
    getHistory: (token, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithTimeout(
        `${API_BASE}/api/notifications/history${query ? `?${query}` : ''}`,
        {
          headers: getHeaders(token),
        },
      ).then(handleResponse);
    },
    getDiagnostics: (token) =>
      fetchWithTimeout(`${API_BASE}/api/notifications/diagnostics`, {
        headers: getHeaders(token),
      }).then(handleResponse),
    markRead: (token, id) =>
      fetchWithTimeout(
        `${API_BASE}/api/notifications/${encodeURIComponent(id)}/read`,
        {
          method: 'PATCH',
          headers: getHeaders(token),
        },
      ).then(handleResponse),
    markAllRead: (token) =>
      fetchWithTimeout(`${API_BASE}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),
    resend: (token, id, channel, confirmUncertain = false) =>
      fetchWithTimeout(`${API_BASE}/api/notifications/resend/${id}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ channel, confirmUncertain }),
      }).then(handleResponse),
    testSend: (token, data) =>
      fetchWithTimeout(`${API_BASE}/api/notifications/test-send`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
    getSettings: (token) =>
      fetchWithTimeout(`${API_BASE}/api/notifications/settings`, {
        headers: getHeaders(token),
      }).then(handleResponse),
    updateSettings: (token, data) =>
      fetchWithTimeout(`${API_BASE}/api/notifications/settings`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
    resetSettings: (token) =>
      fetchWithTimeout(`${API_BASE}/api/notifications/settings/reset`, {
        method: 'POST',
        headers: getHeaders(token),
      }).then(handleResponse),
    testSmsHealth: (token, data) =>
      fetchWithTimeout(`${API_BASE}/api/notifications/health-test/sms`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
    testEmailHealth: (token, data) =>
      fetchWithTimeout(`${API_BASE}/api/notifications/health-test/email`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse),
  },
};

export function proofApi(token, orderId, version, client = false) {
  const base = `${API_BASE}/api/proofs/${client ? 'client' : `staff/${orderId}`}/${version}`;
  const view = crypto.randomUUID();
  const request = (suffix = '', method = 'GET', body, signal) =>
    fetchWithTimeout(base + suffix, {
      signal,
      method,
      headers: getHeaders(token),
      cache: 'no-store',
      ...(body ? { body: JSON.stringify(body) } : {}),
    }).then(handleResponse);
  return {
    metadata: () => request(),
    prepare: (pages, options = {}) =>
      request('/prepare', 'POST', { pages, ...options }),
    bundle:
      import.meta.env.VITE_PROOF_FAST_READER === 'false'
        ? undefined
        : async (page, signal) => {
            const res = await fetchWithTimeout(
              `${base}/pages/${page}?bundle=1&view=${view}`,
              {
                headers: getHeaders(token),
                cache: 'no-store',
                signal,
              },
            );
            if (res.status === 202)
              throw Object.assign(new Error('Page is being prepared'), {
                pending: true,
              });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(
                (data.message || 'Page could not be opened') +
                  (data.diagnostic?.reference
                    ? ` Reference: ${data.diagnostic.reference}`
                    : ''),
              );
            }
            if (
              !res.headers
                .get('content-type')
                ?.includes('application/vnd.tinzel.proof-page')
            ) {
              // Older compatible servers already returned the image: consume it instead of downloading it twice.
              const [blob, text] = await Promise.all([
                res.blob(),
                fetchWithTimeout(`${base}/pages/${page}?text=1`, {
                  headers: getHeaders(token),
                  cache: 'no-store',
                  signal,
                }).then(handleResponse),
              ]);
              return { blob, text };
            }
            const bytes = await res.arrayBuffer();
            if (bytes.byteLength < 4)
              throw new Error('Incomplete magazine page');
            const length = new DataView(bytes).getUint32(0);
            if (length > 2 * 1024 * 1024 || 4 + length >= bytes.byteLength)
              throw new Error('Invalid magazine page bundle');
            return {
              blob: new Blob([bytes.slice(4 + length)], { type: 'image/webp' }),
              text: JSON.parse(
                new TextDecoder().decode(bytes.slice(4, 4 + length)),
              ),
            };
          },
    page: async (page, signal) => {
      const response = await fetchWithTimeout(`${base}/pages/${page}`, {
        headers: getHeaders(token),
        cache: 'no-store',
        signal,
      });
      if (response.status === 202) {
        const error = new Error('Page is being prepared');
        error.pending = true;
        throw error;
      }
      return handleBlob(response);
    },
    text: (page) => request(`/pages/${page}?text=1`),
    uploadAttachment: async (file, clientId, { signal, onProgress, onReserve } = {}) => {
      const session = await request('/attachments', 'POST', { clientId, name: file.name, size: file.size, contentType: file.type }, signal);
      onReserve?.(session.id);
      if (session.state === 'ready') return session.attachment;
      const received = new Set(session.received.map(p => p.n));
      for (let n = 0; n < Math.ceil(file.size / session.chunkBytes); n++) {
        if (!received.has(n)) {
          await fetchWithTimeout(`${base}/attachments/${session.id}/chunks/${n}`, {
            method: 'PUT', headers: { ...getHeaders(token), 'Content-Type': 'application/octet-stream' },
            signal, body: file.slice(n * session.chunkBytes, Math.min(file.size, (n + 1) * session.chunkBytes)),
          }).then(handleResponse);
        }
        onProgress?.(Math.min(99, Math.round(Math.min(file.size, (n + 1) * session.chunkBytes) / file.size * 100)));
      }
      return request(`/attachments/${session.id}/complete`, 'POST', {}, signal);
    },
    removeAttachment: id => request(`/attachments/${id}`, 'DELETE'),
    attachmentImage: (id, thumbnail = true, signal) => fetchWithTimeout(`${base}/attachments/${id}${thumbnail ? '?thumbnail=1' : ''}`, {
      headers: getHeaders(token), cache: 'no-store', signal,
    }).then(handleBlob),
    save: (body) => request('/annotations', 'POST', body),
    discard: (id) => request(`/annotations/${id}`, 'DELETE'),
    retry: () => request('/retry', 'POST'),
    submit: () =>
      client
        ? api.client.requestRevision(token, [], version)
        : api.manager.reviewDraft(token, orderId, {
            action: 'return_to_designer',
            expectedVersion: version,
            items: [],
          }),
  };
}
