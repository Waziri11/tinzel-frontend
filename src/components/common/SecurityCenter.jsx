import { ActionButton } from './SoftFlutter';
import {useLanguage} from '../../i18n/LanguageContext';
import AccountSecurity from './AccountSecurity';
import {errorText} from '../../i18n/errors';
import './security-controls.css';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import React,{useState} from 'react';
import {fetchWithTimeout,requestVerification,downloadFile} from '../../services/api';
export async function securityRequest(path,body){const response=await fetchWithTimeout(`/api/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw new Error(errorText(data.message||'Request failed',response.status));return data;}
export const downloadMagazine = (orderId, version) => downloadFile(
 `/api/security/orders/${encodeURIComponent(orderId)}/download/${encodeURIComponent(version)}`,
 `tinzel-${version}.pdf`, { key: `magazine:${orderId}:${version}` },
);
export default function SecurityCenter({user}){
 const {lang}=useLanguage(),t=(en,sw)=>lang==='sw'?sw:en;
 const [open,setOpen]=useState(false),[orderId,setOrderId]=useState(''),[version,setVersion]=useState('print'),[events,setEvents]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[destination,setDestination]=useState(''),[inviteUrl,setInviteUrl]=useState('');
 useDialogFocus(open,()=>setOpen(false));
 const channel='sms';
 const privileged=['admin','manager'].includes(user.role);
 const run=async fn=>{setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e.message);}finally{setBusy(false);}};
 return <><button className="ui-button security-launcher" onClick={()=>setOpen(true)} style={{position:'fixed',bottom:18,right:18,zIndex:90}}>Security / Usalama</button>{open&&<div style={{position:'fixed',inset:0,zIndex:9000,background:'#0008',display:'grid',placeItems:'center',padding:16}}><section className="security-panel" role="dialog" aria-modal="true" aria-label={t('Account security','Usalama wa akaunti')} style={{background:'white',padding:24,borderRadius:12,width:'min(850px,100%)',maxHeight:'90dvh',overflow:'auto'}}><button onClick={()=>setOpen(false)}>{t('Close','Funga')}</button><h2>Security / Usalama</h2>{message&&<p role="status">{message}</p>}
 <AccountSecurity user={user} />
 {privileged&&<><label>{t('Order reference','Rejea ya oda')}<input aria-label="Security order reference" placeholder="Tracking or submission reference" value={orderId} onChange={e=>setOrderId(e.target.value)}/></label><label>{t('Version or print','Toleo au chapa')}<input aria-label="Download version" value={version} onChange={e=>setVersion(e.target.value)}/></label>
 <button disabled={busy||!orderId} onClick={()=>run(()=>downloadMagazine(orderId,version))}>{t('Download original','Pakua nakala halisi')}</button>
 <ActionButton loading={busy} disabled={busy||!orderId} onClick={()=>run(async()=>{await securityRequest(`security/orders/${orderId}/revoke-client`,{});setMessage(t('Client sessions revoked.','Vipindi vya mteja vimeondolewa.'));})}>{t('Revoke client sessions','Ondoa vipindi vya mteja')}</ActionButton>
 <ActionButton loading={busy} disabled={busy||!orderId} onClick={()=>run(async()=>{const data=await securityRequest(`printer/orders/${orderId}/invite`,{});setInviteUrl(data.url);setMessage(t('Printer invitation issued. It expires in 24 hours.','Mwaliko wa mchapishaji umetolewa. Unaisha baada ya saa 24.'));})}>{t('Issue printer invitation','Toa mwaliko wa mchapishaji')}</ActionButton>
 <ActionButton loading={busy} disabled={busy||!orderId} onClick={()=>run(async()=>{await securityRequest(`printer/orders/${orderId}/revoke`,{});setMessage(t('Printer access revoked.','Ufikiaji wa mchapishaji umeondolewa.'));})}>{t('Revoke printer access','Ondoa ufikiaji wa mchapishaji')}</ActionButton>
 <ActionButton loading={busy} disabled={busy} onClick={()=>run(async()=>setEvents((await securityRequest(`security/downloads?orderId=${encodeURIComponent(orderId)}`)).events))}>{t('Search download history','Tafuta historia ya upakuaji')}</ActionButton>
 <div style={{overflowX:'auto',maxWidth:'100%'}}><table><thead><tr><th>{t('Time','Muda')}</th><th>{t('Actor','Mtendaji')}</th><th>{t('Order / version','Oda / toleo')}</th><th>{t('Outcome','Matokeo')}</th></tr></thead><tbody>{events.map(e=><tr key={e.eventId}><td>{new Date(e.createdAt).toLocaleString()}</td><td>{e.actorName||e.role}</td><td>{e.orderId} / {e.version}</td><td>{e.action}</td></tr>)}</tbody></table></div></>}
 {inviteUrl&&<p><a href={inviteUrl} target="_blank" rel="noreferrer">{t('Open printer invitation','Fungua mwaliko wa mchapishaji')}</a></p>}{privileged&&<ActionButton loading={busy} disabled={busy} onClick={()=>run(async()=>setEvents((await securityRequest('security/downloads?alerts=1')).events))}>{t('View security alerts','Angalia tahadhari za usalama')}</ActionButton>}<h3>{t('Change verified phone','Badilisha simu iliyothibitishwa')}</h3><label>{t('New phone number','Namba mpya ya simu')}<input value={destination} onChange={e=>setDestination(e.target.value)}/></label>
 <ActionButton loading={busy} disabled={busy||!destination} onClick={()=>run(async()=>{let challenge=await securityRequest('staff/contact',{channel,destination});await requestVerification({...challenge,channel,verify:code=>securityRequest('staff/contact/verify',{challengeId:challenge.challengeId,code}),resend:async()=>{challenge=await securityRequest('staff/contact',{channel,destination});return challenge;}});location.reload();})}>{t('Verify new contact','Thibitisha mawasiliano mapya')}</ActionButton>
 </section></div>}</>;
}
