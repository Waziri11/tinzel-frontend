import './security-controls.css';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import React,{useState} from 'react';
import {fetchWithTimeout,requestVerification} from '../../services/api';
export async function securityRequest(path,body){const response=await fetchWithTimeout(`/api/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw new Error(data.message||'Request failed');return data;}
export async function downloadMagazine(orderId,version){const response=await fetchWithTimeout(`/api/security/orders/${encodeURIComponent(orderId)}/download/${encodeURIComponent(version)}`,{},300000);if(!response.ok){const data=await response.json();throw new Error(data.message||'Download unavailable');}const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=`tinzel-${version}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export default function SecurityCenter({user}){
 const [open,setOpen]=useState(false),[orderId,setOrderId]=useState(''),[version,setVersion]=useState('print'),[events,setEvents]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[destination,setDestination]=useState(''),[inviteUrl,setInviteUrl]=useState('');
 useDialogFocus(open,()=>setOpen(false));
 const channel='sms';
 const privileged=['admin','manager'].includes(user.role);
 const run=async fn=>{setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e.message);}finally{setBusy(false);}};
 return <><button onClick={()=>setOpen(true)} style={{position:'fixed',bottom:18,right:18,zIndex:90}}>Security / Usalama</button>{open&&<div style={{position:'fixed',inset:0,zIndex:9000,background:'#0008',display:'grid',placeItems:'center',padding:16}}><section className="security-panel" role="dialog" aria-modal="true" aria-label="Account security" style={{background:'white',padding:24,borderRadius:12,width:'min(850px,100%)',maxHeight:'90vh',overflow:'auto'}}><button onClick={()=>setOpen(false)}>Close</button><h2>Security / Usalama</h2>{message&&<p role="status">{message}</p>}
 {privileged&&<><label>Order reference<input aria-label="Security order reference" placeholder="Tracking or submission reference" value={orderId} onChange={e=>setOrderId(e.target.value)}/></label><label>Version or print<input aria-label="Download version" value={version} onChange={e=>setVersion(e.target.value)}/></label>
 <button disabled={busy||!orderId} onClick={()=>run(()=>downloadMagazine(orderId,version))}>Download original</button>
 <button disabled={busy||!orderId} onClick={()=>run(async()=>{await securityRequest(`security/orders/${orderId}/revoke-client`,{});setMessage('Client sessions revoked.');})}>Revoke client sessions</button>
 <button disabled={busy||!orderId} onClick={()=>run(async()=>{const data=await securityRequest(`printer/orders/${orderId}/invite`,{});setInviteUrl(data.url);setMessage('Printer invitation issued. It expires in 24 hours.');})}>Issue printer invitation</button>
 <button disabled={busy||!orderId} onClick={()=>run(async()=>{await securityRequest(`printer/orders/${orderId}/revoke`,{});setMessage('Printer access revoked.');})}>Revoke printer access</button>
 <button disabled={busy} onClick={()=>run(async()=>setEvents((await securityRequest(`security/downloads?orderId=${encodeURIComponent(orderId)}`)).events))}>Search download history</button>
 <div style={{overflowX:'auto',maxWidth:'100%'}}><table><thead><tr><th>Time</th><th>Actor</th><th>Order / version</th><th>Outcome</th></tr></thead><tbody>{events.map(e=><tr key={e.eventId}><td>{new Date(e.createdAt).toLocaleString()}</td><td>{e.actorName||e.role}</td><td>{e.orderId} / {e.version}</td><td>{e.action}</td></tr>)}</tbody></table></div></>}
 {inviteUrl&&<p><a href={inviteUrl} target="_blank" rel="noreferrer">Open printer invitation</a></p>}{privileged&&<button disabled={busy} onClick={()=>run(async()=>setEvents((await securityRequest('security/downloads?alerts=1')).events))}>View security alerts</button>}<h3>Change verified phone</h3><label>New phone number<input value={destination} onChange={e=>setDestination(e.target.value)}/></label>
 <button disabled={busy||!destination} onClick={()=>run(async()=>{let challenge=await securityRequest('staff/contact',{channel,destination});await requestVerification({...challenge,channel,verify:code=>securityRequest('staff/contact/verify',{challengeId:challenge.challengeId,code}),resend:async()=>{challenge=await securityRequest('staff/contact',{channel,destination});return challenge;}});location.reload();})}>Verify new contact</button>
 </section></div>}</>;
}
