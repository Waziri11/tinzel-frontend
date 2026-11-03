import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatUploadBytes } from '../../utils/uploadProgress';
import './loading.css';
const labels = {
  preparing: ['Preparing file…', 'Inaandaa faili…'],
  checking: ['Checking file…', 'Inakagua faili…'],
  transferring: ['Downloading…', 'Inapakua…'],
  uploading: ['Uploading…', 'Inapakia…'],
  finalizing: ['Waiting for confirmation…', 'Inasubiri uthibitisho…'],
  verifying: ['Complete SMS verification to continue', 'Kamilisha uthibitisho wa SMS ili kuendelea'],
  reconnecting: ['Reconnecting…', 'Inaunganisha tena…'],
  'handed-off': ['Download started in your browser', 'Upakuaji umeanza kwenye kivinjari'],
  error: ['Transfer interrupted — retry from the original action', 'Uhamisho umesimama — jaribu tena kwenye kitendo cha awali'],
  cancelled: ['Transfer cancelled', 'Uhamisho umeghairiwa'],
};
export default function TransferProgress({ progress, label, paused = false }) {
  const { lang } = useLanguage(), sw = lang === 'sw';
  if (!progress) return null;
  const stage = paused ? 'error' : progress.stage;
  const complete = stage === 'complete';
  const frozen = ['error', 'cancelled'].includes(stage);
  const measured = frozen || ['uploading', 'transferring', 'complete'].includes(stage);
  const value = frozen ? (progress.percent || 0) : progress.percent;
  const percent = measured && Number.isFinite(value) ? Math.max(0, Math.min(complete ? 100 : 99, value)) : null;
  const status = complete ? (progress.kind === 'download' ? (sw ? 'Faili iko tayari — angalia vipakuliwa' : 'File ready — check your downloads') : (sw ? 'Upakiaji umekamilika' : 'Upload confirmed')) : labels[stage]?.[sw ? 1 : 0] || (sw ? 'Inaandaa…' : 'Preparing…');
  return <div className="transfer-progress" data-stage={stage} aria-busy={!['complete', 'error', 'cancelled', 'handed-off'].includes(stage)}>
    <div className="transfer-progress__heading"><span role="status">{label || status}</span>{percent !== null && <span aria-hidden="true">{Math.floor(percent)}%</span>}</div>
    {label && <small role="status">{status}</small>}
    <progress aria-label={label || status} max="100" value={percent ?? undefined} />
    {progress.bytes > 0 && <small>{formatUploadBytes(progress.bytes)}{progress.total > 0 ? ` / ${formatUploadBytes(progress.total)}` : ''}</small>}
  </div>;
}
