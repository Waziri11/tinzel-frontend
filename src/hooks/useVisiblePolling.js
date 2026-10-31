import { useEffect, useRef } from 'react';
export function useVisiblePolling(callback,enabled=true) {
  const latest=useRef(callback);latest.current=callback;
  useEffect(()=>{
    if(!enabled)return;
    let running=false,active=true;
    const refresh=async()=>{if(!active||running||document.visibilityState==='hidden')return;running=true;try{await latest.current();}catch{/* Caller owns error display. */}finally{running=false;}};
    const timer=setInterval(refresh,30000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[enabled]);
}
