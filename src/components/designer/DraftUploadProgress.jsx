import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import React from 'react';
import { formatUploadBytes } from '../../utils/uploadProgress';
const labels = {
  checking: 'Checking your magazine',
  uploading: 'Uploading your magazine',
  reconnecting: 'Reconnecting',
  finalizing: 'Finalizing draft',
  complete: 'Draft uploaded',
};
export default function DraftUploadProgress({ progress, paused = false }) {
  const tx = useInterfaceText();
  if (!progress) return null;
  const { stage, percent, bytes, total, speed, remaining } = progress;
  return (
    <div className="draft-upload-progress" aria-live="polite">
      <div>
        <strong className={paused || stage === 'complete' ? '' : 'upload-animated-text'}>
          {tx(paused ? 'Upload interrupted' : labels[stage] || 'Preparing upload')}
          {!paused && stage !== 'complete' && <span aria-hidden="true">…</span>}
        </strong>
        <span>{Math.floor(percent)}%</span>
      </div>
      <progress aria-label={tx('Magazine upload progress')} max="100" value={percent} />
      <small>
        {formatUploadBytes(bytes)} / {formatUploadBytes(total)}
        {!paused && speed > 0 && stage === 'uploading' ? ` · ${formatUploadBytes(speed)}/s` : ''}
        {!paused && remaining > 0 && Number.isFinite(remaining) && stage === 'uploading'
          ? ` · ${tx('About {minutes} min remaining').replace('{minutes}', Math.ceil(remaining / 60))}`
          : ''}
      </small>
      {stage === 'finalizing' && (
        <p>
          <InterfaceText>All file parts transferred. Waiting for server confirmation.</InterfaceText>
        </p>
      )}
    </div>
  );
}
