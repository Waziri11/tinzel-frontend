import OrderNamePicker from './OrderNamePicker';
import PhoneInput from './PhoneInput';
import { ActionButton } from './SoftFlutter';
import { useLanguage } from '../../i18n/LanguageContext';
import AccountSecurity from './AccountSecurity';
import { errorText } from '../../i18n/errors';
import './security-controls.css';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import React, { useState } from 'react';
import { fetchWithTimeout, requestVerification, downloadFile } from '../../services/api';
import StatePanel, { StateError } from './StatePanel';
import { Feedback } from './UI';
import { useConfirm } from './ConfirmDialog';
import TinzelLogo from './TinzelLogo';

export async function securityRequest(path, body) {
  const response = await fetchWithTimeout(`/api/${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(errorText(data.message || 'Request failed', response.status)), { status: response.status, code: data.errorCode });
  return data;
}
export const downloadMagazine = (orderId, version) => downloadFile(
  `/api/security/orders/${encodeURIComponent(orderId)}/download/${encodeURIComponent(version)}`,
  `tinzel-${version}.pdf`, { key: `magazine:${orderId}:${version}` },
);
export default function SecurityCenter({ user }) {
  const { lang } = useLanguage(), t = (en, sw) => lang === 'sw' ? sw : en;
  const confirm = useConfirm();
  const [contactUpdated, setContactUpdated] = useState(false);
  const [open, setOpen] = useState(false), [selectedOrder, setSelectedOrder] = useState(null), [version, setVersion] = useState('print');
  const [events, setEvents] = useState([]), [searched, setSearched] = useState(false), [historyKind, setHistoryKind] = useState('downloads');
  const [loadedHistoryKind, setLoadedHistoryKind] = useState(null);
  const [message, setMessage] = useState(''), [error, setError] = useState(null), [historyError, setHistoryError] = useState(null);
  const [busy, setBusy] = useState(false), [historyBusy, setHistoryBusy] = useState(false), [destination, setDestination] = useState(''), [inviteUrl, setInviteUrl] = useState('');
  const close = () => { if (!busy && !historyBusy) setOpen(false); };
  useDialogFocus(open, close);
  const orderId = selectedOrder?._id || '';
  const privileged = ['admin', 'manager'].includes(user.role);
  const run = async fn => {
    setBusy(true); setMessage(''); setError(null);
    try { await fn(); } catch (e) { setError(e); } finally { setBusy(false); }
  };
  const searchHistory = async (kind = historyKind) => {
    setHistoryKind(kind); setHistoryBusy(true); setHistoryError(null);
    try {
      const query = kind === 'alerts' ? 'alerts=1' : `orderId=${encodeURIComponent(orderId)}`;
      const data = await securityRequest(`security/downloads?${query}`);
      setEvents(data.events || []); setLoadedHistoryKind(kind); setSearched(true);
    } catch (e) { setHistoryError(e); } finally { setHistoryBusy(false); }
  };
  const confirmRevoke = async (action, description) => {
    if (await confirm({ title: t('Remove this access?', 'Ondoa ufikiaji huu?'), description, danger: true, confirmLabel: t('Revoke access', 'Ondoa ufikiaji') })) await run(action);
  };
  return <>
    <button className="ui-button security-launcher" onClick={() => { setSelectedOrder(null); setEvents([]); setSearched(false); setLoadedHistoryKind(null); setInviteUrl(''); setError(null); setHistoryError(null); setMessage(''); setOpen(true); }} style={{ position: 'fixed', bottom: 18, right: 18, zIndex: 90 }}>{t('Security', 'Usalama')}</button>
    {open && <div className="auth-overlay" style={{ zIndex: 9000 }}><section className="security-panel" role="dialog" aria-modal="true" aria-label={t('Account security', 'Usalama wa akaunti')} style={{ background: 'white', padding: 24, borderRadius: 12, width: 'min(850px,100%)', maxHeight: '90dvh', overflow: 'auto' }}>
      <button className="ui-button" onClick={close} disabled={busy || historyBusy}>{t('Close', 'Funga')}</button>
      <TinzelLogo variant="wordmark" height={28} /><h2>{t('Account security', 'Usalama wa akaunti')}</h2>
      {error && <StateError error={error} />}{message && <Feedback kind="success" title={message} />}
      <AccountSecurity user={user} />
      {privileged && <>
        <h3>{t('Order access and downloads', 'Ufikiaji wa oda na upakuaji')}</h3>
        <OrderNamePicker value={selectedOrder} disabled={busy || historyBusy} onChange={order => { setSelectedOrder(order); setInviteUrl(''); setEvents([]); setSearched(false); setLoadedHistoryKind(null); setHistoryError(null); setError(null); setMessage(''); }} />
        {!orderId && <StatePanel compact kind="info" title={t('Choose an order to manage its access', 'Chagua oda ili kudhibiti ufikiaji wake')} description={t('You can also search all download history or security alerts below.', 'Unaweza pia kutafuta historia yote ya upakuaji au tahadhari za usalama hapa chini.')} />}
        <label>{t('Version or print', 'Toleo au chapa')}<input aria-label={t('Download version', 'Toleo la kupakua')} value={version} onChange={e => setVersion(e.target.value)} /></label>
        <div className="tinzel-state__actions">
          <ActionButton className="ui-button" loading={busy} disabled={busy || !orderId || !version.trim()} onClick={() => run(async () => { await downloadMagazine(orderId, version); setMessage(t('The file was handed to your browser. Check your downloads.', 'Faili limekabidhiwa kwa kivinjari. Angalia vipakuliwa vyako.')); })}>{t('Download original', 'Pakua nakala halisi')}</ActionButton>
          <ActionButton className="ui-button" disabled={busy || !orderId} onClick={() => confirmRevoke(async () => { await securityRequest(`security/orders/${orderId}/revoke-client`, {}); setMessage(t('Client sessions revoked.', 'Vipindi vya mteja vimeondolewa.')); }, t('The customer will need to verify access to this order again.', 'Mteja atahitaji kuthibitisha ufikiaji wa oda hii tena.'))}>{t('Revoke client sessions', 'Ondoa vipindi vya mteja')}</ActionButton>
          <ActionButton className="ui-button" loading={busy} disabled={busy || !orderId} onClick={() => run(async () => { const data = await securityRequest(`printer/orders/${orderId}/invite`, {}); setInviteUrl(data.url); setMessage(t('Printer invitation issued. It expires in 24 hours.', 'Mwaliko wa mchapishaji umetolewa. Unaisha baada ya saa 24.')); })}>{t('Issue printer invitation', 'Toa mwaliko wa mchapishaji')}</ActionButton>
          <ActionButton className="ui-button" disabled={busy || !orderId} onClick={() => confirmRevoke(async () => { await securityRequest(`printer/orders/${orderId}/revoke`, {}); setInviteUrl(''); setMessage(t('Printer access revoked.', 'Ufikiaji wa mchapishaji umeondolewa.')); }, t('Existing printer access to this order will stop working.', 'Ufikiaji uliopo wa mchapishaji kwa oda hii hautatumika tena.'))}>{t('Revoke printer access', 'Ondoa ufikiaji wa mchapishaji')}</ActionButton>
          <ActionButton className="ui-button" loading={historyBusy} disabled={busy || historyBusy} onClick={() => searchHistory('downloads')}>{t('Search download history', 'Tafuta historia ya upakuaji')}</ActionButton>
          <ActionButton className="ui-button" loading={historyBusy} disabled={busy || historyBusy} onClick={() => searchHistory('alerts')}>{t('View security alerts', 'Angalia tahadhari za usalama')}</ActionButton>
        </div>
        {inviteUrl && <p className="state-inline"><a href={inviteUrl} target="_blank" rel="noreferrer">{t('Open printer invitation', 'Fungua mwaliko wa mchapishaji')}</a></p>}
        {historyBusy && <StatePanel compact kind="loading" title={t('Loading security history…', 'Tunapakia historia ya usalama…')} />}
        {historyError && <StateError error={historyError} title={historyKind === 'alerts' ? t('Security alerts could not be loaded', 'Tahadhari za usalama hazikuweza kupakiwa') : t('Download history could not be loaded', 'Historia ya upakuaji haikuweza kupakiwa')} onRetry={() => searchHistory()} />}
        {historyError && searched && <StatePanel compact kind="warning" title={t('Showing results from the previous search', 'Inaonyesha matokeo ya utafutaji wa awali')} description={loadedHistoryKind === 'alerts' ? t('These are previously loaded security alerts. The latest search did not complete.', 'Hizi ni tahadhari za usalama zilizopakiwa awali. Utafutaji wa mwisho haujakamilika.') : t('These are previously loaded download records. The latest search did not complete.', 'Hizi ni rekodi za upakuaji zilizopakiwa awali. Utafutaji wa mwisho haujakamilika.')} />}
        {!historyBusy && !historyError && searched && !events.length && <StatePanel compact title={historyKind === 'alerts' ? t('No security alerts found', 'Hakuna tahadhari za usalama') : t('No downloads found', 'Hakuna upakuaji uliopatikana')} description={t('New records will appear here after the activity occurs.', 'Rekodi mpya zitaonekana hapa baada ya shughuli kufanyika.')} />}
        {!!events.length && <div style={{ overflowX: 'auto', maxWidth: '100%' }}><table><caption>{loadedHistoryKind === 'alerts' ? t('Security alerts', 'Tahadhari za usalama') : t('Download history', 'Historia ya upakuaji')}</caption><thead><tr><th>{t('Time', 'Muda')}</th><th>{t('Actor', 'Mtendaji')}</th><th>{t('Order / version', 'Oda / toleo')}</th><th>{t('Outcome', 'Matokeo')}</th></tr></thead><tbody>{events.map(e => <tr key={e.eventId}><td>{new Date(e.createdAt).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB')}</td><td>{e.actorName || e.role}</td><td>{e.orderClientName || (String(e.orderId) === orderId && selectedOrder?.clientName) || t('Order no longer available', 'Oda haipatikani tena')} / {e.version}</td><td>{/denied|blocked|fail/i.test(e.action) ? t('Access denied', 'Ufikiaji umekataliwa') : t('Access recorded', 'Ufikiaji umerekodiwa')}</td></tr>)}</tbody></table></div>}
      </>}
      <h3>{t('Change verified phone', 'Badilisha simu iliyothibitishwa')}</h3><label>{t('New phone number', 'Namba mpya ya simu')}<PhoneInput value={destination} onChange={e => setDestination(e.target.value)} /></label>
      <ActionButton className="ui-button is-primary" loading={busy} disabled={busy || !destination} onClick={() => run(async () => {
        let challenge = await securityRequest('staff/contact', { channel: 'sms', destination });
        await requestVerification({ ...challenge, channel: 'sms', verify: code => securityRequest('staff/contact/verify', { challengeId: challenge.challengeId, code }), resend: async () => { challenge = await securityRequest('staff/contact', { channel: 'sms', destination }); return challenge; } });
        setMessage(t('Your new phone is verified. Sign in again to use it.', 'Simu yako mpya imethibitishwa. Ingia tena ili kuitumia.')); setDestination(''); setContactUpdated(true);
      })}>{t('Verify new contact', 'Thibitisha mawasiliano mapya')}</ActionButton>
      {contactUpdated && <button className="ui-button" onClick={() => window.location.reload()}>{t('Sign in again', 'Ingia tena')}</button>}
    </section></div>}
  </>;
}
