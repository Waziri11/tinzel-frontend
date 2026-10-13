import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../../services/api';
import LipaNambaScreen from './LipaNambaScreen';

export default function DynamicFormRenderer({ slug = 'wedding-magazine', onNavigateToTracking }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form input state
  const [clientName, setClientName] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [answers, setAnswers] = useState({});
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    loadForm();
  }, [slug]);

  const loadForm = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.public.getFormBySlug(slug);
      setForm(data.form);
    } catch (err) {
      setError(err.message || 'Failed to load form definition');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedPhotos((prev) => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim() || !clientWhatsApp.trim()) {
      setError('Please provide your name and WhatsApp phone number');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('clientName', clientName.trim());
      formData.append('clientWhatsApp', clientWhatsApp.trim());
      if (clientEmail.trim()) formData.append('clientEmail', clientEmail.trim());
      formData.append('answers', JSON.stringify(answers));

      selectedPhotos.forEach((file) => {
        formData.append('photos', file);
      });

      const result = await api.public.submitForm(slug, formData);
      setSubmissionResult(result);
    } catch (err) {
      setError(err.message || 'Failed to submit magazine order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <Loader2 size={24} className="spin" style={{ marginBottom: '12px' }} />
        <p>Loading magazine submission form...</p>
      </div>
    );
  }

  if (submissionResult) {
    return (
      <LipaNambaScreen
        order={submissionResult.order}
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
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Form Not Found</h3>
        </div>
        <p style={{ fontSize: '14px' }}>{error || `No active form configured for slug "${slug}".`}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      {/* Form Header Card */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '28px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="var(--accent-primary)" />
            <span style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {form.magazineType}
            </span>
          </div>
          <span
            style={{
              backgroundColor: '#1e3a8a',
              color: '#93c5fd',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            {form.price?.toLocaleString()} {form.currency}
          </span>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>{form.title}</h1>
        {form.description && (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>{form.description}</p>
        )}

        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          <Shield size={16} color="var(--accent-success)" />
          <span>Account-Free Submission • Direct WhatsApp Tracking • Personal Designer Assigned</span>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#450a0a',
            border: '1px solid var(--accent-danger)',
            borderRadius: '8px',
            padding: '14px 18px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <form onSubmit={handleSubmit}>
        {/* Contact Information Section */}
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            1. Client Contact Details
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Neema Mwita"
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                WhatsApp Phone Number *
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
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Used for private tracking login, draft approvals, and print updates.
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="e.g. neema@example.com"
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

        {/* Dynamic Fields Section */}
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            2. Magazine Content & Information
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {(form.fields || []).map((field) => {
              if (field.type === 'photo_upload') {
                return (
                  <div key={field.fieldId} style={{ paddingTop: '8px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                      {field.label} {field.required ? '*' : ''}
                    </label>
                    {field.helperText && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        {field.helperText}
                      </p>
                    )}

                    {/* Drag and Drop Upload Zone */}
                    <div
                      style={{
                        border: '2px dashed var(--border-color)',
                        borderRadius: '8px',
                        padding: '28px',
                        textAlign: 'center',
                        backgroundColor: 'var(--bg-primary)',
                        cursor: 'pointer',
                        marginBottom: '14px',
                      }}
                      onClick={() => document.getElementById(`upload-${field.fieldId}`).click()}
                    >
                      <UploadCloud size={32} color="var(--accent-primary)" style={{ margin: '0 auto 8px auto' }} />
                      <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                        Click to select high-resolution photos
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        JPEG, PNG, WEBP files up to 25MB each
                      </p>
                      <input
                        id={`upload-${field.fieldId}`}
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoSelect}
                      />
                    </div>

                    {/* Thumbnails of selected photos */}
                    {selectedPhotos.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          Selected Photos ({selectedPhotos.length}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {selectedPhotos.map((photo, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '6px 10px',
                                fontSize: '12px',
                              }}
                            >
                              <FileText size={14} color="var(--accent-primary)" />
                              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {photo.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removePhoto(idx)}
                                style={{
                                  backgroundColor: 'transparent',
                                  color: 'var(--text-muted)',
                                  padding: '2px',
                                  display: 'flex',
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                      {field.label} {field.required ? '*' : ''}
                    </label>
                    {field.helperText && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        {field.helperText}
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

              return (
                <div key={field.fieldId}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    {field.label} {field.required ? '*' : ''}
                  </label>
                  {field.helperText && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {field.helperText}
                    </p>
                  )}
                  <input
                    type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
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

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              padding: '12px 28px',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="spin" />
                Uploading assets & submitting...
              </>
            ) : (
              <>
                Proceed to Lipa Namba Payment
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
