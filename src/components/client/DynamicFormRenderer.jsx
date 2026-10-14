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
  Lock,
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
  const [fieldPhotos, setFieldPhotos] = useState({}); // { [fieldId]: File[] }
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

  const handleFieldPhotoSelect = (fieldId, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFieldPhotos((prev) => ({
      ...prev,
      [fieldId]: [...(prev[fieldId] || []), ...files],
    }));
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

      const photosMetadata = [];

      // Append field-specific photos (e.g. Photo Group questions)
      Object.keys(fieldPhotos).forEach((fId) => {
        const fieldDef = (form.fields || []).find((f) => f.fieldId === fId);
        const folderName = fieldDef?.label || 'Photo Spread';
        const files = fieldPhotos[fId] || [];

        files.forEach((file) => {
          formData.append('photos', file);
          photosMetadata.push({
            originalName: file.name,
            fieldId: fId,
            folderName: folderName,
          });
        });
      });

      // Append any general selected photos
      selectedPhotos.forEach((file) => {
        formData.append('photos', file);
        photosMetadata.push({
          originalName: file.name,
          fieldId: '',
          folderName: 'General Photos',
        });
      });

      if (photosMetadata.length > 0) {
        formData.append('photosMetadata', JSON.stringify(photosMetadata));
      }

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
        submissionResult={submissionResult}
        form={form}
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

  // Derive form sections or provide standard default section
  const formSections =
    form.sections && form.sections.length > 0
      ? form.sections
      : [{ sectionId: 'default_section', title: 'Magazine Details & Content', description: '' }];

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
              alt={form.title}
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
                {form.magazineType || 'Keepsake Edition'}
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
              {form.title}
            </h1>

            {form.description && (
              <p style={{ fontSize: '14px', color: '#78716C', lineHeight: '1.6', marginBottom: '16px' }}>
                {form.description}
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
              <span>Account-Free Submission • Private WhatsApp Order Tracking • Lipa Namba Verified</span>
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
              Step 1 of {formSections.length + 1}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', marginTop: '2px' }}>
              Client Contact Information
            </h2>
            <p style={{ fontSize: '12px', color: '#78716C' }}>
              We will deliver your Magazine Order Number and private draft approvals directly to your WhatsApp.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
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
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
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
                  Step {secIdx + 2} of {formSections.length + 1}
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', marginTop: '2px' }}>
                  {section.title}
                </h2>
                {section.description && (
                  <p style={{ fontSize: '12px', color: '#78716C', marginTop: '2px' }}>{section.description}</p>
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
                          {field.label} {field.required ? '*' : ''}
                        </label>
                        {field.helperText && (
                          <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '10px' }}>
                            {field.helperText}
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
                            {isGroup ? 'Click to select multiple photos for this spread' : 'Click to select photo asset'}
                          </p>
                          <p style={{ fontSize: '12px', color: '#78716C' }}>
                            {isGroup ? 'High-resolution images will be organised in this edition folder' : 'JPEG, PNG, WEBP files up to 25MB each'}
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
                              Folder Assets ({photosForThisField.length} {photosForThisField.length === 1 ? 'photo' : 'photos'}):
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
                          {field.label} {field.required ? '*' : ''}
                        </label>
                        {field.helperText && (
                          <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '6px' }}>
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

                  if (field.type === 'dropdown') {
                    return (
                      <div key={field.fieldId}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                          {field.label} {field.required ? '*' : ''}
                        </label>
                        {field.helperText && (
                          <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '6px' }}>
                            {field.helperText}
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
                          <option value="">-- Choose an option --</option>
                          {(field.options || []).map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.fieldId}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                        {field.label} {field.required ? '*' : ''}
                      </label>
                      {field.helperText && (
                        <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '6px' }}>
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
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917' }}>Ready to immortalize your story?</div>
            <p style={{ fontSize: '12px', color: '#78716C' }}>
              Submitting generates your preliminary Submission ID and takes you to the Lipa Namba payment screen.
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
                <Loader2 size={18} className="spin" /> Submitting Order...
              </>
            ) : (
              <>
                Continue to Payment <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
