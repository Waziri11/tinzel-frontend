import { ActionButton } from '../common/SoftFlutter';
import StatePanel, { StateError } from '../common/StatePanel';
import { useConfirm } from '../common/ConfirmDialog';
import { useLanguage } from '../../i18n/LanguageContext';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import React, { useState } from 'react';
import { api } from '../../services/api';
import { useVisiblePolling } from '../../hooks/useVisiblePolling';
export const onboardingLabel = (user) =>
  !user.mustChangePassword
    ? 'Ready'
    : new Date(user.temporaryPasswordExpiresAt) <= new Date()
      ? 'Initial password expired'
      : 'Awaiting first sign-in';
const controlStyle = {
  padding: '8px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: 5,
  background: 'var(--bg-primary, white)',
  color: 'var(--text-primary)',
  font: 'inherit',
  cursor: 'pointer',
};
export default function StaffOnboardingStatus({ user, token, onUpdate, role = 'admin' }) {
  const tx = useInterfaceText();
  const confirm = useConfirm();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const deliveryText = status => ({ sent: ui('provider accepted', 'Mtoa huduma amepokea'), delivered: ui('delivered', 'Imefika'), failed: ui('failed', 'Imeshindikana'), undelivered: ui('not delivered', 'Haijafika'), unconfirmed: ui('acceptance unconfirmed', 'Kupokelewa hakujathibitishwa'), skipped: ui('not sent', 'Haijatumwa'), pending: ui('waiting to send', 'Inasubiri kutumwa') }[status] || ui('not issued', 'Haijatolewa'));

  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const expired = user.mustChangePassword && new Date(user.temporaryPasswordExpiresAt) <= new Date();
  const refresh = async () => {
    const data = await api.staffManagement(role).getStaffUser(token, user._id);
    onUpdate(data.user);
  };
  useVisiblePolling(refresh, Boolean(user.mustChangePassword));
  const issue = async () => {
    if (
      !await confirm({title: ui('Issue a new initial password?', 'Toa nenosiri jipya la mwanzo?'), description: ui('This signs the user out, replaces their password and sends new credentials by SMS and email.', 'Hii itamtoa mtumiaji, kubadilisha nenosiri na kutuma taarifa mpya kwa SMS na barua pepe.'), confirmLabel: ui('Issue password', 'Toa nenosiri'), danger: true})
    )
      return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await api.staffManagement(role).issueInitialPassword(token, user._id);
      onUpdate(data.user);
      setNotice(ui('New initial password issued. Check SMS and email outcomes below.', 'Nenosiri jipya la mwanzo limetolewa. Angalia matokeo ya SMS na barua pepe hapa chini.'));
    } catch (error) {
      setError(
        error.code === 'STAFF_CREDENTIAL_CONFIG_REQUIRED'
          ? ui('Staff credential delivery is not configured. Configure the credential encryption key before issuing passwords.', 'Uwasilishaji wa taarifa za kuingia za wafanyakazi haujasanidiwa. Sanidi ufunguo wa usimbaji kabla ya kutoa manenosiri.')
          : error,
      );
    } finally {
      setBusy(false);
    }
  };
  const retry = async (channel, status) => {
    const uncertain = status === 'unconfirmed';
    if (uncertain && !await confirm({title: ui('Retry this delivery?', 'Jaribu kutuma tena?'), description: ui('Provider acceptance is unknown. Retrying may send a duplicate.', 'Haijulikani kama mtoa huduma amepokea. Kujaribu tena kunaweza kutuma nakala nyingine.'), confirmLabel: ui('Retry delivery', 'Tuma tena')}))
      return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await api.staffManagement(role).retryCredentialDelivery(token, user._id, channel, uncertain);
      onUpdate(data.user);
      setNotice(ui('Retry processed. Check the channel outcome.', 'Jaribio limeshughulikiwa. Angalia matokeo ya njia ya ujumbe.'));
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      style={{ margin: '16px 0', padding: 12, border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 13 }}
      aria-label={tx('Account setup and credential delivery')}
    >
      <StatePanel compact kind={user.isActive === false || expired ? 'warning' : user.mustChangePassword ? 'info' : 'success'} title={user.isActive === false ? ui('Account disabled', 'Akaunti imezimwa') : !user.mustChangePassword ? ui('Account setup complete', 'Akaunti iko tayari') : expired ? ui('Initial password expired', 'Nenosiri la mwanzo limeisha muda') : ui('Awaiting first sign-in', 'Inasubiri kuingia kwa mara ya kwanza')} description={expired ? ui('Issue a new initial password to let this staff member finish setup.', 'Toa nenosiri jipya la mwanzo ili mfanyakazi akamilishe usajili.') : undefined} />
      {user.mustChangePassword && (
        <p>
          <InterfaceText>Initial password expires:</InterfaceText>{' '}
          {new Date(user.temporaryPasswordExpiresAt).toLocaleString()}
        </p>
      )}
      <p>
        <InterfaceText>Notification language:</InterfaceText>{' '}
        {user.preferredLanguage === 'en' ? 'English' : 'Kiswahili'}
      </p>
      {['sms', 'email'].map((channel) => {
        const delivery = user.credentialDelivery?.[channel];
        return (
          <div key={channel} style={{ margin: '8px 0', overflowWrap: 'anywhere' }}>
            <span>
              {channel.toUpperCase()}: {deliveryText(delivery?.status)}
              {delivery?.attempts ? ` · ${delivery.attempts}/5 ${ui('attempts', 'majaribio')}` : ''}
            </span>
            {delivery?.error && <p style={{ color: 'var(--accent-danger)' }}>{delivery.error}</p>}
            {user.mustChangePassword &&
              !expired &&
              ['failed', 'undelivered', 'unconfirmed', 'skipped'].includes(delivery?.status) && (
                <ActionButton loading={busy}
                  type="button"
                  disabled={busy}
                  onClick={() => retry(channel, delivery.status)}
                  style={{ ...controlStyle, marginLeft: 8 }}
                >
                  <InterfaceText>Retry</InterfaceText> {channel.toUpperCase()}
                </ActionButton>
              )}
          </div>
        );
      })}
      {user.credentialDelivery?.error && (
        <p role="alert" style={{ color: 'var(--accent-danger)' }}>
          {user.credentialDelivery.error}
        </p>
      )}
      {error && <StateError compact error={error} description={typeof error === 'string' ? error : undefined} />}
      {notice && <StatePanel compact kind="success" title={notice} />}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <ActionButton loading={busy} type="button" style={controlStyle} disabled={busy || !user.isActive} onClick={issue}>
          <InterfaceText>Issue new initial password</InterfaceText>
        </ActionButton>
        <ActionButton loading={busy}
          type="button"
          style={controlStyle}
          disabled={busy}
          onClick={() => refresh().catch(error => setError(error))}
        >
          <InterfaceText>Refresh delivery status</InterfaceText>
        </ActionButton>
      </div>
    </section>
  );
}
