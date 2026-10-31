import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useVisiblePolling } from '../../hooks/useVisiblePolling';
export default function ClientNotifications({token,onUnauthorized}) {
  const {lang}=useLanguage(),sw=lang==='sw';
  const [items,setItems]=useState([]),[unread,setUnread]=useState(0),[error,setError]=useState('');
  const load=useCallback(async()=>{
    try{const data=await api.client.getNotifications(token);setItems(data.notifications || []);setUnread(data.unreadCount || 0);setError('');}
    catch(error){if([401,403].includes(error.status))onUnauthorized();else setError(sw?'Imeshindikana kupakia taarifa.':'Unable to load notifications.');}
  },[token,sw,onUnauthorized]);
  useEffect(()=>{let active=true; if(active)load();return()=>{active=false;};},[load]);
  useVisiblePolling(load,Boolean(token));
  const read=async id=>{try{await api.client.readNotification(token,id);await load();}catch{setError(sw?'Imeshindikana kuhifadhi. Jaribu tena.':'Unable to save. Please retry.');}};
  return <details style={{margin:'20px 0',border:'1px solid var(--border-color)',borderRadius:8,padding:14}}>
    <summary style={{cursor:'pointer',fontWeight:600}}>{sw?'Taarifa':'Notifications'}{unread>0?` (${unread})`:''}</summary>
    {error&&<p role="alert">{error} <button onClick={load}>{sw?'Jaribu tena':'Retry'}</button></p>}
    {!items.length&&!error&&<p>{sw?'Hakuna taarifa mpya.':'No notifications yet.'}</p>}
    {items.map(item=><article key={item._id} style={{padding:'12px 0',borderBottom:'1px solid var(--border-color)'}}>
      <strong>{item.title}</strong><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:13}}>{item.message}</p>
      <small>{new Date(item.createdAt).toLocaleString(sw?'sw-TZ':'en-TZ')}</small>
      {!item.isRead&&<button onClick={()=>read(item._id)} style={{marginLeft:12,color:'var(--text-gold)',background:'transparent'}}>{sw?'Weka imesomwa':'Mark as read'}</button>}
    </article>)}
  </details>;
}
