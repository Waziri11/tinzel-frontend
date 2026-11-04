import { ActionButton } from '../common/SoftFlutter';
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
  Lock,
  RotateCcw,
  ThumbsUp,
  Heart,
  Star,
} from 'lucide-react';
import { api } from '../../services/api';
import { usePhotoUploads } from '../../hooks/usePhotoUploads';
import { navigate } from '../../navigation/location';
import OrderAnswersView from '../common/OrderAnswersView';
import { Button } from '../common/UI';
import LipaNambaScreen from './LipaNambaScreen';
import UploadJourney from './UploadJourney';
import PageSkeleton from '../common/PageSkeleton';
import BrandLoading, { BrandMark } from '../common/BrandLoading';
import { useLanguage, localized, localizedList } from '../../i18n/LanguageContext';

export default function DynamicFormRenderer({ slug = 'wedding-magazine', onNavigateToTracking }) {
  const { t, lang } = useLanguage();
  const steps = ['details', 'story', 'photos', 'review'];
  const readStep = () => {
    const value = new URLSearchParams(window.location.search).get('step');
    return steps.includes(value) ? value : 'details';
  };
  const [step, setStep] = useState(readStep);
  const stepHeading = useRef(null);
  const goStep = (next) => {
    navigate(`${window.location.pathname}?step=${next}`);
  };
  useEffect(() => {
    const update = () => setStep(readStep());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  useEffect(() => {
    stepHeading.current?.focus({ preventScroll: true });
  }, [step]);

  // Localized helpers: Swahili falls back to English when no translation was entered
  const L = (obj, key) => localized(obj, key, lang);
  const LL = (obj, key) => localizedList(obj, key, lang);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [clientName, setClientName] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const confirmationRef = useRef(null);
  const [restoredSlug, setRestoredSlug] = useState(null);
  const uploads = usePhotoUploads(slug, form);
  const fieldPhotos = {};
  uploads.items.forEach((item) => {
    (fieldPhotos[item.fieldId] ||= []).push(item);
  });
  const draftKey = 'tinzel:answers:v2:' + slug;
  const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const ui = (en, sw) => (lang === 'sw' ? sw : en);

  const clearSavedDraft = () => {
    if (
      !window.confirm(
        ui(
          'Discard your saved answers? Uploaded photographs will remain available separately.',
          'Ufute majibu yaliyohifadhiwa? Picha zilizopakiwa zitabaki kando.',
        ),
      )
    )
      return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* optional recovery */
    }
    setClientName('');
    setClientWhatsApp('');
    setClientEmail('');
    setAnswers({});
    setHasSavedDraft(false);
  };

  useEffect(() => {
    if (!submissionResult) return;
    confirmationRef.current?.focus();
    confirmationRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [submissionResult]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSubmissionResult(null);
    let draft = {};
    let loadedFromDraft = false;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const savedAt = parsed?.savedAt;
        const data = parsed?.data || parsed || {};
        if (savedAt && Date.now() - savedAt > DRAFT_MAX_AGE_MS) {
          localStorage.removeItem(draftKey);
        } else {
          draft = data;
          if (
            draft.clientName ||
            draft.clientWhatsApp ||
            draft.clientEmail ||
            (draft.answers && Object.keys(draft.answers).length > 0)
          ) {
            loadedFromDraft = true;
          }
        }
      }
    } catch {
      /* optional recovery */
    }
    setHasSavedDraft(loadedFromDraft);
    setClientName(draft.clientName || '');
    setClientWhatsApp(draft.clientWhatsApp || '');
    setClientEmail(draft.clientEmail || '');
    setAnswers(draft.answers || {});
    setRestoredSlug(slug);
    api.public
      .getFormBySlug(slug)
      .then((data) => {
        if (active) setForm(data.form);
      })
      .catch((err) => {
        if (active) setError(err.message || t('form.loadFailed'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (restoredSlug !== slug || submissionResult) return;
    const timer = setTimeout(() => {
      try {
        const hasContent = Boolean(
          clientName || clientWhatsApp || clientEmail || Object.keys(answers || {}).length > 0,
        );
        if (hasContent) {
          localStorage.setItem(
            draftKey,
            JSON.stringify({
              savedAt: Date.now(),
              data: { clientName, clientWhatsApp, clientEmail, answers },
            }),
          );
          setHasSavedDraft(true);
        } else {
          localStorage.removeItem(draftKey);
          setHasSavedDraft(false);
        }
      } catch {
        /* optional recovery */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [slug, restoredSlug, clientName, clientWhatsApp, clientEmail, answers, submissionResult]);

  const handleFieldChange = (fieldId, value) => setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  const handleFieldPhotoSelect = async (fieldId, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    try {
      setError(null);
      await uploads.add(fieldId, files);
    } catch (err) {
      setError(err.message);
    }
  };
  const removeFieldPhoto = async (fieldId, index) => {
    try {
      await uploads.remove(fieldPhotos[fieldId][index].id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (step !== 'review') {
      advance();
      return;
    }
    if (!clientName.trim() || !clientWhatsApp.trim()) {
      goStep('details');
      setError(t('form.errNamePhone'));
      return;
    }
    const missing = (form?.fields || []).find((field) => {
      if (!field.required) return false;
      if (['photo_upload', 'photo_group'].includes(field.type)) return !(fieldPhotos[field.fieldId] || []).length;
      const value = answers[field.fieldId];
      if (['grid_radio', 'grid_checkbox'].includes(field.type))
        return !(field.rows || []).every((row) =>
          Array.isArray(value?.[row]) ? value[row].length : String(value?.[row] ?? '').trim(),
        );
      return Array.isArray(value) ? !value.length : !String(value ?? '').trim();
    });
    if (missing) {
      goStep(['photo_upload', 'photo_group'].includes(missing.type) ? 'photos' : 'story');
      setError(t('form.errRequired', { label: L(missing, 'label') }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await uploads.submit({
        clientName: clientName.trim(),
        clientWhatsApp: clientWhatsApp.trim(),
        clientEmail: clientEmail.trim(),
        clientPreferredLanguage: lang || 'sw',
        answers,
      });
      setSubmissionResult(result);
      setHasSavedDraft(false);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* optional recovery */
      }
    } catch (err) {
      setError(err.message || t('form.errSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  const advance = () => {
    setError(null);
    if (step === 'details') {
      if (!clientName.trim() || !clientWhatsApp.trim()) {
        setError(t('form.errNamePhone'));
        return;
      }
      const email = document.getElementById('magazine-client-email');
      if (email && !email.checkValidity()) {
        email.reportValidity();
        return;
      }
    }
    if (step === 'story') {
      const missing = (form?.fields || []).find(
        (field) =>
          field.required &&
          !['photo_upload', 'photo_group'].includes(field.type) &&
          (['grid_radio', 'grid_checkbox'].includes(field.type)
            ? !(field.rows || []).every((row) =>
                Array.isArray(answers[field.fieldId]?.[row])
                  ? answers[field.fieldId][row].length
                  : String(answers[field.fieldId]?.[row] ?? '').trim(),
              )
            : Array.isArray(answers[field.fieldId])
              ? !answers[field.fieldId].length
              : !String(answers[field.fieldId] ?? '').trim()),
      );
      if (missing) {
        setError(t('form.errRequired', { label: L(missing, 'label') }));
        return;
      }
    }
    if (step === 'photos') {
      const missing = (form?.fields || []).find(
        (field) =>
          field.required &&
          ['photo_upload', 'photo_group'].includes(field.type) &&
          !(fieldPhotos[field.fieldId] || []).length,
      );
      if (missing) {
        setError(t('form.errRequired', { label: L(missing, 'label') }));
        return;
      }
    }
    goStep(steps[Math.min(steps.indexOf(step) + 1, 3)]);
  };
  if (loading) {
    return (
      <PageSkeleton variant="form"
        title={t('form.loading')}
        description={ui('Opening a new chapter for your story.', 'Tunafungua ukurasa mpya wa hadithi yako.')}
      />
    );
  }

  if (submissionResult) {
    return (
      <>
        <div ref={confirmationRef} tabIndex={-1} style={{ scrollMarginTop: 88 }}>
          <BrandLoading
            complete
            compact
            title={ui('Your order has been saved', 'Oda yako imehifadhiwa')}
            description={ui(
              'Next: follow the payment instructions below. Your magazine has not entered production yet.',
              'Hatua inayofuata: fuata maelekezo ya malipo hapa chini. Uzalishaji wa jarida lako bado haujaanza.',
            )}
          />
        </div>
        <LipaNambaScreen
          order={{ ...submissionResult.order, formTitle: L(form, 'title') || submissionResult.order?.formTitle }}
          lipaNambaInstructions={submissionResult.lipaNambaInstructions}
          onNavigateToTracking={onNavigateToTracking}
        />
      </>
    );
  }

  if (!form) {
    return (
      <div
        style={{
          backgroundColor: '#FDF0EE',
          border: '1px solid var(--accent-danger)',
          borderRadius: '8px',
          padding: '24px',
          color: 'var(--accent-danger)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <AlertCircle size={20} />
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{t('form.notFound')}</h3>
        </div>
        <p style={{ fontSize: '14px' }}>{error || t('form.notFoundSlug', { slug })}</p>
        <Button onClick={() => window.location.reload()}>{ui('Try again', 'Jaribu tena')}</Button>
      </div>
    );
  }

  // Derive form sections or provide standard default section
  const formSections =
    form.sections && form.sections.length > 0
      ? form.sections
      : [{ sectionId: 'default_section', title: t('form.defaultSection'), description: '' }];

  return (
    <div className="order-form" style={{ maxWidth: '820px', margin: '0 auto' }}>
      <header className="order-heading">
        <span className="ui-eyebrow">{ui('Make it yours', 'Lifanye lako')}</span>
        <h1 className="ui-title" ref={stepHeading} tabIndex={-1}>
          {L(form, 'title')}
        </h1>
        <p className="ui-description">{L(form, 'description')}</p>
        <span className="order-price">
          {form.price?.toLocaleString()} {form.currency}
        </span>
      </header>
      <nav className="order-steps" aria-label={ui('Order steps', 'Hatua za oda')}>
        {steps.map((id, i) => (
          <button
            type="button"
            key={id}
            disabled={submitting}
            aria-current={step === id ? 'step' : undefined}
            onClick={() => goStep(id)}
          >
            <span>{i + 1}</span>
            {
              [
                ui('Your details', 'Taarifa zako'),
                ui('Your story', 'Hadithi yako'),
                ui('Photographs', 'Picha'),
                ui('Review', 'Hakiki'),
              ][i]
            }
          </button>
        ))}
      </nav>
      {error && (
        <div
          role="alert"
          tabIndex={-1}
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

      {hasSavedDraft && (
        <div
          role="status"
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '13px',
            color: '#334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={15} style={{ color: '#64748B', flexShrink: 0 }} />
            <span>
              {ui(
                'Draft restored from this browser (auto-expires in 24 hours).',
                'Rasimu imerejeshwa kutoka kwenye kivinjari hiki (inaisha baada ya saa 24).',
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={clearSavedDraft}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #DC2626',
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Trash2 size={13} />
            {ui('Clear saved draft', 'Futa rasimu')}
          </button>
        </div>
      )}

      {/* Main Form Fields */}
      <form noValidate onSubmit={handleSubmit}>
        {uploads.notice && <p role="status">{uploads.notice}</p>}
        <div id="photo-progress" hidden={step !== 'photos' && !submitting}>
          <UploadJourney
            uploads={uploads}
            lang={lang}
            disabled={submitting}
            onRemove={async (id) => {
              try {
                await uploads.remove(id);
              } catch (err) {
                setError(err.message);
              }
            }}
            onContinue={() => {
              goStep('details');
              setTimeout(() => document.getElementById('magazine-client-name')?.focus(), 0);
            }}
          />
        </div>
        <fieldset
          disabled={submitting}
          aria-label={ui('Magazine order details', 'Taarifa za oda ya jarida')}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          {/* Contact Information Section */}
          <div
            hidden={step !== 'details'}
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
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: 'var(--accent-primary)',
                  letterSpacing: '0.8px',
                }}
              >
                {t('form.step', { n: 1, total: formSections.length + 1 })}
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                {t('form.contactTitle')}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('form.contactDesc')}</p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              <div>
                <label
                  htmlFor="magazine-client-name"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  {t('form.fullName')}
                </label>
                <input
                  id="magazine-client-name"
                  autoComplete="name"
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
                <label
                  htmlFor="magazine-client-whatsapp"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  {t('form.whatsapp')}
                </label>
                <input
                  id="magazine-client-whatsapp"
                  type="tel"
                  autoComplete="tel"
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
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="magazine-client-email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                  marginBottom: '6px',
                }}
              >
                {t('form.email')}
              </label>
              <input
                id="magazine-client-email"
                autoComplete="email"
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
                }}
              />
            </div>
          </div>

          {step === 'story' &&
            !(form.fields || []).some((field) => !['photo_group', 'photo_upload'].includes(field.type)) && (
              <p className="ui-card ui-description">
                {ui(
                  'There are no written questions for this edition. Continue to photographs.',
                  'Toleo hili halina maswali ya kuandika. Endelea kwenye picha.',
                )}
              </p>
            )}
          {step === 'photos' &&
            !(form.fields || []).some((field) => ['photo_group', 'photo_upload'].includes(field.type)) && (
              <p className="ui-card ui-description">
                {ui(
                  'This edition does not request photographs. Continue to review your order.',
                  'Toleo hili halihitaji picha. Endelea kuhakiki oda yako.',
                )}
              </p>
            )}
          {/* Dynamic Google Forms-Style Sections */}
          {formSections.map((section, secIdx) => {
            // Filter fields belonging to this section (or unassigned fields if only one section)
            const allSectionFields =
              form.sections && form.sections.length > 0
                ? (form.fields || []).filter((f) => f.sectionId === section.sectionId)
                : form.fields || [];

            const sectionFields = allSectionFields.filter((field) =>
              step === 'photos'
                ? ['photo_group', 'photo_upload'].includes(field.type)
                : step === 'story'
                  ? !['photo_group', 'photo_upload'].includes(field.type)
                  : false,
            );
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
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: 'var(--accent-primary)',
                      letterSpacing: '0.8px',
                    }}
                  >
                    {t('form.step', { n: secIdx + 2, total: formSections.length + 1 })}
                  </span>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                    {L(section, 'title')}
                  </h2>
                  {L(section, 'description') && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {L(section, 'description')}
                    </p>
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
                          <label
                            style={{
                              display: 'block',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: 'var(--text-main)',
                              marginBottom: '4px',
                            }}
                          >
                            {L(field, 'label')} {field.required ? '*' : ''}
                          </label>
                          {L(field, 'helperText') && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                              {L(field, 'helperText')}
                            </p>
                          )}

                          <div
                            style={{
                              border: '2px dashed var(--accent-primary)',
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
                            <UploadCloud
                              size={30}
                              color="var(--accent-primary)"
                              style={{ margin: '0 auto 8px auto' }}
                            />
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: 'var(--text-main)',
                                marginBottom: '4px',
                              }}
                            >
                              {isGroup ? t('form.pickGroup') : t('form.pickSingle')}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {isGroup ? t('form.groupHint') : t('form.singleHint')}
                            </p>
                            <input
                              id={`upload-${field.fieldId}`}
                              type="file"
                              multiple={isGroup}
                              disabled={submitting}
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleFieldPhotoSelect(field.fieldId, e)}
                            />
                          </div>

                          {photosForThisField.length > 0 && (
                            <details className="tinzel-photo-list">
                              <summary>
                                {photosForThisField.length}{' '}
                                {ui('selected photos · View or remove', 'picha zimechaguliwa · Ona au ondoa')}
                              </summary>
                              <div
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--text-muted)',
                                  marginBottom: '8px',
                                }}
                              >
                                {t('form.folderAssets', {
                                  count: photosForThisField.length,
                                  unit: photosForThisField.length === 1 ? t('form.photo') : t('form.photos'),
                                })}
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
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      padding: '6px 10px',
                                      fontSize: '12px',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                    }}
                                  >
                                    <FileText size={14} color="var(--accent-primary)" />
                                    <span
                                      style={{
                                        maxWidth: '140px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontWeight: '600',
                                      }}
                                    >
                                      {photo.name}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#A8A29E' }}>
                                      {(photo.size / (1024 * 1024)).toFixed(1)}MB
                                    </span>
                                    <ActionButton
                                      type="button"
                                      aria-label={`${ui('Remove', 'Ondoa')} ${photo.name}`}
                                      onClick={() => removeFieldPhoto(field.fieldId, idx)}
                                      disabled={submitting}
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
                                    </ActionButton>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    }

                    if (field.type === 'textarea') {
                      return (
                        <div key={field.fieldId}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: 'var(--text-main)',
                              marginBottom: '4px',
                            }}
                          >
                            {L(field, 'label')} {field.required ? '*' : ''}
                          </label>
                          {L(field, 'helperText') && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                              {L(field, 'helperText')}
                            </p>
                          )}
                          <textarea
                            rows={4}
                            aria-label={L(field, 'label')}
                            required={field.required}
                            value={answers[field.fieldId] ?? ''}
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
                      const selected =
                        field.type === 'checkbox' ? answers[field.fieldId] || [] : answers[field.fieldId];
                      return (
                        <fieldset key={field.fieldId} style={{ border: 0, padding: 0, margin: 0 }}>
                          <legend
                            style={{
                              fontSize: '13px',
                              fontWeight: '700',
                              color: 'var(--text-main)',
                              marginBottom: '6px',
                            }}
                          >
                            {L(field, 'label')} {field.required ? '*' : ''}
                          </legend>
                          {L(field, 'helperText') && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{L(field, 'helperText')}</p>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(field.options || []).map((option, optIdx) => (
                              <label
                                key={option}
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}
                              >
                                <input
                                  type={field.type}
                                  name={field.fieldId}
                                  value={option}
                                  checked={field.type === 'checkbox' ? selected.includes(option) : selected === option}
                                  required={field.required && field.type === 'radio'}
                                  onChange={(e) => {
                                    if (field.type === 'radio') return handleFieldChange(field.fieldId, option);
                                    const next = e.target.checked
                                      ? [...selected, option]
                                      : selected.filter((value) => value !== option);
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
                      const high =
                        field.type === 'linear_scale'
                          ? (field.scaleConfig?.high ?? 5)
                          : (field.ratingConfig?.levelCount ?? 5);
                      const values = Array.from({ length: Math.max(0, high - low + 1) }, (_, index) => low + index);
                      const renderRatingIcon = (isSelected) => {
                        const color = isSelected ? 'var(--accent-primary)' : '#A8A29E';
                        if (field.ratingConfig?.iconType === 'heart')
                          return <Heart size={18} color={color} fill={isSelected ? 'var(--accent-primary)' : 'none'} />;
                        if (field.ratingConfig?.iconType === 'thumb')
                          return (
                            <ThumbsUp size={18} color={color} fill={isSelected ? 'var(--accent-primary)' : 'none'} />
                          );
                        return <Star size={18} color={color} fill={isSelected ? 'var(--accent-primary)' : 'none'} />;
                      };
                      return (
                        <fieldset key={field.fieldId} style={{ border: 0, padding: 0, margin: 0 }}>
                          <legend style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                            {L(field, 'label')} {field.required ? '*' : ''}
                          </legend>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {L(field.scaleConfig, 'lowLabel') && (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {L(field.scaleConfig, 'lowLabel')}
                              </span>
                            )}
                            {values.map((value) => {
                              const isSelected = String(answers[field.fieldId] ?? '') === String(value);
                              return (
                                <label
                                  key={value}
                                  style={{ display: 'grid', justifyItems: 'center', gap: '4px', cursor: 'pointer' }}
                                >
                                  <span>{field.type === 'rating' ? renderRatingIcon(isSelected) : value}</span>
                                  <input
                                    type="radio"
                                    name={field.fieldId}
                                    value={value}
                                    required={field.required}
                                    checked={isSelected}
                                    onChange={() => handleFieldChange(field.fieldId, value)}
                                    aria-label={`${L(field, 'label')} ${value}`}
                                  />
                                </label>
                              );
                            })}
                            {L(field.scaleConfig, 'highLabel') && (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {L(field.scaleConfig, 'highLabel')}
                              </span>
                            )}
                          </div>
                        </fieldset>
                      );
                    }

                    if (field.type === 'grid_radio' || field.type === 'grid_checkbox') {
                      const gridValue = answers[field.fieldId] || {};
                      return (
                        <fieldset key={field.fieldId} style={{ border: 0, padding: 0, margin: 0, overflowX: 'auto' }}>
                          <legend style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                            {L(field, 'label')} {field.required ? '*' : ''}
                          </legend>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr>
                                <th scope="col" style={{ textAlign: 'left', padding: '8px' }}>
                                  {ui('Question', 'Swali')}
                                </th>
                                {(field.options || []).map((column, colIdx) => (
                                  <th scope="col" key={column} style={{ padding: '8px' }}>
                                    {LL(field, 'options')[colIdx]}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(field.rows || []).map((row, rowIdx) => (
                                <tr key={row}>
                                  <th scope="row" style={{ textAlign: 'left', padding: '8px' }}>
                                    {LL(field, 'rows')[rowIdx]}
                                  </th>
                                  {(field.options || []).map((column) => {
                                    const rowValue = gridValue[row];
                                    const checked =
                                      field.type === 'grid_checkbox'
                                        ? (rowValue || []).includes(column)
                                        : rowValue === column;
                                    return (
                                      <td key={column} style={{ textAlign: 'center', padding: '8px' }}>
                                        <input
                                          aria-label={`${L(field, 'label')}: ${LL(field, 'rows')[rowIdx]} — ${LL(field, 'options')[(field.options || []).indexOf(column)]}`}
                                          type={field.type === 'grid_checkbox' ? 'checkbox' : 'radio'}
                                          name={`${field.fieldId}-${row}`}
                                          checked={checked}
                                          required={field.required && field.type === 'grid_radio'}
                                          onChange={(e) => {
                                            let nextRow = column;
                                            if (field.type === 'grid_checkbox') {
                                              const current = rowValue || [];
                                              nextRow = e.target.checked
                                                ? [...current, column]
                                                : current.filter((value) => value !== column);
                                            }
                                            handleFieldChange(field.fieldId, { ...gridValue, [row]: nextRow });
                                          }}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </fieldset>
                      );
                    }

                    if (field.type === 'dropdown') {
                      return (
                        <div key={field.fieldId}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: 'var(--text-main)',
                              marginBottom: '4px',
                            }}
                          >
                            {L(field, 'label')} {field.required ? '*' : ''}
                          </label>
                          {L(field, 'helperText') && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                              {L(field, 'helperText')}
                            </p>
                          )}
                          <select
                            aria-label={L(field, 'label')}
                            required={field.required}
                            value={answers[field.fieldId] ?? ''}
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
                        <label
                          style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: 'var(--text-main)',
                            marginBottom: '4px',
                          }}
                        >
                          {L(field, 'label')} {field.required ? '*' : ''}
                        </label>
                        {L(field, 'helperText') && (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            {L(field, 'helperText')}
                          </p>
                        )}
                        <input
                          type={
                            field.type === 'date'
                              ? 'date'
                              : field.type === 'datetime'
                                ? 'datetime-local'
                                : field.type === 'time'
                                  ? 'time'
                                  : field.type === 'number'
                                    ? 'number'
                                    : 'text'
                          }
                          placeholder={field.type === 'duration' ? t('form.durationPh') : undefined}
                          aria-label={L(field, 'label')}
                          required={field.required}
                          value={answers[field.fieldId] ?? ''}
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

          {step === 'review' && (
            <div className="order-review">
              <section className="ui-card">
                <header>
                  <h2>{ui('Your details', 'Taarifa zako')}</h2>
                  <Button onClick={() => goStep('details')}>{ui('Edit', 'Hariri')}</Button>
                </header>
                <dl>
                  <dt>{t('form.fullName')}</dt>
                  <dd>{clientName || '—'}</dd>
                  <dt>{t('form.whatsapp')}</dt>
                  <dd>{clientWhatsApp || '—'}</dd>
                  <dt>{t('form.email')}</dt>
                  <dd>{clientEmail || '—'}</dd>
                </dl>
              </section>
              <section className="ui-card">
                <header>
                  <h2>{ui('Your story', 'Hadithi yako')}</h2>
                  <Button onClick={() => goStep('story')}>{ui('Edit', 'Hariri')}</Button>
                </header>
                <OrderAnswersView submittedData={answers} formFields={form.fields} />
              </section>
              <section className="ui-card">
                <header>
                  <h2>{ui('Photographs', 'Picha')}</h2>
                  <Button onClick={() => goStep('photos')}>{ui('Edit', 'Hariri')}</Button>
                </header>
                <p>
                  {ui('Selected photographs:', 'Picha zilizochaguliwa:')} {uploads.items.length}
                </p>
                <p className="ui-description">
                  {ui(
                    'Transfers finish before your order is confirmed. Payment instructions appear after your order has been saved.',
                    'Uhamisho unakamilika kabla ya kuthibitisha oda. Maelekezo ya malipo yataonekana baada ya kuhifadhi oda.',
                  )}
                </p>
              </section>
            </div>
          )}
          <div className="order-step-actions">
            <Button disabled={step === 'details' || submitting} onClick={() => goStep(steps[steps.indexOf(step) - 1])}>
              {ui('Back', 'Rudi')}
            </Button>
            {step !== 'review' && (
              <Button variant="primary" disabled={submitting} onClick={advance}>
                {ui('Continue', 'Endelea')} <ArrowRight size={16} />
              </Button>
            )}
          </div>
          {/* Submit Action Card */}
          <div
            hidden={step !== 'review'}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              display: step === 'review' ? 'flex' : 'none',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                {t('form.readyTitle')}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('form.readyDesc')}</p>
            </div>

            <button
              className="tinzel-submit-button"
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                maxWidth: '100%',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--accent-primary)',
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
                  <BrandMark animate={uploads.phase === 'saving'} />
                  {uploads.phase === 'saving'
                    ? ui('Saving your order…', 'Tunahifadhi oda yako…')
                    : ui('Waiting for your photos…', 'Tunasubiri picha zako…')}
                </>
              ) : (
                <>
                  {t('form.continuePay')} <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
