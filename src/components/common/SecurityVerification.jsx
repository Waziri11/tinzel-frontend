import React,{useEffect,useState} from 'react';
export default function SecurityVerification(){
 const [request,setRequest]=useState(null),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[channel,setChannel]=useState('email');
 useEffect(()=>{const handler=e=>{setRequest(e.detail);setCode('');setError('');setChannel(e.detail.channel||'email');};window.addEventListener('tinzel:verify',handler);return()=>window.removeEventListener('tinzel:verify',handler);},[]);
 if(!request)return null;
 const close=()=>{request.reject(new Error('Verification cancelled'));setRequest(null);};
 return <div style={{position:'fixed',inset:0,zIndex:10000,background:'#0008',display:'grid',placeItems:'center',padding:20}}><section role="dialog" aria-modal="true" aria-labelledby="verification-title" style={{background:'white',padding:28,borderRadius:12,width:'min(420px,100%)'}}>
 <h2 id="verification-title">Verify your identity / Thibitisha utambulisho</h2><p>{request.challengeId?`Enter the six-digit code sent by ${request.channel||channel}. The code expires in five minutes.`:'Choose email or SMS and send a verification code.'}</p>
 {error&&<p role="alert">{error}</p>}<form onSubmit={async e=>{e.preventDefault();setBusy(true);try{const result=await request.verify(code);request.resolve(result);setRequest(null);}catch(err){setError(err.message);}finally{setBusy(false);}}}>
 <label>Verification code<input autoFocus aria-label="Verification code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={e=>setCode(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'12px 0'}}/></label>
 <button disabled={busy||!request.challengeId} type="submit">Verify code</button> <button type="button" onClick={close}>Cancel</button></form>
 <label>Delivery channel<select aria-label="Delivery channel" value={channel} onChange={e=>setChannel(e.target.value)}><option value="email">Email</option><option value="sms">SMS</option></select></label>
 <button disabled={busy} onClick={async()=>{setBusy(true);try{const next=await request.resend(channel);setRequest({...request,...next});setError('A new code was sent.');}catch(err){setError(err.message);}finally{setBusy(false);}}}>Send a new code</button>
 </section></div>;
}
