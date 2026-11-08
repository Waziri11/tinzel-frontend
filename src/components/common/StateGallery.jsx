import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import StatePanel, { StateError } from './StatePanel';
import PageSkeleton from './PageSkeleton';
import TinzelLogo from './TinzelLogo';
import LanguageSwitcher from './LanguageSwitcher';
import { useConfirm } from './ConfirmDialog';
import TransferProgress from './TransferProgress';
import { stateGalleryPages } from './stateGalleryData';
import './stateGallery.css';
const labels = {
  ready: ['Ready', 'Tayari'], loading: ['Loading', 'Inapakia'], empty: ['Empty', 'Hakuna taarifa'],
  'no-results': ['No matches', 'Hakuna matokeo'], error: ['Request failed', 'Ombi limeshindwa'], offline: ['Offline', 'Hakuna intaneti'],
  success: ['Success', 'Imefanikiwa'], saving: ['Saving or uploading', 'Inahifadhi au kupakia'], validation: ['Validation', 'Hakiki taarifa'],
  conflict: ['Changed information', 'Taarifa zimebadilika'], expired: ['Expired access', 'Ufikiaji umeisha'], denied: ['Access unavailable', 'Ufikiaji hauruhusiwi'],
  partial: ['Partial failure', 'Baadhi yameshindwa'], unavailable: ['Unavailable artwork', 'Picha haipatikani'],
};
export default function StateGallery() {
  const { lang } = useLanguage(), ui = (en, sw) => lang === 'sw' ? sw : en;
  const confirm = useConfirm();
  const [selected, setSelected] = useState('3'), [state, setState] = useState('error'), [mobile, setMobile] = useState(false), [recovered, setRecovered] = useState(false);
  const page = stateGalleryPages.find(row => row.id === selected);
  const retry = () => setRecovered(true);
  const effectiveState = recovered ? 'success' : state;
  return <main className="state-gallery">
    <header><TinzelLogo height={38} /><LanguageSwitcher /></header>
    <span className="ui-eyebrow">{ui('Local design review', 'Uhakiki wa muundo wa ndani')}</span>
    <h1 className="ui-title">{ui('Page states', 'Hali za kurasa')}</h1>
    <p className="ui-description">{ui('Review Tinzel’s shared states across 51 pages and surfaces. These examples use sample content; retry and confirmation controls are demonstrations.', 'Hakiki hali za Tinzel katika kurasa na sehemu 51. Mifano hii hutumia taarifa za majaribio; vitufe vya kujaribu tena na kuthibitisha ni vya kuonesha tu.')}</p>
    <div className="state-gallery__controls">
      <label>{ui('Page', 'Ukurasa')}<select aria-label={ui('Page', 'Ukurasa')} value={selected} onChange={event => { const next = stateGalleryPages.find(row => row.id === event.target.value); setSelected(next.id); setState(next.states.includes(state) ? state : next.states[0]); setRecovered(false); }}>{stateGalleryPages.map(row => <option value={row.id} key={row.id}>{lang === 'sw' ? row.sw : row.en}</option>)}</select></label>
      <label>{ui('State', 'Hali')}<select aria-label={ui('State', 'Hali')} value={state} onChange={event => { setState(event.target.value); setRecovered(false); }}>{page.states.map(value => <option key={value} value={value}>{labels[value][lang === 'sw' ? 1 : 0]}</option>)}</select></label>
      <button className="ui-button" aria-pressed={mobile} onClick={() => setMobile(value => !value)}>{ui('Mobile preview', 'Hakikisho la simu')}</button>
      <button className="ui-button" onClick={async () => { await confirm({ title: ui('Discard these changes?', 'Uache mabadiliko haya?'), description: ui('This demonstration does not change any order or saved information.', 'Mfano huu haubadilishi oda au taarifa zilizohifadhiwa.'), confirmLabel: ui('Discard changes', 'Acha mabadiliko'), cancelLabel: ui('Keep editing', 'Endelea kuhariri'), danger: true }); }}>{ui('Preview confirmation', 'Hakiki uthibitisho')}</button>
    </div>
    <section className={`state-gallery__preview ${mobile ? 'is-mobile' : ''}`} aria-label={ui('State preview', 'Hakikisho la hali')}>
      <h2>{lang === 'sw' ? page.sw : page.en}</h2>
      {effectiveState === 'loading' ? <PageSkeleton variant={page.variant} /> :
        ['error', 'expired', 'denied', 'conflict'].includes(effectiveState) ? <StateError compact={false} error={{ status: { error: 503, expired: 401, denied: 403, conflict: 409 }[effectiveState] }} onRetry={retry} /> :
        effectiveState === 'saving' ? <StatePanel kind="loading" title={ui('Uploading your file…', 'Tunapakia faili lako…')} description={ui('Keep this page open until the saved result is confirmed.', 'Acha ukurasa huu wazi hadi uhifadhi uthibitishwe.')}><TransferProgress progress={{ stage: 'uploading', percent: 64 }} label={ui('Example magazine', 'Jarida la mfano')} /></StatePanel> :
        effectiveState === 'empty' ? <StatePanel title={ui('Nothing here yet', 'Hakuna taarifa bado')} description={ui('New information will appear here when it is available.', 'Taarifa mpya zitaonekana hapa zitakapopatikana.')} /> :
        effectiveState === 'no-results' ? <StatePanel title={ui('No matches found', 'Hakuna matokeo yaliyopatikana')} description={ui('Try a different search or clear your filters.', 'Jaribu kutafuta tofauti au ondoa vichujio.')}><button className="ui-button" onClick={retry}>{ui('Clear filters', 'Ondoa vichujio')}</button></StatePanel> :
        effectiveState === 'offline' ? <StatePanel kind="warning" title={ui('You are offline', 'Huna muunganisho wa intaneti')} description={ui('Reconnect, then try again. Check the saved result before repeating a submission.', 'Unganisha intaneti, kisha ujaribu tena. Hakiki kilichohifadhiwa kabla ya kutuma tena.')} onRetry={retry} /> :
        effectiveState === 'validation' ? <StatePanel kind="warning" title={ui('Check the highlighted fields', 'Hakiki sehemu zilizooneshwa')} description={ui('Enter the missing information before continuing.', 'Jaza taarifa zinazokosekana kabla ya kuendelea.')}><label>{ui('Your name', 'Jina lako')}<input aria-invalid="true" aria-describedby="gallery-field-error" /><small id="gallery-field-error">{ui('Please enter your name.', 'Tafadhali andika jina lako.')}</small></label></StatePanel> :
        effectiveState === 'partial' ? <><div className="ui-card">{ui('Previously loaded information remains available.', 'Taarifa zilizopakiwa awali bado zinapatikana.')}</div><StatePanel compact kind="warning" title={ui('Some information could not be refreshed', 'Baadhi ya taarifa hazikuweza kusasishwa')} description={ui('Retry only the failed section.', 'Jaribu tena sehemu iliyoshindwa pekee.')} onRetry={retry} /></> :
        effectiveState === 'unavailable' ? <StatePanel kind="info" title={ui('Preview unavailable', 'Hakikisho halipatikani')} description={ui('You can continue using this page.', 'Unaweza kuendelea kutumia ukurasa huu.')} /> :
        <StatePanel kind="success" title={effectiveState === 'ready' ? ui('Ready to continue', 'Tayari kuendelea') : ui('Changes saved', 'Mabadiliko yamehifadhiwa')} description={ui('This is a sample confirmed outcome.', 'Huu ni mfano wa matokeo yaliyothibitishwa.')} />}
    </section>
  </main>;
}
