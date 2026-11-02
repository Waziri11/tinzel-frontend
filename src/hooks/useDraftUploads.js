import { useSyncExternalStore } from 'react';
import { createDraftQueue } from '../services/backgroundDraftQueue';
import { transferDraft, cancelDraftUpload } from '../services/draftUpload';
export const draftUploads = createDraftQueue({ transfer: transferDraft, cancelSaved: cancelDraftUpload,
  onSubmitted: () => window.dispatchEvent(new Event('tinzel:draft-submitted')) });
export const useDraftUploads = () => useSyncExternalStore(draftUploads.subscribe, draftUploads.getSnapshot);
