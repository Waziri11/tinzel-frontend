import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
export default function PrinterNotificationSettings({token}) {
  const [language,setLanguage]=useState('sw'),[busy,setBusy]=useState(true),[message,setMessage]=useState('');
  useEffect(()=>{let active=true;api.admin.getConfig(token).then(data=>{if(active)setLanguage(data.configs?.find(item=>item.key==='printer_preferred_language')?.value || 'sw');}).catch(()=>{if(active)setMessage('Unable to load printer language.');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[token]);
  const save=async()=>{setBusy(true);setMessage('');try{await api.admin.updateConfig(token,{key:'printer_preferred_language',value:language});setMessage('Printer notification language saved.');}catch(error){setMessage(error.message);}finally{setBusy(false);}};
  return <div style={{padding:16,border:'1px solid #E7E5E4',borderRadius:8,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
    <label>Printer notification language <select aria-label="Printer notification language" value={language} disabled={busy} onChange={event=>setLanguage(event.target.value)}><option value="sw">Kiswahili</option><option value="en">English</option></select></label>
    <button disabled={busy} onClick={save}>Save printer language</button>{message&&<span role="status">{message}</span>}
  </div>;
}
