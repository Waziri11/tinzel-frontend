import React, { useCallback } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import VoiceNotePlayer from './VoiceNotePlayer';

export default function RevisionAudioPlayer({ token, orderId, requestId, item, client = false }) {
  const { lang } = useLanguage();
  const loadAudio = useCallback(signal => api.revisionAudio(token, { client, orderId, requestId, itemId: item?._id, signal }),
    [token, client, orderId, requestId, item?._id]);
  if (!item?.audio) return null;
  return <VoiceNotePlayer loadAudio={loadAudio} label={lang === 'sw' ? 'Maoni ya sauti' : 'Audio feedback'} />;
}
