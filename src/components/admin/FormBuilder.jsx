import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Layers,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Image as ImageIcon,
  FolderPlus,
  ChevronDown,
  ChevronUp,
  Copy,
  ArrowLeft,
  Folder,
} from 'lucide-react';
import { api } from '../../services/api';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Answer' },
  { value: 'textarea', label: 'Paragraph (Long Text / Vows)' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'photo_group', label: 'Photo Group (Multiple Photos Spread)' },
  { value: 'photo_upload', label: 'Single Photo Upload' },
  { value: 'dropdown', label: 'Dropdown Select' },
  { value: 'radio', label: 'Multiple Choice (Radio)' },
];

export default function FormBuilder({ token }) {
  // Navigation View: 'list' (Editions catalogue) | 'editor' (Form builder details)
  const [viewMode, setViewMode] = useState('list');
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active form editing state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [magazineType, setMagazineType] = useState('Wedding & Love Magazine');
  const [price, setPrice] = useState(75000);
  const [currency, setCurrency] = useState('TZS');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tillNumber, setTillNumber] = useState('55667788');
  const [accountName, setAccountName] = useState('Tinzel Media Ltd');
  const [instructions, setInstructions] = useState('Lipa kupitia Lipa Namba 55667788.');
  const [sections, setSections] = useState([
    { sectionId: 'sec_1', title: 'The Celebrants', description: 'Personal details and names', order: 1 },
  ]);
  const [fields, setFields] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  useEffect(() => {
    loadForms();
  }, [token]);

  const loadForms = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getForms(token);
      setForms(data.forms || []);
    } catch (err) {
      setError(err.message || 'Failed to load magazine forms');
    } finally {
      setLoading(false);
    }
  };

  const selectFormForEdit = (form) => {
    setSelectedFormId(form._id);
    setTitle(form.title || '');
    setSlug(form.slug || '');
    setDescription(form.description || '');
    setMagazineType(form.magazineType || 'Wedding & Love Magazine');
    setPrice(form.price || 75000);
    setCurrency(form.currency || 'TZS');
    setCoverImageUrl(form.coverImageUrl || '');
    setTillNumber(form.lipaNambaInstructions?.tillNumber || '55667788');
    setAccountName(form.lipaNambaInstructions?.accountName || 'Tinzel Media Ltd');
    setInstructions(form.lipaNambaInstructions?.instructions || '');

    if (form.sections && form.sections.length > 0) {
      setSections(form.sections);
    } else {
      setSections([
        { sectionId: 'sec_1', title: 'General Information', description: 'Essential details for your magazine', order: 1 },
      ]);
    }

    setFields(form.fields || []);
    setIsActive(Boolean(form.isActive));
    setIsArchived(Boolean(form.isArchived));
    setError(null);
    setSuccessMsg(null);
    setViewMode('editor');
  };

  // Fresh, totally blank form (does NOT take from any existing form)
  const startFreshNewForm = () => {
    setSelectedFormId('new');
    setTitle('');
    setSlug('');
    setDescription('');
    setMagazineType('Bespoke Keepsake Magazine');
    setPrice(75000);
    setCurrency('TZS');
    setCoverImageUrl(''); // Empty - user is REQUIRED to upload a cover
    setTillNumber('55667788');
    setAccountName('Tinzel Media Ltd');
    setInstructions('Lipa kupitia Lipa Namba 55667788.');
    setSections([
      { sectionId: 'sec_1', title: 'The Celebrants & Details', description: 'Personal details and introductory facts', order: 1 },
    ]);
    setFields([]); // 100% Empty questions - completely clean canvas!
    setIsActive(false);
    setIsArchived(false);
    setError(null);
    setSuccessMsg(null);
    setViewMode('editor');
  };

  const handleTitleChange = (val) => {
    setTitle(val);
    if (selectedFormId === 'new') {
      const autoSlug = val
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(autoSlug);
    }
  };

  const handleAddSection = () => {
    const newSecId = `sec_${Date.now().toString().slice(-4)}`;
    const newSection = {
      sectionId: newSecId,
      title: `Section ${sections.length + 1}: New Spread Section`,
      description: 'Add instructions for questions in this section',
      order: sections.length + 1,
    };
    setSections((prev) => [...prev, newSection]);
  };

  const handleRemoveSection = (secId) => {
    if (sections.length <= 1) {
      alert('A form must have at least one section.');
      return;
    }
    const fallbackSecId = sections.find((s) => s.sectionId !== secId).sectionId;
    setFields((prev) =>
      prev.map((f) => (f.sectionId === secId ? { ...f, sectionId: fallbackSecId } : f))
    );
    setSections((prev) => prev.filter((s) => s.sectionId !== secId));
  };

  const handleSectionChange = (secId, key, value) => {
    setSections((prev) =>
      prev.map((s) => (s.sectionId === secId ? { ...s, [key]: value } : s))
    );
  };

  const handleAddFieldToSection = (sectionId, defaultType = 'text') => {
    const newFieldId = `field_${Date.now().toString().slice(-4)}`;
    setFields((prev) => [
      ...prev,
      {
        fieldId: newFieldId,
        sectionId: sectionId || (sections[0]?.sectionId || 'sec_1'),
        label: defaultType === 'photo_group' ? 'Photo Spread Gallery' : 'Untitled Question',
        type: defaultType,
        required: false,
        order: prev.length + 1,
        helperText: defaultType === 'photo_group' ? 'Upload multiple high-resolution photos for this spread' : '',
        options: [],
        validationRules: { minPhotos: 1, maxPhotos: 50 },
      },
    ]);
  };

  const handleRemoveField = (idx) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDuplicateField = (idx) => {
    const original = fields[idx];
    const duplicated = {
      ...original,
      fieldId: `field_${Date.now().toString().slice(-4)}`,
      label: `${original.label} (Copy)`,
      order: fields.length + 1,
    };
    setFields((prev) => [...prev.slice(0, idx + 1), duplicated, ...prev.slice(idx + 1)]);
  };

  const handleFieldChange = (idx, key, value) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setError(null);
    try {
      const res = await api.admin.uploadCover(token, file);
      setCoverImageUrl(res.coverUrl);
      setSuccessMsg('Cover artwork uploaded successfully!');
    } catch (err) {
      setError(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleSaveForm = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (uploadingCover) {
      setError('Please wait for the cover photo to finish uploading.');
      return;
    }

    if (!title.trim()) {
      setError('Magazine edition title is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      magazineType: magazineType.trim(),
      price: Number(price) || 50000,
      currency,
      coverImageUrl: coverImageUrl.trim(),
      lipaNambaInstructions: {
        tillNumber,
        accountName,
        instructions,
      },
      sections,
      fields,
    };

    try {
      if (selectedFormId === 'new') {
        const res = await api.admin.createForm(token, payload);
        setSuccessMsg(`Draft "${res.form.title}" saved successfully!`);
        await loadForms();
        setSelectedFormId(res.form._id);
        setSlug(res.form.slug);
        setIsActive(Boolean(res.form.isActive));
      } else {
        const res = await api.admin.updateForm(token, selectedFormId, payload);
        setSuccessMsg(`Edition "${res.form.title}" saved successfully!`);
        await loadForms();
      }
    } catch (err) {
      setError(err.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishForm = async () => {
    if (selectedFormId === 'new') {
      setError('Save the draft before publishing it.');
      return;
    }
    setPublishing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.admin.publishForm(token, selectedFormId);
      setIsActive(true);
      setSuccessMsg(`Edition "${res.form.title}" published successfully!`);
      await loadForms();
    } catch (err) {
      setError(err.message || 'Failed to publish form');
    } finally {
      setPublishing(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW 1: MASTER LIST OF MAGAZINES (Default entry)
  // -------------------------------------------------------------
  if (viewMode === 'list') {
    return (
      <div style={{ maxWidth: '1160px', margin: '0 auto', paddingBottom: '60px' }}>
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            borderBottom: '1px solid #E7E5E4',
            paddingBottom: '20px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#C5A059',
              }}
            >
              Google Forms-Style Studio
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: '32px',
                fontWeight: '600',
                color: '#1C1917',
                margin: '2px 0 4px 0',
                lineHeight: '1.2',
              }}
            >
              Magazine Form Builder
            </h1>
            <p style={{ fontSize: '13px', color: '#78716C', margin: 0 }}>
              Design custom order forms with sections and questions. Every edition dynamically appears on the "New Magazine Order" page.
            </p>
          </div>

          <button
            type="button"
            onClick={startFreshNewForm}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#C5A059',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(197, 160, 89, 0.25)',
              transition: 'background-color 0.2s ease',
            }}
          >
            <Plus size={16} />
            + New Magazine Edition
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '24px',
              fontSize: '13px',
              color: '#991B1B',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#78716C' }}>
            <Loader2 size={24} className="spin" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontSize: '14px' }}>Loading magazine editions...</p>
          </div>
        ) : forms.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 24px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E7E5E4',
              borderRadius: '8px',
            }}
          >
            <FileText size={36} color="#C5A059" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
              No Magazine Editions Created Yet
            </h3>
            <p style={{ fontSize: '13px', color: '#78716C', maxWidth: '440px', margin: '0 auto 20px auto' }}>
              Create your first luxury publication template. You will be able to upload a cover, configure sections, and add photo spread folders.
            </p>
            <button
              type="button"
              onClick={startFreshNewForm}
              style={{
                backgroundColor: '#C5A059',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              + Create First Magazine Edition
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#78716C' }}>
                Magazine Editions ({forms.length})
              </span>
              <span style={{ fontSize: '12px', color: '#A8A29E' }}>
                Click any edition card to customize its questions and cover
              </span>
            </div>

            {/* Visual Editions Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
              }}
            >
              {forms.map((form) => (
                <div
                  key={form._id}
                  onClick={() => selectFormForEdit(form)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E7E5E4',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#C5A059';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(197, 160, 89, 0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E7E5E4';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                  }}
                >
                  {/* Top Cover Preview */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '65%',
                      backgroundColor: '#1C1917',
                      overflow: 'hidden',
                    }}
                  >
                    {form.coverImageUrl ? (
                      <img
                        src={form.coverImageUrl}
                        alt={form.title}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#A8A29E',
                          fontSize: '12px',
                        }}
                      >
                        No Cover Uploaded
                      </div>
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        backgroundColor: '#1C1917',
                        color: '#C5A059',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {form.price?.toLocaleString()} {form.currency}
                    </div>
                  </div>

                  {/* Body Meta */}
                  <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#FAF5EA',
                            color: '#C5A059',
                          }}
                        >
                          {form.magazineType || 'Keepsake Edition'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#A8A29E' }}>
                          /{form.slug}
                        </span>
                      </div>

                      <h3
                        style={{
                          fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
                          fontStyle: 'italic',
                          fontSize: '22px',
                          fontWeight: '600',
                          color: '#1C1917',
                          margin: '0 0 6px 0',
                          lineHeight: '1.2',
                        }}
                      >
                        {form.title}
                      </h3>

                      <p
                        style={{
                          fontSize: '12px',
                          color: '#78716C',
                          margin: '0 0 14px 0',
                          lineHeight: '1.5',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {form.description || 'Custom keepsake publication configured with tailored question prompts.'}
                      </p>
                    </div>

                    <div
                      style={{
                        paddingTop: '12px',
                        borderTop: '1px solid #F5F5F4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#78716C', fontWeight: '600' }}>
                        {form.sections?.length || 1} Sections • {form.fields?.length || 0} Questions
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: form.isArchived ? '#991B1B' : form.isActive ? '#166534' : '#B45309' }}>
                        {form.isArchived ? 'Archived' : form.isActive ? 'Published' : 'Draft'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#C5A059', fontWeight: '700' }}>
                        Customize Form →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: FORM BUILDER EDITOR (Detail Mode)
  // -------------------------------------------------------------
  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Editor Sub-Header: Back Button & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          paddingBottom: '16px',
          borderBottom: '1px solid #E7E5E4',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setViewMode('list');
            loadForms();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '6px',
            padding: '8px 14px',
            color: '#1C1917',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={16} />
          Back to Magazine Editions
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: selectedFormId === 'new' ? '#FEF3C7' : '#FAF5EA',
              color: selectedFormId === 'new' ? '#B45309' : '#C5A059',
            }}
          >
            {selectedFormId === 'new' ? 'New Blank Canvas' : isArchived ? 'Archived' : isActive ? 'Published' : 'Draft'}
          </span>

          <button
            type="button"
            onClick={handleSaveForm}
            disabled={saving || uploadingCover || publishing || isArchived}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#C5A059',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: saving || uploadingCover || publishing || isArchived ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(197, 160, 89, 0.25)',
            }}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Save {isActive ? 'Changes' : 'Draft'}
          </button>
          {!isActive && !isArchived && selectedFormId !== 'new' && (
            <button
              type="button"
              onClick={handlePublishForm}
              disabled={saving || uploadingCover || publishing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#1C1917', color: '#FFFFFF',
                border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700',
                cursor: publishing ? 'not-allowed' : 'pointer',
              }}
            >
              {publishing ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
              Publish Edition
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* CARD 1: MANDATORY MAGAZINE COVER ARTWORK */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: `2px solid ${coverImageUrl ? '#C5A059' : '#DC2626'}`,
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="#C5A059" />
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1C1917', margin: 0 }}>
                  Magazine Cover Artwork <span style={{ color: '#DC2626' }}>* (REQUIRED)</span>
                </h2>
              </div>
              <p style={{ fontSize: '12px', color: '#78716C', marginTop: '4px', margin: 0 }}>
                Every edition is required to have a cover. Clients click this image directly on the catalogue to open this form.
              </p>
            </div>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #C5A059',
                borderRadius: '6px',
                color: '#C5A059',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <UploadCloud size={14} />
              {uploadingCover ? 'Uploading...' : coverImageUrl ? 'Change Cover Photo' : 'Choose Cover Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div
              style={{
                width: '120px',
                height: '160px',
                backgroundColor: '#1C1917',
                borderRadius: '6px',
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid #D6D3D1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '11px', color: '#EF4444', textAlign: 'center', padding: '8px' }}>
                  Cover required
                </span>
              )}
            </div>

            <div style={{ flex: 1, fontSize: '13px', color: '#78716C' }}>
              {uploadingCover
                ? 'Uploading your cover photo...'
                : coverImageUrl
                  ? 'Cover photo selected. Choose another photo to replace it.'
                  : 'Choose a photo from your device to use as the magazine cover.'}
            </div>
          </div>
        </div>

        {/* CARD 2: PUBLICATION SPECIFICATIONS */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1C1917', marginBottom: '16px' }}>
            Edition Specifications
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                Magazine Edition Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Graduation Keepsake Magazine"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#FAFAF9',
                  border: '1px solid #D6D3D1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1C1917',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                URL Slug (Generated automatically)
              </label>
              <input
                type="text"
                readOnly
                placeholder="Generated from the edition title"
                value={slug}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#FAFAF9',
                  border: '1px solid #D6D3D1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1C1917',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '11px', color: '#A8A29E', marginTop: '6px', display: 'block' }}>
                {selectedFormId === 'new'
                  ? 'Created from the title when saved. A number is added if the name is already used.'
                  : 'This address stays the same when the title changes.'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                Magazine Type
              </label>
              <input
                type="text"
                placeholder="e.g. Wedding Magazine"
                value={magazineType}
                onChange={(e) => setMagazineType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#FAFAF9',
                  border: '1px solid #D6D3D1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1C1917',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                Price *
              </label>
              <input
                type="number"
                required
                placeholder="75000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#FAFAF9',
                  border: '1px solid #D6D3D1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1C1917',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#FAFAF9',
                  border: '1px solid #D6D3D1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1C1917',
                  boxSizing: 'border-box',
                }}
              >
                <option value="TZS">TZS</option>
                <option value="USD">USD</option>
                <option value="KES">KES</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
              Form Description & Welcome Note
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Personalized luxury publication celebrating your milestones with custom layouts."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#FAFAF9',
                border: '1px solid #D6D3D1',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#1C1917',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* CARD 3: GOOGLE FORMS-STYLE SECTIONS & QUESTIONS */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', margin: 0 }}>
                Sections & Question Prompts
              </h2>
              <span style={{ fontSize: '12px', color: '#78716C' }}>
                Organize client submissions into sequential spreads and photo folders.
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddSection}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #C5A059',
                borderRadius: '6px',
                color: '#C5A059',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <FolderPlus size={14} />
              + Add Section
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sections.map((sec, secIdx) => {
              const sectionFields = fields.filter((f) => f.sectionId === sec.sectionId);

              return (
                <div
                  key={sec.sectionId}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E7E5E4',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* Section Title & Description */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #F5F5F4',
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '16px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#C5A059', letterSpacing: '0.8px' }}>
                        Section {secIdx + 1} of {sections.length}
                      </div>
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => handleSectionChange(sec.sectionId, 'title', e.target.value)}
                        placeholder="Section Title (e.g. The Couple & Story)"
                        style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: '#1C1917',
                          border: 'none',
                          borderBottom: '1px solid transparent',
                          outline: 'none',
                          width: '100%',
                          padding: '4px 0',
                        }}
                        onFocus={(e) => (e.target.style.borderBottom = '1px solid #C5A059')}
                        onBlur={(e) => (e.target.style.borderBottom = '1px solid transparent')}
                      />
                      <input
                        type="text"
                        value={sec.description}
                        onChange={(e) => handleSectionChange(sec.sectionId, 'description', e.target.value)}
                        placeholder="Section instructions or description (optional)"
                        style={{
                          fontSize: '12px',
                          color: '#78716C',
                          border: 'none',
                          outline: 'none',
                          width: '100%',
                          padding: '2px 0',
                        }}
                      />
                    </div>

                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(sec.sectionId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#DC2626',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Delete Section"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Questions in this Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                    {sectionFields.length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '20px',
                          backgroundColor: '#FAFAF9',
                          border: '1px dashed #D6D3D1',
                          borderRadius: '6px',
                          color: '#78716C',
                          fontSize: '13px',
                        }}
                      >
                        No questions in this section yet. Add a text question or a photo group spread below.
                      </div>
                    ) : (
                      sectionFields.map((field) => {
                        const globalIdx = fields.findIndex((f) => f.fieldId === field.fieldId);
                        const isPhotoGroup = field.type === 'photo_group';

                        return (
                          <div
                            key={field.fieldId}
                            style={{
                              backgroundColor: isPhotoGroup ? '#FAF5EA' : '#FAFAF9',
                              border: `1px solid ${isPhotoGroup ? 'rgba(197, 160, 89, 0.4)' : '#E7E5E4'}`,
                              borderRadius: '6px',
                              padding: '16px',
                            }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                                  Question Label / Spread Title *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Ceremony Photos, Couple Vows, Reception Highlights"
                                  value={field.label}
                                  onChange={(e) => handleFieldChange(globalIdx, 'label', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #D6D3D1',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#1C1917',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                                  Response Type
                                </label>
                                <select
                                  value={field.type}
                                  onChange={(e) => handleFieldChange(globalIdx, 'type', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #D6D3D1',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#1C1917',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  {FIELD_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Helper Text */}
                            <div style={{ marginBottom: '12px' }}>
                              <input
                                type="text"
                                placeholder="Helper text or instructions for the client (optional)"
                                value={field.helperText || ''}
                                onChange={(e) => handleFieldChange(globalIdx, 'helperText', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E7E5E4',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  color: '#78716C',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>

                            {/* Photo Group Spread Badge & Notice */}
                            {isPhotoGroup && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid rgba(197, 160, 89, 0.3)',
                                  borderRadius: '4px',
                                  padding: '8px 12px',
                                  marginBottom: '12px',
                                }}
                              >
                                <Folder size={16} color="#C5A059" />
                                <span style={{ fontSize: '12px', color: '#1C1917', fontWeight: '600' }}>
                                  Photo Group: Clients can upload multiple photos here. They will appear as a dedicated folder named <strong>"{field.label || 'Photo Spread'}"</strong> on the Manager Conveyor and Designer Workstation.
                                </span>
                              </div>
                            )}

                            {/* Footer Controls: Required toggle, Duplicate, Delete */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #E7E5E4' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#1C1917', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => handleFieldChange(globalIdx, 'required', e.target.checked)}
                                />
                                Required Field
                              </label>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateField(globalIdx)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#78716C',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Copy size={13} />
                                  Duplicate
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveField(globalIdx)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#DC2626',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Trash2 size={13} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Section Add Question Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleAddFieldToSection(sec.sectionId, 'text')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        backgroundColor: '#FAFAF9',
                        border: '1px solid #D6D3D1',
                        borderRadius: '4px',
                        color: '#1C1917',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} />
                      + Add Question
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddFieldToSection(sec.sectionId, 'photo_group')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        backgroundColor: '#FAF5EA',
                        border: '1px solid #C5A059',
                        borderRadius: '4px',
                        color: '#1C1917',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      <FolderPlus size={13} color="#C5A059" />
                      + Add Photo Group Spread
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </div>
  );
}
