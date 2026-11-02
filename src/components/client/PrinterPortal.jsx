import '../common/security-controls.css';
import React,{useState} from 'react';
import {fetchWithTimeout} from '../../services/api';
import {securityRequest} from '../common/SecurityCenter';
export default function PrinterPortal(){const id=location.pathname.split('/')[2];const [challenge,setChallenge]=useState(null),[code,setCode]=useState(''),[verified,setVerified]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const run=async fn=>{setBusy(true);try{await fn();setMessage('');}catch(e){setMessage(e.message);}finally{setBusy(false);}};
 return <main className="security-panel" style={{maxWidth:520,margin:'10vh auto',padding:24}}><h1>Tinzel printer access</h1><p>Verify using the SMS code sent to the printer phone designated by the manager. Your download access lasts ten minutes.</p>{message&&<p role="alert">{message}</p>}
 <button disabled={busy} onClick={()=>run(async()=>setChallenge(await securityRequest(`printer/invitations/${id}/otp`,{})))}>Send SMS code</button>
 {challenge&&<form onSubmit={e=>{e.preventDefault();run(async()=>{await securityRequest(`printer/invitations/${id}/verify`,{challengeId:challenge.challengeId,code});setCode('');setChallenge(null);setVerified(true);});}}><label>SMS code<input aria-label="Printer SMS code" inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={e=>setCode(e.target.value)}/></label><button disabled={busy}>Verify printer</button></form>}
 {verified&&<a href={`/api/printer/invitations/${id}/file`} download onClick={e=>{e.preventDefault();run(async()=>{const response=await fetchWithTimeout(`/api/printer/invitations/${id}/file`,{},300000);if(!response.ok){setVerified(false);const data=await response.json();throw new Error(data.message||'Download unavailable');}const url=URL.createObjectURL(await response.blob());const anchor=document.createElement('a');anchor.href=url;anchor.download='tinzel-magazine.pdf';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});}}>Download authorized print file</a>}</main>;
}
