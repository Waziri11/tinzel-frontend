import { Feedback } from './UI';
import './revisionAudio.css';
import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const MAX_BYTES = 3 * 1024 * 1024;
const recordingType = () => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type)) || '';
};
export default function RevisionAudioInput({ file, onChange, disabled, onBusyChange }) {
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [preview, setPreview] = useState('');
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState('');
  const session = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    if (!file) { setPreview(''); setLimitReached(false); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const active = session.current;
      if (active) {
        clearInterval(active.timer);
        active.recorder.onstop = null;
        if (active.recorder.state !== 'inactive') active.recorder.stop();
        active.stream.getTracks().forEach(track => track.stop());
      }
      onBusyChange(false);
    };
  }, [onBusyChange]);

  const choose = (next, recorded = false) => {
    setError('');
    if (!next) return;
    if (!recorded) setLimitReached(false);
    if (!next.size || next.size > MAX_BYTES) { setLimitReached(false); setError(ui('Choose an audio file up to 3 MB.', 'Chagua faili la sauti lisilozidi MB 3.')); return; }
    if (!/\.(mp3|m4a|mp4|wav|ogg|oga|opus|webm|aac)$/i.test(next.name)) { setLimitReached(false); setError(ui('Choose MP3, M4A, WAV, OGG, WebM or AAC audio.', 'Chagua sauti ya MP3, M4A, WAV, OGG, WebM au AAC.')); return; }
    onChange(next);
  };
  const stop = () => {
    const active = session.current;
    if (active?.recorder.state === 'recording') active.recorder.stop();
  };
  const start = async () => {
    setError(''); setLimitReached(false); setPending(true); onBusyChange(true);
    let stream;
    try {
      const mimeType = recordingType();
      if (!mimeType) throw new DOMException('Unsupported recording format', 'NotSupportedError');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return; }
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 });
      const chunks = [];
      let size = 0;
      let failed = false;
      const active = { recorder, stream, timer: null };
      session.current = active;
      recorder.ondataavailable = event => {
        chunks.push(event.data); size += event.data.size;
        if (size > MAX_BYTES) stop();
      };
      recorder.onerror = () => { failed = true; stop(); };
      recorder.onstop = () => {
        clearInterval(active.timer);
        stream.getTracks().forEach(track => track.stop());
        session.current = null;
        if (!mounted.current) return;
        setRecording(false); onBusyChange(false);
        if (failed) { setLimitReached(false); setError(ui('Recording failed. Please try again or attach audio.', 'Imeshindikana kurekodi. Jaribu tena au ambatisha sauti.')); return; }
        const type = recorder.mimeType.split(';')[0];
        const extension = type === 'audio/mp4' ? 'm4a' : type === 'audio/ogg' ? 'ogg' : 'webm';
        choose(new File(chunks, `voice-note.${extension}`, { type }), true);
      };
      recorder.start(1000);
      setSeconds(0); setRecording(true);
      let elapsed = 0;
      active.timer = setInterval(() => { elapsed += 1; setSeconds(elapsed); if (elapsed >= 180) { setLimitReached(true); stop(); } }, 1000);
    } catch (failure) {
      stream?.getTracks().forEach(track => track.stop());
      if (mounted.current) {
        setError(failure.name === 'NotSupportedError'
          ? ui('This browser cannot record a supported audio format. Attach an audio file or type your feedback.', 'Kivinjari hiki hakiwezi kurekodi aina ya sauti inayokubalika. Ambatisha faili la sauti au andika maoni yako.')
          : ['NotAllowedError', 'SecurityError'].includes(failure.name)
            ? ui('Microphone access was not allowed. Allow microphone access in your browser, or attach an audio file.', 'Ufikiaji wa maikrofoni haukuruhusiwa. Ruhusu maikrofoni kwenye kivinjari chako, au ambatisha faili la sauti.')
            : ui('The microphone could not start. Check that it is connected and available, or attach an audio file.', 'Maikrofoni haikuweza kuanza. Hakiki kuwa imeunganishwa na inapatikana, au ambatisha faili la sauti.'));
        onBusyChange(false);
      }
    } finally { if (mounted.current) setPending(false); }
  };
  const canRecord = Boolean(recordingType() && navigator.mediaDevices?.getUserMedia);
  return (
    <section className="revision-audio" aria-label={ui('Audio feedback', 'Maoni ya sauti')} style={{ padding: 16, marginBottom: 16, border: '1px solid var(--border-color)', borderRadius: 8 }}>
      <strong>{ui('Send a voice note', 'Tuma ujumbe wa sauti')}</strong>
      <p style={{ fontSize: 13, margin: '8px 0' }}>{ui('Use audio instead of text, or include both. Files up to 3 MB; recordings up to 3 minutes.', 'Tumia sauti badala ya maandishi, au tumia vyote. Faili hadi MB 3; rekodi hadi dakika 3.')}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="file" accept="audio/*,.m4a,.opus" aria-label={ui('Attach audio', 'Ambatisha sauti')} disabled={disabled || recording || pending}
          onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} style={{ maxWidth: '100%', minWidth: 0 }} />
        {canRecord && <button type="button" className="secondary-button" disabled={disabled || pending} onClick={recording ? stop : start}>
          {recording ? ui('Stop recording', 'Simamisha kurekodi') : pending ? ui('Opening microphone…', 'Inafungua maikrofoni…') : ui('Record voice note', 'Rekodi ujumbe wa sauti')}
        </button>}
        {recording && <span role="status">{ui('Recording', 'Inarekodi')} {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>}
      </div>
      {!canRecord && <Feedback kind="info" title={ui('Recording is not supported here', 'Kurekodi hakupatikani hapa')}>{ui('Attach an audio file, or type your feedback instead.', 'Ambatisha faili la sauti, au andika maoni yako.')}</Feedback>}
      {limitReached && <Feedback kind="info" title={ui('Three-minute recording limit reached', 'Kikomo cha dakika tatu kimefikiwa')}>{ui('Review your recording before sending it.', 'Sikiliza rekodi yako kabla ya kuituma.')}</Feedback>}
      {file && <div style={{ marginTop: 12 }}>
        <p style={{ overflowWrap: 'anywhere', fontSize: 13 }}>{file.name}</p>
        {preview && <audio controls src={preview} aria-label={ui('Preview audio feedback', 'Sikiliza maoni ya sauti')} style={{ display: 'block', width: '100%', maxWidth: 400 }} />}
        <button type="button" className="secondary-button" disabled={disabled || recording || pending} onClick={() => { setLimitReached(false); setError(''); onChange(null); }} style={{ marginTop: 8 }}>{ui('Remove audio', 'Ondoa sauti')}</button>
      </div>}
      {error && <Feedback kind="error" title={ui("Audio needs attention", "Sauti inahitaji kuangaliwa")}>{error}</Feedback>}
    </section>
  );
}
