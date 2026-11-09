import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { ActionButton } from '../common/SoftFlutter';

const EDITABLE_STATUSES = ['awaiting_balance_payment', 'balance_payment_review', 'client_approved', 'print_document_prep', 'print_manager_review', 'printing_sent', 'printing_in_progress', 'printing_completed'];

export default function ClientDeliveryLocation({ order, token, focusOnOpen, onSaved }) {
  const { t } = useLanguage();
  const savedLocation = order.clientDeliveryDetails?.location || '';
  const status = order.status === 'on_hold' ? order.previousStatusBeforeHold : order.status;
  const canEdit = EDITABLE_STATUSES.includes(status);
  const [location, setLocation] = useState(savedLocation);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);
  const lock = useRef(false);
  const showForm = canEdit && (editing || !savedLocation);

  useEffect(() => {
    if (showForm && (focusOnOpen || editing)) input.current?.focus();
  }, [showForm, focusOnOpen, editing]);

  const save = async event => {
    event.preventDefault();
    if (lock.current || !canEdit) return;
    if (!location.trim()) {
      setError(t('track.delivery.required'));
      input.current?.focus();
      return;
    }
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await api.client.saveDeliveryLocation(token, location.trim());
      onSaved(result.clientDeliveryDetails);
      setLocation(result.clientDeliveryDetails.location);
      setEditing(false);
    } catch (err) {
      setError(t(err.status === 409 ? 'track.delivery.changed' : 'track.delivery.error'));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  if (!canEdit && !savedLocation) return null;

  return <section className="client-delivery-location" aria-labelledby="delivery-location-title">
    <div className="client-delivery-location__heading">
      <MapPin size={22} aria-hidden="true" />
      <h2 id="delivery-location-title">{t(showForm ? 'track.delivery.title' : 'track.delivery.saved')}</h2>
    </div>
    {showForm ? <form onSubmit={save} noValidate aria-busy={saving}>
      <p id="delivery-location-hint">{t('track.delivery.hint')}</p>
      <label htmlFor="delivery-location">{t('track.delivery.label')}</label>
      <textarea
        ref={input}
        id="delivery-location"
        name="deliveryLocation"
        rows={4}
        required
        maxLength={1000}
        value={location}
        disabled={saving}
        aria-invalid={Boolean(error)}
        aria-describedby={`delivery-location-hint${error ? ' delivery-location-error' : ''}`}
        placeholder={t('track.delivery.placeholder')}
        onChange={event => { setLocation(event.target.value); setError(''); }}
      />
      {error && <p id="delivery-location-error" role="alert">{error}</p>}
      <div className="client-delivery-location__actions">
        <ActionButton type="submit" className="ui-button is-primary" loading={saving} disabled={saving} loadingLabel={t('track.delivery.saving')}>
          {t('track.delivery.save')}
        </ActionButton>
        {savedLocation && <button type="button" className="ui-button" disabled={saving} onClick={() => { setEditing(false); setError(''); setLocation(savedLocation); }}>
          {t('track.decision.cancel')}
        </button>}
      </div>
    </form> : <>
      <p className="client-delivery-location__value" role="status">{savedLocation}</p>
      <p>{t(canEdit ? 'track.delivery.savedHint' : 'track.delivery.lockedHint')}</p>
      {canEdit && <button type="button" className="ui-button" onClick={() => { setLocation(savedLocation); setEditing(true); }}>
        {t('track.delivery.edit')}
      </button>}
    </>}
  </section>;
}
