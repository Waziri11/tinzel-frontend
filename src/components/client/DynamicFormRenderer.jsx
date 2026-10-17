import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  Loader2,
  Lock,
} from 'lucide-react';
import { api } from '../../services/api';
import { compressPhotoFile } from '../../utils/imageCompression';
import LipaNambaScreen from './LipaNambaScreen';
import { useLanguage, localized, localizedList } from '../../i18n/LanguageContext';

const UPLOAD_CONCURRENCY = 2;

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const idx = nextIndex;
      nextIndex += 1;
      results[idx] = await worker(items[idx], idx);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

export default function DynamicFormRenderer({ slug = 'wedding-magazine', onNavigateToTracking }) {
  const { t, lang } = useLanguage();
  // Localized helpers: Swahili falls back to English when no translation was entered
  const L = (obj, key) => localized(obj, key, lang);
  const LL = (obj, key) => localizedList(obj, key, lang);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form input state
  const [clientName, setClientName] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [answers, setAnswers] = useState({});
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [fieldPhotos, setFieldPhotos] = useState({}); // { [fieldId]: File[] }
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { done, total }
  const [submissionResult, setSubmissionResult] = useState(null);

  // Cache for background pre-compression & pre-upload promises keyed by File instance
  const preUploadCacheRef = useRef(new WeakMap());
  const endpointUnsupportedRef = useRef(false);

  useEffect(() => {
    preUploadCacheRef.current = new WeakMap();
    endpointUnsupportedRef.current = false;
    loadForm();
  }, [slug]);

  const loadForm = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.public.getFormBySlug(slug);
      setForm(data.form);
    } catch (err) {
      setError(err.message || t('form.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Compress and pre-upload a photo with automatic retry on transient 500/network errors
  const ensurePhotoTask = (file, fieldId, folderName) => {
    const existing = preUploadCacheRef.current.get(file);
    if (existing) return existing;

    const taskPromise = (async () => {
      const compressedFile = await compressPhotoFile(file, {
        maxBytes: 900 * 1024,
        maxDimension: 2400,
        quality: 0.86,
      });

      if (endpointUnsupportedRef.current) {
        return { compressedFile, uploadedPhoto: null, fallback: true };
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const res = await api.public.uploadOrderPhoto(slug, compressedFile, {
            fieldId,
            folderName,
          });
          if (res?.photo) {
            return { compressedFile, uploadedPhoto: res.photo, fallback: false };
          }
        } catch (err) {
          if (err.status === 404 || err.status === 405) {
            endpointUnsupportedRef.current = true;
            return { compressedFile, uploadedPhoto: null, fallback: true };
          }
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          }
        }
      }

      // If all 3 single-photo attempts failed, mark this photo for fallback in the final submit payload
      return { compressedFile, uploadedPhoto: null, fallback: true };
    })();

    preUploadCacheRef.current.set(file, taskPromise);
    return taskPromise;
  };

  const startBackgroundPreUploads = (files, fieldId, folderName) => {
    mapWithConcurrency(files, UPLOAD_CONCURRENCY, (file) => ensurePhotoTask(file, fieldId, folderName)).catch(() => {});
  };

  const handleFieldChange = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedPhotos((prev) => [...prev, ...files]);
    startBackgroundPreUploads(files, '', 'General Photos');
  };

  const removePhoto = (index) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFieldPhotoSelect = (fieldId, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const fieldDef = (form?.fields || []).find((f) => f.fieldId === fieldId);
    const folderName = fieldDef?.label || 'Photo Spread';
    setFieldPhotos((prev) => ({
      ...prev,
      [fieldId]: [...(prev[fieldId] || []), ...files],
    }));
    startBackgroundPreUploads(files, fieldId, folderName);
  };

  const removeFieldPhoto = (fieldId, index) => {
    setFieldPhotos((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim() || !clientWhatsApp.trim()) {
      setError(t('form.errNamePhone'));
      return;
    }

    const missingRequired = (form?.fields || []).find((field) => {
      if (!field.required) return false;
      if (field.type === 'photo_upload' || field.type === 'photo_group') return !(fieldPhotos[field.fieldId] || []).length;
      const value = answers[field.fieldId];
      if (field.type === 'grid_radio' || field.type === 'grid_checkbox') {
        return !(field.rows || []).every((row) => Array.isArray(value?.[row]) ? value[row].length > 0 : String(value?.[row] ?? '').trim());
      }
      return Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim();
    });
    if (missingRequired) {
      setError(t('form.errRequired', { label: L(missingRequired, 'label') }));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const queuedPhotos = [];

      Object.keys(fieldPhotos).forEach((fId) => {
        const fieldDef = (form.fields || []).find((f) => f.fieldId === fId);
        const folderName = fieldDef?.label || 'Photo Spread';
        const files = fieldPhotos[fId] || [];
        files.forEach((file) => {
          queuedPhotos.push({ file, fieldId: fId, folderName });
        });
      });

      selectedPhotos.forEach((file) => {
        queuedPhotos.push({ file, fieldId: '', folderName: 'General Photos' });
      });

      let doneCount = 0;
      if (queuedPhotos.length > 0) {
        setUploadProgress({ done: 0, total: queuedPhotos.length });
      }

      // Resolve pre-uploaded photos or upload remaining ones (2 at a time with automatic retry)
      const taskResults = await mapWithConcurrency(queuedPhotos, UPLOAD_CONCURRENCY, async (item) => {
        const res = await ensurePhotoTask(item.file, item.fieldId, item.folderName);
        doneCount += 1;
        setUploadProgress({ done: doneCount, total: queuedPhotos.length });
        return { ...item, ...res };
      });

      const uploadedPhotos = taskResults.map((r) => r.uploadedPhoto).filter(Boolean);
      const remainingFallbackItems = taskResults.filter((r) => !r.uploadedPhoto);

      let result;
      if (remainingFallbackItems.length > 0) {
        const fallbackBudget = Math.min(
          900 * 1024,
          Math.max(180 * 1024, Math.floor((3.4 * 1024 * 1024) / remainingFallbackItems.length))
        );

        const formData = new FormData();
        formData.append('clientName', clientName.trim());
        formData.append('clientWhatsApp', clientWhatsApp.trim());
        if (clientEmail.trim()) formData.append('clientEmail', clientEmail.trim());
        formData.append('answers', JSON.stringify(answers));
        if (uploadedPhotos.length > 0) {
          formData.append('uploadedPhotos', JSON.stringify(uploadedPhotos));
        }

        const photosMetadata = [];
        const fallbackFiles = await mapWithConcurrency(remainingFallbackItems, UPLOAD_CONCURRENCY, async (item) =>
          item.compressedFile.size <= fallbackBudget
            ? item.compressedFile
            : compressPhotoFile(item.compressedFile, { maxBytes: fallbackBudget, maxDimension: 2000, quality: 0.8 })
        );

        fallbackFiles.forEach((fallbackFile, idx) => {
          const item = remainingFallbackItems[idx];
          formData.append('photos', fallbackFile);
          photosMetadata.push({
            originalName: fallbackFile.name,
            fieldId: item.fieldId,
            folderName: item.folderName,
          });
        });

        if (photosMetadata.length > 0) {
          formData.append('photosMetadata', JSON.stringify(photosMetadata));
        }

        result = await api.public.submitForm(slug, formData);
      } else {
        result = await api.public.submitForm(slug, {
          clientName: clientName.trim(),
          clientWhatsApp: clientWhatsApp.trim(),
          clientEmail: clientEmail.trim(),
          answers,
          uploadedPhotos,
        });
      }

      setSubmissionResult(result);
    } catch (err) {
      setError(err.message || t('form.errSubmit'));
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <Loader2 size={24} className="spin" style={{ marginBottom: '12px' }} />
        <p>{t('form.loading')}</p>
      </div>
    );
  }

  if (submissionResult) {
    return (
      <LipaNambaScreen
        order={{ ...submissionResult.order, formTitle: L(form, 'title') || submissionResult.order?.formTitle }}
        lipaNambaInstructions={submissionResult.lipaNambaInstructions}
        onNavigateToTracking={onNavigateToTracking}
      />
    );
  }

  if (!form) {
    return (
      <div
        style={{
          backgroundColor: '#450a0a',
          border: '1px solid var(--accent-danger)',
          borderRadius: '8px',
          padding: '24px',
          color: '#fca5a5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <AlertCircle size={20} />
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{t('form.notFound')}</h3>
        </div>
        <p style={{ fontSize: '14px' }}>{error || t('form.notFoundSlug', { slug })}</p>
      </div>
    );
  }

  // Derive form sections or provide standard default section
  const formSections =
    form.sections && form.sections.length > 0
      ? form.sections
      : [{ sectionId: 'default_section', title: t('form.defaultSection'), description: '' }];

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Form Header Card with Real Magazine Cover Preview */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderTop: '6px solid #C5A059',
          borderRadius: '8px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* Display Mandatory Magazine Cover Portrait */}
          <div
            style={{
              width: '100px',
              height: '142px',
              borderRadius: '6px',
              overflow: 'hidden',
              flexShrink: 0,
              border: '2px solid #C5A059',
              position: 'relative',
              boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
              backgroundColor: '#1C1917',
            }}
          >
            <img
              src={form.coverImageUrl || '/brand/magazine-cover-sample.jpg'}
              alt={L(form, 'title')}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '3px',
                backgroundColor: '#C5A059',
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#C5A059', letterSpacing: '1px' }}>
                {L(form, 'magazineType') || t('form.defaultType')}
              </span>
              <span
                style={{
                  backgroundColor: '#FBF7EE',
                  color: '#C5A059',
                  border: '1px solid #C5A059',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '700',
                }}
              >
                {form.price?.toLocaleString()} {form.currency}
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: '32px',
                fontWeight: '600',
                color: '#1C1917',
                lineHeight: '1.15',
                marginBottom: '8px',
              }}
            >
              {L(form, 'title')}
            </h1>

            {L(form, 'description') && (
              <p style={{ fontSize: '14px', color: '#78716C', lineHeight: '1.6', marginBottom: '16px' }}>
                {L(form, 'description')}
              </p>
            )}

            <div
              style={{
                paddingTop: '12px',
                borderTop: '1px solid #F5F5F4',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#78716C',
              }}
            >
              <Shield size={14} color="#C5A059" />
              <span>{t('form.badges')}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #DC2626',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <form onSubmit={handleSubmit}>
        {/* Contact Information Section */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #F5F5F4' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#C5A059', letterSpacing: '0.8px' }}>
              {t('form.step', { n: 1, total: formSections.length + 1 })}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', marginTop: '2px' }}>
              {t('form.contactTitle')}
            </h2>
            <p style={{ fontSize: '12px', color: '#78716C' }}>
              {t('form.contactDesc')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                {t('form.fullName')}
              </label>
              <input
                type="text"
                required
                placeholder={t('form.fullNamePh')}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                {t('form.whatsapp')}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +255712345678"
                value={clientWhatsApp}
                onChange={(e) => setClientWhatsApp(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
              {t('form.email')}
            </label>
            <input
              type="email"
              placeholder={t('form.emailPh')}
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Dynamic Google Forms-Style Sections */}
        {formSections.map((section, secIdx) => {
          // Filter fields belonging to this section (or unassigned fields if only one section)
          const sectionFields =
            form.sections && form.sections.length > 0
              ? (form.fields || []).filter((f) => f.sectionId === section.sectionId)
              : form.fields || [];

          if (sectionFields.length === 0) return null;

          return (
            <div
              key={section.sectionId}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              {/* Section Header */}
              <div style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #F5F5F4' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#C5A059', letterSpacing: '0.8px' }}>
                  {t('form.step', { n: secIdx + 2, total: formSections.length + 1 })}
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', marginTop: '2px' }}>
                  {L(section, 'title')}
                </h2>
                {L(section, 'description') && (
                  <p style={{ fontSize: '12px', color: '#78716C', marginTop: '2px' }}>{L(section, 'description')}</p>
                )}
              </div>

              {/* Questions in this Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {sectionFields.map((field) => {
                  if (field.type === 'photo_group' || field.type === 'photo_upload') {
                    const photosForThisField = fieldPhotos[field.fieldId] || [];
                    const isGroup = field.type === 'photo_group';

                    return (
                      <div key={field.fieldId}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                          {L(field, 'label')} {field.required ? '*' : ''}
                        </label>
                        {L(field, 'helperText') && (
                          <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '10px' }}>
                            {L(field, 'helperText')}
                          </p>
                        )}

                        <div
                          style={{
                            border: '2px dashed #C5A059',
                            borderRadius: '8px',
                            padding: '24px',
                            textAlign: 'center',
                            backgroundColor: '#FAF5EA',
                            cursor: 'pointer',
                            marginBottom: '14px',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => document.getElementById(`upload-${field.fieldId}`).click()}
                        >
                          <UploadCloud size={30} color="#C5A059" style={{ margin: '0 auto 8px auto' }} />
                          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                            {isGroup ? t('form.pickGroup') : t('form.pickSingle')}
                          </p>
                          <p style={{ fontSize: '12px', color: '#78716C' }}>
                            {isGroup ? t('form.groupHint') : t('form.singleHint')}
                          </p>
                          <input
                            id={`upload-${field.fieldId}`}
                            type="file"
                            multiple={isGroup}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFieldPhotoSelect(field.fieldId, e)}
                          />
                        </div>

                        {photosForThisField.length > 0 && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#78716C', marginBottom: '8px' }}>
                              {t('form.folderAssets', { count: photosForThisField.length, unit: photosForThisField.length === 1 ? t('form.photo') : t('form.photos') })}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {photosForThisField.map((photo, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E7E5E4',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    fontSize: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                  }}
                                >
                                  <FileText size={14} color="#C5A059" />
                                  <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>
                                    {photo.name}
                                  </span>
                                  <span style={{ fontSize: '10px', color: '#A8A29E' }}>
                                    {(photo.size / (1024 * 1024)).toFixed(1)}MB
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeFieldPhoto(field.fieldId, idx)}
                                    style={{
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      color: '#DC2626',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      padding: '2px',
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <div key={field.fieldId}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                          {L(field, 'label')} {field.required ? '*' : ''}
                        </label>
                        {L(field, 'helperText') && (
                          <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '6px' }}>
                            {L(field, 'helperText')}
                          </p>
                        )}
                        <textarea
                          rows={4}
                          required={field.required}
                          value={answers[field.fieldId] || ''}
                          onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            outline: 'none',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    );
                  }

                  if (field.type === 'radio' || field.type === 'checkbox') {
                    const selected = field.type === 'checkbox' ? (answers[field.fieldId] || []) : answers[field.fieldId];
                    return (
                      <fieldset key={field.fieldId} style={{ border: 0, padding: 0, margin: 0 }}>
                        <legend style={{ fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>{L(field, 'label')} {field.required ? '*' : ''}</legend>
                        {L(field, 'helperText') && <p style={{ fontSize: '12px', color: '#78716C' }}>{L(field, 'helperText')}</p>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(field.options || []).map((option, optIdx) => (
                            <label key={option} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
                              <input
                                type={field.type}
                                name={field.fieldId}
                                value={option}
                                checked={field.type === 'checkbox' ? selected.includes(option) : selected === option}
                                required={field.required && field.type === 'radio'}
                                onChange={(e) => {
                                  if (field.type === 'radio') return handleFieldChange(field.fieldId, option);
                                  const next = e.target.checked ? [...selected, option] : selected.filter((value) => value !== option);
                                  handleFieldChange(field.fieldId, next);
                                }}
                              />
                              {LL(field, 'options')[optIdx]}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    );
                  }

                  if (field.type === 'linear_scale' || field.type === 'rating') {
                    const low = field.type === 'linear_scale' ? (field.scaleConfig?.low ?? 1) : 1;
                    const high = field.type === 'linear_scale' ? (field.scaleConfig?.high ?? 5) : (field.ratingConfig?.levelCount ?? 5);
                    const values = Array.from({ length: Math.max(0, high - low + 1) }, (_, index) => low + index);
                    const icon = field.ratingConfig?.iconType === 'heart' ? '♥' : field.ratingConfig?.iconType === 'thumb' ? '👍' : '★';
                    return (
                      <fieldset key={field.fieldId} style={{ border: 0, padding: 0, margin: 0 }}>
                        <legend style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>{L(field, 'label')} {field.required ? '*' : ''}</legend>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          {L(field.scaleConfig, 'lowLabel') && <span style={{ fontSize: '12px', color: '#78716C' }}>{L(field.scaleConfig, 'lowLabel')}</span>}
                          {values.map((value) => (
                            <label key={value} style={{ display: 'grid', justifyItems: 'center', gap: '3px' }}>
                              <span>{field.type === 'rating' ? icon : value}</span>
                              <input type="radio" name={field.fieldId} value={value} required={field.required} checked={String(answers[field.fieldId] ?? '') === String(value)} onChange={() => handleFieldChange(field.fieldId, value)} />
                            </label>
                          ))}
                          {L(field.scaleConfig, 'highLabel') && <span style={{ fontSize: '12px', color: '#78716C' }}>{L(field.scaleConfig, 'highLabel')}</span>}
                        </div>
                      </fieldset>
                    );
                  }

                  if (field.type === 'grid_radio' || field.type === 'grid_checkbox') {
                    const gridValue = answers[field.fieldId] || {};
                    return (
                      <fieldset key={field.fieldId} style={{ border: 0, padding: 0, margin: 0, overflowX: 'auto' }}>
                        <legend style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>{L(field, 'label')} {field.required ? '*' : ''}</legend>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead><tr><th style={{ textAlign: 'left', padding: '8px' }}></th>{(field.options || []).map((column, colIdx) => <th key={column} style={{ padding: '8px' }}>{LL(field, 'options')[colIdx]}</th>)}</tr></thead>
                          <tbody>{(field.rows || []).map((row, rowIdx) => <tr key={row}>
                            <th style={{ textAlign: 'left', padding: '8px' }}>{LL(field, 'rows')[rowIdx]}</th>
                            {(field.options || []).map((column) => {
                              const rowValue = gridValue[row];
                              const checked = field.type === 'grid_checkbox' ? (rowValue || []).includes(column) : rowValue === column;
                              return <td key={column} style={{ textAlign: 'center', padding: '8px' }}><input
                                type={field.type === 'grid_checkbox' ? 'checkbox' : 'radio'} name={`${field.fieldId}-${row}`} checked={checked}
                                required={field.required && field.type === 'grid_radio'}
                                onChange={(e) => {
                                  let nextRow = column;
                                  if (field.type === 'grid_checkbox') {
                                    const current = rowValue || [];
                                    nextRow = e.target.checked ? [...current, column] : current.filter((value) => value !== column);
                                  }
                                  handleFieldChange(field.fieldId, { ...gridValue, [row]: nextRow });
                                }}
                              /></td>;
                            })}
                          </tr>)}</tbody>
                        </table>
                      </fieldset>
                    );
                  }

                  if (field.type === 'dropdown') {
                    return (
                      <div key={field.fieldId}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                          {L(field, 'label')} {field.required ? '*' : ''}
                        </label>
                        {L(field, 'helperText') && (
                          <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '6px' }}>
                            {L(field, 'helperText')}
                          </p>
                        )}
                        <select
                          required={field.required}
                          value={answers[field.fieldId] || ''}
                          onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="">{t('form.chooseOption')}</option>
                          {(field.options || []).map((opt, i) => (
                            <option key={i} value={opt}>
                              {LL(field, 'options')[i]}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.fieldId}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                        {L(field, 'label')} {field.required ? '*' : ''}
                      </label>
                      {L(field, 'helperText') && (
                        <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '6px' }}>
                          {L(field, 'helperText')}
                        </p>
                      )}
                      <input
                        type={field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : field.type === 'time' ? 'time' : field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.type === 'duration' ? t('form.durationPh') : undefined}
                        required={field.required}
                        value={answers[field.fieldId] || ''}
                        onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-main)',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Submit Action Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917' }}>{t('form.readyTitle')}</div>
            <p style={{ fontSize: '12px', color: '#78716C' }}>
              {t('form.readyDesc')}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#C5A059',
              color: '#FFFFFF',
              padding: '12px 28px',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(197, 160, 89, 0.28)',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="spin" />{' '}
                {uploadProgress && uploadProgress.total > 0
                  ? `${t('form.submitting')} (${uploadProgress.done}/${uploadProgress.total})`
                  : t('form.submitting')}
              </>
            ) : (
              <>
                {t('form.continuePay')} <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
