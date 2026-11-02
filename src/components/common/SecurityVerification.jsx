import './security-controls.css';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import React,{useEffect,useState} from 'react';
export default function SecurityVerification(){
 const [request,setRequest]=useState(null),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const handler=e=>{setRequest(e.detail);setCode('');setError('');};window.addEventListener('tinzel:verify',handler);return()=>window.removeEventListener('tinzel:verify',handler);},[]);
 const close=()=>{request?.reject(new Error('Verification cancelled'));setRequest(null);};
 useDialogFocus(Boolean(request),close);
 if(!request)return null;
 return <div style={{position:'fixed',inset:0,zIndex:10000,background:'#0008',display:'grid',placeItems:'center',padding:20}}><section className="security-panel" role="dialog" aria-modal="true" aria-labelledby="verification-title" style={{background:'white',padding:28,borderRadius:12,width:'min(420px,100%)'}}>
 <h2 id="verification-title">Verify your identity / Thibitisha utambulisho</h2><p>{request.challengeId?`Enter the six-digit code sent by SMS. The code expires in five minutes.`:'Send an SMS verification code to your account phone number.'}</p>
 {error&&<p role="alert">{error}</p>}<form onSubmit={async e=>{e.preventDefault();setBusy(true);try{const result=await request.verify(code);request.resolve(result);setRequest(null);}catch(err){setError(err.message);}finally{setBusy(false);}}}>
 <label>Verification code<input autoFocus aria-label="Verification code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={e=>setCode(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'12px 0'}}/></label>
 <button disabled={busy||!request.challengeId} type="submit">Verify code</button> <button type="button" onClick={close}>Cancel</button></form>

 <button disabled={busy} onClick={async()=>{setBusy(true);try{const next=await request.resend('sms');setRequest({...request,...next});setError('A new code was sent.');}catch(err){setError(err.message);}finally{setBusy(false);}}}>Send a new code</button>
 </section></div>;
}
