import { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';

// Restore once per authenticated account/order; user changes are serialized so rapid toggles cannot race.
export function useAccountLanguage(kind, token, identity, savedLanguage, onError) {
  const { setLang } = useLanguage();
  const restored = useRef(null), queue=useRef(Promise.resolve()), errorHandler=useRef(onError);
  errorHandler.current=onError;
  useEffect(()=>{
    if(!token || !identity) {restored.current=null;return;}
    const key=`${kind}:${identity}:${token}`;
    if(restored.current===key)return;
    restored.current=key;
    setLang(savedLanguage === 'en' ? 'en' : 'sw',{persist:false});
  },[kind,token,identity,savedLanguage,setLang]);
  useEffect(()=>{
    if(!token || !identity)return;
    let active=true;
    const update=event=>{
      const next=event.detail;
      queue.current=queue.current.catch(()=>{}).then(async()=>{
        if(!active)return;
        await (kind==='staff'?api.staffAuth:api.client).setPreferences(token,next);
      }).catch(()=>{if(active)errorHandler.current?.('Unable to save your notification language. Please select the language again to retry.');});
    };
    window.addEventListener('tinzel:language-choice',update);
    return()=>{active=false;window.removeEventListener('tinzel:language-choice',update);};
  },[kind,token,identity]);
}
