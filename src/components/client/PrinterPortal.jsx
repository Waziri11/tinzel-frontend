import { ActionButton } from '../common/SoftFlutter';
import '../common/security-controls.css';
import React,{useState} from 'react';
import {downloadFile} from '../../services/api';
import {securityRequest} from '../common/SecurityCenter';
export default function PrinterPortal(){const id=location.pathname.split('/')[2];const [challenge,setChallenge]=useState(null),[code,setCode]=useState(''),[verified,setVerified]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const run=async fn=>{setBusy(true);try{await fn();setMessage('');}catch(e){setMessage(e.message);}finally{setBusy(false);}};
 return <main className="security-panel" style={{maxWidth:520,margin:'10vh auto',padding:24}}><h1>Tinzel printer access</h1><p>Verify using the SMS code sent to the printer phone designated by the manager. Your download access lasts ten minutes.</p>{message&&<p role="alert">{message}</p>}
 <ActionButton loading={busy} disabled={busy} onClick={()=>run(async()=>setChallenge(await securityRequest(`printer/invitations/${id}/otp`,{})))}>Send SMS code</ActionButton>
 {challenge&&<form onSubmit={e=>{e.preventDefault();run(async()=>{await securityRequest(`printer/invitations/${id}/verify`,{challengeId:challenge.challengeId,code});setCode('');setChallenge(null);setVerified(true);});}}><label>SMS code<input aria-label="Printer SMS code" inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={e=>setCode(e.target.value)}/></label><ActionButton loading={busy} disabled={busy}>Verify printer</ActionButton></form>}
 {verified&&<a href={`/api/printer/invitations/${id}/file`} download onClick={e=>{e.preventDefault();run(async()=>{try { await downloadFile(`/api/printer/invitations/${id}/file`, 'tinzel-magazine.pdf'); } catch (error) { if ([401,403].includes(error.status)) setVerified(false); throw error; }});}}>Download authorized print file</a>}</main>;
}
