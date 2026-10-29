import React from 'react';
import { formatUploadBytes } from '../../utils/uploadProgress';
const labels={checking:'Checking your magazine',uploading:'Uploading your magazine',reconnecting:'Reconnecting',finalizing:'Finalizing draft',complete:'Draft uploaded'};
export default function DraftUploadProgress({progress}) {
  if(!progress)return null;
  const {stage,percent,bytes,total,speed,remaining}=progress;
  return <div className="draft-upload-progress" aria-live="polite">
    <div><strong className={stage==='complete'?'':'upload-animated-text'}>{labels[stage]||'Preparing upload'}<span aria-hidden="true">…</span></strong><span>{Math.floor(percent)}%</span></div>
    <progress aria-label="Magazine upload progress" max="100" value={percent}/>
    <small>{formatUploadBytes(bytes)} / {formatUploadBytes(total)}{speed>0&&stage==='uploading'?` · ${formatUploadBytes(speed)}/s`:''}{remaining>0&&Number.isFinite(remaining)&&stage==='uploading'?` · About ${Math.ceil(remaining/60)} min remaining`:''}</small>
    {stage==='finalizing'&&<p>All file parts transferred. Waiting for server confirmation.</p>}
  </div>;
}
