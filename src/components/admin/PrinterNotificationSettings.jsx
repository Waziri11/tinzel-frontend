import InterfaceText,{useInterfaceText} from '../../i18n/InterfaceText';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
export default function PrinterNotificationSettings({token}) {
 const tx=useInterfaceText();

  const [language,setLanguage]=useState('sw'),[busy,setBusy]=useState(true),[message,setMessage]=useState('');
  useEffect(()=>{let active=true;api.admin.getConfig(token).then(data=>{if(active)setLanguage(data.configs?.find(item=>item.key==='printer_preferred_language')?.value || 'sw');}).catch(()=>{if(active)setMessage('Unable to load printer language.');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[token]);
  const save=async()=>{setBusy(true);setMessage('');try{await api.admin.updateConfig(token,{key:'printer_preferred_language',value:language});setMessage('Printer notification language saved.');}catch(error){setMessage(error.message);}finally{setBusy(false);}};
  return <div style={{padding:16,border:'1px solid var(--border-color)',borderRadius:8,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
    <label><InterfaceText>Printer notification language</InterfaceText><select aria-label={tx("Printer notification language")} value={language} disabled={busy} onChange={event=>setLanguage(event.target.value)}><option value="sw"><InterfaceText>Kiswahili</InterfaceText></option><option value="en"><InterfaceText>English</InterfaceText></option></select></label>
    <button disabled={busy} onClick={save}><InterfaceText>Save printer language</InterfaceText></button>{message&&<span role="status">{message}</span>}
  </div>;
}
