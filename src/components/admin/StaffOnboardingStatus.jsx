import InterfaceText,{useInterfaceText} from '../../i18n/InterfaceText';
import React, { useState } from 'react';
import { api } from '../../services/api';
import { useVisiblePolling } from '../../hooks/useVisiblePolling';
export const onboardingLabel=user=>!user.mustChangePassword?'Ready':new Date(user.temporaryPasswordExpiresAt)<=new Date()?'Initial password expired':'Awaiting first sign-in';
const controlStyle={padding:'8px 12px',border:'1px solid var(--border-color)',borderRadius:5,background:'var(--bg-primary, white)',color:'var(--text-primary)',font:'inherit',cursor:'pointer'};
const deliveryLabel=status=>status==='sent'?'provider accepted':status || 'not issued';
export default function StaffOnboardingStatus({user,token,onUpdate}) {
 const tx=useInterfaceText();

  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const expired=user.mustChangePassword&&new Date(user.temporaryPasswordExpiresAt)<=new Date();
  const refresh=async()=>{const data=await api.admin.getStaffUser(token,user._id);onUpdate(data.user);};
  useVisiblePolling(refresh,Boolean(user.mustChangePassword));
  const issue=async()=>{
    if(!window.confirm('Issue a new initial password? This signs the user out, replaces their password and sends new credentials by SMS and email.'))return;
    setBusy(true);setError('');setNotice('');
    try{const data=await api.admin.issueInitialPassword(token,user._id);onUpdate(data.user);setNotice('New initial password issued. Check SMS and email outcomes below.');}
    catch(error){setError(error.code==='STAFF_CREDENTIAL_CONFIG_REQUIRED'?'Staff credential delivery is not configured. Configure the credential encryption key before issuing passwords.':error.message);}
    finally{setBusy(false);}
  };
  const retry=async(channel,status)=>{
    const uncertain=status==='unconfirmed';
    if(uncertain&&!window.confirm('Provider acceptance is unknown. Retrying may send a duplicate. Continue?'))return;
    setBusy(true);setError('');setNotice('');
    try{const data=await api.admin.retryCredentialDelivery(token,user._id,channel,uncertain);onUpdate(data.user);setNotice('Retry processed. Check the channel outcome.');}
    catch(error){setError(error.message);}finally{setBusy(false);}
  };
  return <section style={{margin:'16px 0',padding:12,border:'1px solid var(--border-color)',borderRadius:6,fontSize:13}} aria-label={tx("Account setup and credential delivery")}>
    <strong>{onboardingLabel(user)}</strong>
    {user.mustChangePassword&&<p><InterfaceText>Initial password expires:</InterfaceText>{' '}{new Date(user.temporaryPasswordExpiresAt).toLocaleString()}</p>}
    <p><InterfaceText>Notification language:</InterfaceText>{' '}{user.preferredLanguage==='en'?'English':'Kiswahili'}</p>
    {['sms','email'].map(channel=>{const delivery=user.credentialDelivery?.[channel];return <div key={channel} style={{margin:'8px 0',overflowWrap:'anywhere'}}>
      <span>{channel.toUpperCase()}: {deliveryLabel(delivery?.status)}{delivery?.attempts?` · ${delivery.attempts}/5 attempts`:''}</span>
      {delivery?.error&&<p style={{color:'var(--accent-danger)'}}>{delivery.error}</p>}
      {user.mustChangePassword&&!expired&&['failed','undelivered','unconfirmed','skipped'].includes(delivery?.status)&&<button type="button" disabled={busy} onClick={()=>retry(channel,delivery.status)} style={{...controlStyle,marginLeft:8}}><InterfaceText>Retry</InterfaceText>{' '}{channel.toUpperCase()}</button>}
    </div>;})}
    {user.credentialDelivery?.error&&<p role="alert" style={{color:'var(--accent-danger)'}}>{user.credentialDelivery.error}</p>}
    {error&&<p role="alert" style={{color:'var(--accent-danger)'}}>{error}</p>}{notice&&<p role="status">{notice}</p>}
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button type="button" style={controlStyle} disabled={busy||!user.isActive} onClick={issue}><InterfaceText>Issue new initial password</InterfaceText></button><button type="button" style={controlStyle} disabled={busy} onClick={()=>refresh().catch(()=>setError('Unable to refresh delivery status.'))}><InterfaceText>Refresh delivery status</InterfaceText></button></div>
  </section>;
}
