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
  Smartphone,
  Eye,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';

export default function FormBuilder({ token }) {
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active form editing state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [magazineType, setMagazineType] = useState('Standard Magazine');
  const [price, setPrice] = useState(50000);
  const [currency, setCurrency] = useState('TZS');
  const [tillNumber, setTillNumber] = useState('55667788');
  const [accountName, setAccountName] = useState('Tinzel Media Ltd');
  const [instructions, setInstructions] = useState('Lipa kupitia Lipa Namba 55667788.');
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
    setTitle(form.title);
    setSlug(form.slug);
    setDescription(form.description || '');
    setMagazineType(form.magazineType || 'Standard Event Magazine');
    setPrice(form.price || 50000);
    setCurrency(form.currency || 'TZS');
    setTillNumber(form.lipaNambaInstructions?.tillNumber || '55667788');
    setAccountName(form.lipaNambaInstructions?.accountName || 'Tinzel Media Ltd');
    setInstructions(form.lipaNambaInstructions?.instructions || '');
    setFields(form.fields || []);
    setError(null);
    setSuccessMsg(null);
  };

  const createNewForm = () => {
    setSelectedFormId('new');
    setTitle('New Event Magazine');
    setSlug(`event-${Date.now().toString().slice(-4)}`);
    setDescription('Custom magazine format');
    setMagazineType('Event Magazine');
    setPrice(60000);
    setCurrency('TZS');
    setTillNumber('55667788');
    setAccountName('Tinzel Media Ltd');
    setInstructions('Lipa kupitia Lipa Namba 55667788.');
    setFields([
      { fieldId: 'names', label: 'Full Names', type: 'text', required: true, order: 1, helperText: '' },
      { fieldId: 'event_date', label: 'Date', type: 'date', required: true, order: 2, helperText: '' },
      {
        fieldId: 'photos',
        label: 'Upload Photos',
        type: 'photo_upload',
        required: true,
        order: 3,
        validationRules: { minPhotos: 5, maxPhotos: 20 },
      },
    ]);
  };

  const handleAddField = () => {
    const newFieldId = `field_${Date.now().toString().slice(-4)}`;
    setFields((prev) => [
      ...prev,
      {
        fieldId: newFieldId,
        label: 'New Question',
        type: 'text',
        required: false,
        order: prev.length + 1,
        helperText: '',
      },
    ]);
  };

  const handleRemoveField = (idx) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFieldChange = (idx, key, value) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      title,
      slug,
      description,
      magazineType,
      price: Number(price),
      currency,
      lipaNambaInstructions: {
        tillNumber,
        accountName,
        instructions,
      },
      fields,
    };

    try {
      if (selectedFormId === 'new') {
        const res = await api.admin.createForm(token, payload);
        setSelectedFormId(res.form._id);
        setSuccessMsg('New magazine form created and published!');
      } else {
        await api.admin.updateForm(token, selectedFormId, payload);
        setSuccessMsg('Form definition updated successfully!');
      }
      await loadForms();
    } catch (err) {
      setError(err.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
      {/* Forms List Sidebar */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          height: 'fit-content',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Configured Forms</h2>
          <button
            onClick={createNewForm}
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={13} /> New
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {forms.map((f) => (
            <div
              key={f._id}
              onClick={() => selectFormForEdit(f)}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: selectedFormId === f._id ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                border: `1px solid ${selectedFormId === f._id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{f.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/{f.slug}</div>
              <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '2px' }}>
                {f.price?.toLocaleString()} {f.currency}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Editor */}
      <div>
        {error && (
          <div
            style={{
              backgroundColor: '#450a0a',
              border: '1px solid var(--accent-danger)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#fca5a5',
              fontSize: '13px',
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
              backgroundColor: '#064e3b',
              border: '1px solid var(--accent-success)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#6ee7b7',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveForm}>
          {/* General Metadata */}
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '18px',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>
              Form Title & Pricing Configuration
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Form Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  URL Slug (/form/:slug) *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Price (TZS) *
                </label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Magazine Type:
                </label>
                <input
                  type="text"
                  value={magazineType}
                  onChange={(e) => setMagazineType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Description / Subtitle:
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Lipa Namba Payment Setup */}
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Smartphone size={16} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Lipa Namba Payment Configuration</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Till Number (Lipa Namba):
                </label>
                <input
                  type="text"
                  value={tillNumber}
                  onChange={(e) => setTillNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Account / Till Name:
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Payment Guidance Text:
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Dynamic Fields List (Google Forms Style) */}
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Form Fields ({fields.length})</h3>
              <button
                type="button"
                onClick={handleAddField}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} /> Add Field
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fields.map((fld, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 80px 40px', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Field Label (Question)"
                      value={fld.label}
                      onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-main)',
                        fontSize: '13px',
                      }}
                    />

                    <select
                      value={fld.type}
                      onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                      }}
                    >
                      <option value="text">Short Text</option>
                      <option value="textarea">Paragraph / Story</option>
                      <option value="photo_upload">Photo Upload</option>
                      <option value="date">Date</option>
                      <option value="number">Number</option>
                    </select>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <input
                        type="checkbox"
                        checked={fld.required || false}
                        onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                      />
                      Required
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      style={{ background: 'none', color: 'var(--text-muted)', display: 'flex' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save / Publish Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save & Publish Form Definition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
