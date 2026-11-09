import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Pause, Play, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './voiceNotePlayer.css';

const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function VoiceNotePlayer({ loadAudio, file, label }) {
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const audio = useRef(null), url = useRef(''), request = useRef(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false), [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0), [speed, setSpeed] = useState(1);

  useEffect(() => {
    setLoading(false); setError(false); setPlaying(false); setPosition(0); setDuration(0); setSpeed(1);
    const element = audio.current;
    if (file) {
      url.current = URL.createObjectURL(file);
      element.src = url.current;
      element.playbackRate = 1;
      element.load();
    }
    return () => {
      request.current?.abort(); request.current = null;
      element.pause(); element.removeAttribute('src'); element.load();
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = '';
    };
  }, [loadAudio, file]);

  const play = async () => {
    if (audio.current.ended) audio.current.currentTime = 0;
    try { await audio.current.play(); }
    catch (failure) {
      // Some browsers require another tap after loading protected media.
      if (!['NotAllowedError', 'AbortError'].includes(failure.name)) setError(true);
    }
  };
  const toggle = async () => {
    if (request.current) return;
    if (url.current && !error) {
      if (audio.current.paused) await play(); else audio.current.pause();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError(false);
    try {
      const blob = file || await loadAudio(controller.signal);
      if (controller.signal.aborted) return;
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(blob);
      audio.current.src = url.current;
      audio.current.playbackRate = speed;
      await play();
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) { request.current = null; setLoading(false); }
    }
  };
  const updateDuration = event => {
    const value = event.currentTarget.duration;
    if (Number.isFinite(value) && value > 0) setDuration(value);
  };
  const action = loading ? ui('Loading audio…', 'Inapakia sauti…') : error ? ui('Retry audio', 'Jaribu sauti tena')
    : playing ? ui(`Pause ${label.toLowerCase()}`, 'Sitisha maoni ya sauti') : ui(`Play ${label.toLowerCase()}`, 'Cheza maoni ya sauti');
  const Icon = loading ? LoaderCircle : error ? RotateCcw : playing ? Pause : Play;
  return <div className={`voice-note-player${error ? ' has-error' : ''}`} role="group" aria-label={ui(`${label} player`, 'Kicheza maoni ya sauti')}>
    <audio ref={audio} hidden preload="metadata" aria-label={label} data-voice-note
      onLoadedMetadata={updateDuration} onDurationChange={updateDuration}
      onTimeUpdate={event => setPosition(event.currentTarget.currentTime || 0)}
      onPlay={event => {
        document.querySelectorAll('audio[data-voice-note]').forEach(other => { if (other !== event.currentTarget) other.pause(); });
        setPlaying(true);
      }}
      onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onError={() => { if (audio.current?.getAttribute('src')) { setError(true); setPlaying(false); setLoading(false); } }} />
    <div className="voice-note-controls">
      <button type="button" className="voice-note-play" onClick={toggle} disabled={loading} aria-label={action} title={action}>
        <Icon size={18} aria-hidden="true" className={loading ? 'voice-note-spinner' : undefined} fill={!loading && !error ? 'currentColor' : 'none'} />
      </button>
      <div className="voice-note-track">
        <input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 0)}
          disabled={!duration || loading || error} aria-label={ui('Audio position', 'Nafasi ya sauti')}
          aria-valuetext={`${clock(position)} / ${duration ? clock(duration) : '--:--'}`}
          style={{ '--voice-progress': `${duration ? Math.min(100, position / duration * 100) : 0}%` }}
          onChange={event => { const value = Number(event.target.value); audio.current.currentTime = value; setPosition(value); }} />
        <div className="voice-note-time" aria-hidden="true"><span>{clock(position)}</span><span>{duration ? clock(duration) : '--:--'}</span></div>
      </div>
      <button type="button" className="voice-note-speed" aria-label={ui(`Playback speed: ${speed}×`, `Kasi ya sauti: ${speed}×`)}
        onClick={() => { const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; audio.current.playbackRate = next; setSpeed(next); }}>{speed}×</button>
    </div>
    {error && <span className="voice-note-error" role="alert">{ui('Audio could not open. Tap to retry.', 'Sauti haikufunguka. Gusa ujaribu tena.')}</span>}
  </div>;
}
