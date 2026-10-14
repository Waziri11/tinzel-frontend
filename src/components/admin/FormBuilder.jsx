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
} from 'lucide-react';
import { api } from '../../services/api';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Answer' },
  { value: 'textarea', label: 'Paragraph (Long Text)' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'photo_upload', label: 'Photo Upload Spread' },
  { value: 'dropdown', label: 'Dropdown Select' },
  { value: 'radio', label: 'Multiple Choice (Radio)' },
];

const PRESET_COVERS = [
  { url: '/brand/magazine-cover-sample.jpg', title: 'The Story of Us (Love Edition)' },
];

export default function FormBuilder({ token }) {
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Active form editing state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [magazineType, setMagazineType] = useState('Wedding & Love Magazine');
  const [price, setPrice] = useState(75000);
  const [currency, setCurrency] = useState('TZS');
  const [coverImageUrl, setCoverImageUrl] = useState('/brand/magazine-cover-sample.jpg');
  const [tillNumber, setTillNumber] = useState('55667788');
  const [accountName, setAccountName] = useState('Tinzel Media Ltd');
  const [instructions, setInstructions] = useState('Lipa kupitia Lipa Namba 55667788.');
  const [sections, setSections] = useState([
    { sectionId: 'sec_1', title: 'The Celebrants', description: 'Personal details and names', order: 1 },
    { sectionId: 'sec_2', title: 'The Story & Vows', description: 'Heartfelt memories and written tributes', order: 2 },
    { sectionId: 'sec_3', title: 'Photo Spread', description: 'High-definition photo gallery for the layout', order: 3 },
  ]);
  const [fields, setFields] = useState([]);

  useEffect(() => {
    loadForms();
  }, [token]);

  const loadForms = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getForms(token);
      setForms(data.forms || []);
      if (data.forms?.length > 0 && !selectedFormId) {
        selectFormForEdit(data.forms[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load forms');
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
    setCoverImageUrl(form.coverImageUrl || '/brand/magazine-cover-sample.jpg');
    setTillNumber(form.lipaNambaInstructions?.tillNumber || '55667788');
    setAccountName(form.lipaNambaInstructions?.accountName || 'Tinzel Media Ltd');
    setInstructions(form.lipaNambaInstructions?.instructions || '');
    
    // Ensure at least one section exists
    if (form.sections && form.sections.length > 0) {
      setSections(form.sections);
    } else {
      setSections([
        { sectionId: 'sec_general', title: 'General Information', description: 'Essential details for your magazine', order: 1 }
      ]);
    }

    setFields(form.fields || []);
    setError(null);
    setSuccessMsg(null);
  };

  const createNewForm = () => {
    const timestamp = Date.now().toString().slice(-4);
    setSelectedFormId('new');
    setTitle('Anniversary Celebration Edition');
    setSlug(`anniversary-${timestamp}`);
    setDescription('Celebrate your years together with a custom editorial magazine edition.');
    setMagazineType('Anniversary Magazine');
    setPrice(75000);
    setCurrency('TZS');
    setCoverImageUrl('/brand/magazine-cover-sample.jpg');
    setTillNumber('55667788');
    setAccountName('Tinzel Media Ltd');
    setInstructions('Lipa kupitia Lipa Namba 55667788.');
    setSections([
      { sectionId: 'sec_1', title: 'The Celebrants', description: 'Personal details and names', order: 1 },
      { sectionId: 'sec_2', title: 'Milestones & Memories', description: 'Quotes and memories through the years', order: 2 },
      { sectionId: 'sec_3', title: 'Photo Gallery', description: 'Cherished photographs for the pages', order: 3 },
    ]);
    setFields([
      { fieldId: 'names', sectionId: 'sec_1', label: 'Full Names of the Couple', type: 'text', required: true, order: 1, helperText: 'e.g. David & Sarah' },
      { fieldId: 'years', sectionId: 'sec_1', label: 'Number of Years Celebrated', type: 'number', required: true, order: 2, helperText: 'e.g. 5, 10, 25' },
      { fieldId: 'date', sectionId: 'sec_1', label: 'Anniversary Date', type: 'date', required: true, order: 3, helperText: '' },
      { fieldId: 'story', sectionId: 'sec_2', label: 'Our Favorite Memory Together', type: 'textarea', required: false, order: 4, helperText: 'Write in your own words for the feature article.' },
      { fieldId: 'photos', sectionId: 'sec_3', label: 'Upload Anniversary & Family Photos', type: 'photo_upload', required: true, order: 5, validationRules: { minPhotos: 5, maxPhotos: 25 }, helperText: 'Upload at least 5 photos.' },
    ]);
    setError(null);
    setSuccessMsg(null);
  };

  const handleAddSection = () => {
    const newSecId = `sec_${Date.now().toString().slice(-4)}`;
    const newSection = {
      sectionId: newSecId,
      title: `Section ${sections.length + 1}: New Section`,
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
    // Reassign fields in this section to the first section
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

  const handleAddFieldToSection = (sectionId) => {
    const newFieldId = `field_${Date.now().toString().slice(-4)}`;
    setFields((prev) => [
      ...prev,
      {
        fieldId: newFieldId,
        sectionId: sectionId || (sections[0]?.sectionId || 'sec_1'),
        label: 'Untitled Question',
        type: 'text',
        required: false,
        order: prev.length + 1,
        helperText: '',
        options: [],
        validationRules: { minPhotos: 5, maxPhotos: 20 },
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
      setSuccessMsg('Cover image uploaded successfully!');
    } catch (err) {
      setError(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!coverImageUrl || !coverImageUrl.trim()) {
      setError('A Magazine Cover Image is REQUIRED before saving this edition.');
      return;
    }

    if (!title.trim() || !slug.trim()) {
      setError('Title and unique slug are required.');
      return;
    }

    if (fields.length === 0) {
      setError('Please add at least one question to the form.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
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
        setSuccessMsg(`Edition "${res.form.title}" created successfully!`);
        await loadForms();
        selectFormForEdit(res.form);
      } else {
        const res = await api.admin.updateForm(token, selectedFormId, payload);
        setSuccessMsg(`Edition "${res.form.title}" updated successfully!`);
        await loadForms();
      }
    } catch (err) {
      setError(err.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
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
              fontSize: '28px',
              fontWeight: '600',
              color: 'var(--text-main)',
            }}
          >
            Magazine Form Builder
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Design custom order forms with sections and questions. Every edition dynamically appears on the "New Magazine Order" page.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: previewMode ? '#C5A059' : '#FFFFFF',
              color: previewMode ? '#FFFFFF' : '#1C1917',
              border: '1px solid #C5A059',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <Eye size={16} />
            {previewMode ? 'Exit Client Preview' : 'Client Preview'}
          </button>

          <button
            type="button"
            onClick={createNewForm}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              color: '#C5A059',
              border: '1px solid #C5A059',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            New Magazine Edition
          </button>
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

      {successMsg && (
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #16A34A',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#15803D',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Form Selection & Google Forms Editor */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '28px' }}>
        {/* Left Sidebar: Published Editions Roster */}
        <div>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.8px',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              Magazine Editions ({forms.length})
            </span>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <Loader2 size={18} className="spin" style={{ margin: '0 auto 8px auto' }} />
                <span>Loading...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {forms.map((f) => {
                  const isSelected = f._id === selectedFormId;
                  return (
                    <button
                      key={f._id}
                      type="button"
                      onClick={() => selectFormForEdit(f)}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        backgroundColor: isSelected ? '#FBF7EE' : '#FFFFFF',
                        border: `1px solid ${isSelected ? '#C5A059' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={f.coverImageUrl || '/brand/magazine-cover-sample.jpg'}
                          alt={f.title}
                          style={{ width: '28px', height: '38px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #E7E5E4' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: isSelected ? '#C5A059' : '#1C1917',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {f.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#78716C' }}>
                            {f.price?.toLocaleString()} {f.currency}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Google Forms-Style Editor */}
        <div>
          <form onSubmit={handleSaveForm}>
            {/* Top Action Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px 20px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: selectedFormId === 'new' ? '#FEF3C7' : '#F5F5F4',
                    color: selectedFormId === 'new' ? '#B45309' : '#1C1917',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedFormId === 'new' ? 'New Draft' : 'Editing Form'}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Total Questions: <strong>{fields.length}</strong> in <strong>{sections.length}</strong> Sections
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#C5A059',
                  color: '#FFFFFF',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(197, 160, 89, 0.25)',
                }}
              >
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                Publish / Save Edition Form
              </button>
            </div>

            {/* MANDATORY COVER IMAGE CARD */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: `2px solid ${coverImageUrl ? '#C5A059' : '#DC2626'}`,
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={18} color="#C5A059" />
                    <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1C1917' }}>
                      Magazine Cover Artwork <span style={{ color: '#DC2626' }}>* (REQUIRED)</span>
                    </h2>
                  </div>
                  <p style={{ fontSize: '12px', color: '#78716C', marginTop: '4px' }}>
                    This cover is displayed on the "New Magazine Order" page. Clients click this image directly to open this form.
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
                  {uploadingCover ? 'Uploading...' : 'Upload New Cover Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Cover Preview & Presets */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '120px',
                    height: '170px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '2px solid #C5A059',
                    backgroundColor: '#1C1917',
                    position: 'relative',
                    boxShadow: '0 8px 18px rgba(0,0,0,0.1)',
                  }}
                >
                  <img
                    src={coverImageUrl}
                    alt="Magazine Cover Preview"
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
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#1C1917', display: 'block', marginBottom: '8px' }}>
                    Current Cover URL:
                  </span>
                  <input
                    type="text"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="Enter image URL or upload above"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-main)',
                      marginBottom: '10px',
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#78716C' }}>Quick Template Covers:</span>
                    {PRESET_COVERS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setCoverImageUrl(preset.url)}
                        style={{
                          fontSize: '11px',
                          color: '#C5A059',
                          textDecoration: 'underline',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* FORM METADATA CARD (Google Forms Header Style) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderTop: '6px solid #C5A059',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                    Magazine Edition Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Our Love Edition - Wedding Magazine"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
                      fontStyle: 'italic',
                      fontSize: '22px',
                      fontWeight: '600',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                    URL Slug * (Unique)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. love-edition"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                  Form Description & Welcome Note
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell clients what memories and details will be immortalized in this edition..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                    Category Type
                  </label>
                  <input
                    type="text"
                    value={magazineType}
                    onChange={(e) => setMagazineType(e.target.value)}
                    placeholder="e.g. Wedding, Birthday, Anniversary"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                    Price Amount
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                    Lipa Namba Till Number
                  </label>
                  <input
                    type="text"
                    value={tillNumber}
                    onChange={(e) => setTillNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SECTIONS & GOOGLE FORM QUESTIONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {sections.map((section, secIdx) => {
                const sectionFields = fields.filter((f) => f.sectionId === section.sectionId);

                return (
                  <div
                    key={section.sectionId}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    }}
                  >
                    {/* Section Header Card */}
                    <div
                      style={{
                        backgroundColor: '#FBF7EE',
                        borderBottom: '1px solid #E7E5E4',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, marginRight: '16px' }}>
                        <span
                          style={{
                            backgroundColor: '#C5A059',
                            color: '#FFFFFF',
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: '700',
                          }}
                        >
                          {secIdx + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => handleSectionChange(section.sectionId, 'title', e.target.value)}
                            placeholder="Section Title"
                            style={{
                              width: '100%',
                              fontWeight: '700',
                              fontSize: '16px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#1C1917',
                              outline: 'none',
                            }}
                          />
                          <input
                            type="text"
                            value={section.description}
                            onChange={(e) => handleSectionChange(section.sectionId, 'description', e.target.value)}
                            placeholder="Section description (optional)"
                            style={{
                              width: '100%',
                              fontSize: '12px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#78716C',
                              outline: 'none',
                              marginTop: '2px',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleAddFieldToSection(section.sectionId)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #C5A059',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#C5A059',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={14} /> Add Question
                        </button>

                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(section.sectionId)}
                            title="Remove Section"
                            style={{
                              padding: '6px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Questions in this Section */}
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {sectionFields.length === 0 ? (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '24px',
                            border: '1px dashed #D6D3D1',
                            borderRadius: '6px',
                            color: '#78716C',
                            fontSize: '13px',
                          }}
                        >
                          No questions in this section yet. Click "+ Add Question" to create one.
                        </div>
                      ) : (
                        sectionFields.map((field) => {
                          const globalIdx = fields.findIndex((f) => f.fieldId === field.fieldId);

                          return (
                            <div
                              key={field.fieldId}
                              style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E7E5E4',
                                borderRadius: '6px',
                                padding: '16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              }}
                            >
                              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#78716C', marginBottom: '4px' }}>
                                    Question Prompt
                                  </label>
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => handleFieldChange(globalIdx, 'label', e.target.value)}
                                    placeholder="e.g. Wedding Vows / Photo Upload / Date"
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)',
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      backgroundColor: 'var(--input-bg)',
                                      color: 'var(--text-main)',
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#78716C', marginBottom: '4px' }}>
                                    Question Type
                                  </label>
                                  <select
                                    value={field.type}
                                    onChange={(e) => handleFieldChange(globalIdx, 'type', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)',
                                      fontSize: '13px',
                                      backgroundColor: 'var(--input-bg)',
                                      color: 'var(--text-main)',
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

                              <div style={{ marginBottom: '12px' }}>
                                <input
                                  type="text"
                                  value={field.helperText}
                                  onChange={(e) => handleFieldChange(globalIdx, 'helperText', e.target.value)}
                                  placeholder="Helper text / hint for client (optional)"
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '12px',
                                    color: 'var(--text-muted)',
                                    backgroundColor: 'var(--input-bg)',
                                  }}
                                />
                              </div>

                              {/* Action Footer: Section Mover, Required Toggle, Duplicate, Delete */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderTop: '1px solid #F5F5F4',
                                  paddingTop: '10px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', color: '#78716C' }}>Section:</span>
                                  <select
                                    value={field.sectionId}
                                    onChange={(e) => handleFieldChange(globalIdx, 'sectionId', e.target.value)}
                                    style={{
                                      fontSize: '11px',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color)',
                                      backgroundColor: '#FFFFFF',
                                    }}
                                  >
                                    {sections.map((s, idx) => (
                                      <option key={s.sectionId} value={s.sectionId}>
                                        Sec {idx + 1}: {s.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                    <input
                                      type="checkbox"
                                      checked={field.required}
                                      onChange={(e) => handleFieldChange(globalIdx, 'required', e.target.checked)}
                                      style={{ accentColor: '#C5A059' }}
                                    />
                                    <span>Required</span>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateField(globalIdx)}
                                    title="Duplicate Question"
                                    style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer' }}
                                  >
                                    <Copy size={15} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveField(globalIdx)}
                                    title="Delete Question"
                                    style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add New Section Button */}
              <button
                type="button"
                onClick={handleAddSection}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  backgroundColor: '#FFFFFF',
                  border: '2px dashed #C5A059',
                  borderRadius: '8px',
                  color: '#C5A059',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <FolderPlus size={18} />
                Add New Section to Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
