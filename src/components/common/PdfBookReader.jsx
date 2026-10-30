import { createProofPageCache, proofWindow } from '../../utils/proofPageCache';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { proofApi } from '../../services/api';
import './pdfBookReader.css';
import Page from './ProofPage';
import ProofComments from './ProofComments';
import BookStage, {PAPER_TURN_MS} from './BookStage';
import {createPortal} from 'react-dom';
import {Maximize, Minimize, MessageSquare, X, ChevronLeft, ChevronRight, Columns2, Square, Minus, Plus} from 'lucide-react';

const MOBILE_QUERY='(max-width:760px), (hover:none) and (pointer:coarse)';
export default function PdfBookReader({ token, orderId, version, client = false, title = 'Magazine proof', onReviewed, focusAnnotation }) {
  const reader = useMemo(()=>proofApi(token,orderId,version,client),[token,orderId,version,client]);
  const [cache,setCache]=useState(null);
  const [opened,setOpened]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const root=useRef(null); const [metadata,setMetadata]=useState(null); const [error,setError]=useState('');
  const [page,setPage]=useState(1);const [mobile,setMobile]=useState(window.matchMedia(MOBILE_QUERY).matches);const [singlePreference,setSinglePreference]=useState(false);const single=mobile||singlePreference;const [zoom,setZoom]=useState(1);
  const [expanded,setExpanded]=useState(false),[turn,setTurn]=useState(null),[navigating,setNavigating]=useState(false);
  const navigation=useRef(0),turnTimer=useRef(null),jumpTimer=useRef(null),metadataRef=useRef(null),busy=useRef(false);
  const [pageInput,setPageInput]=useState('1');
  useEffect(()=>setPageInput(String(page)),[page]);
  const reviewGeneration=useRef(0),discardLock=useRef(false);
  const [discarding,setDiscarding]=useState(null);
  const annotationRevision=useRef(0),saveAttempt=useRef(null),draftRef=useRef(null),commentInput=useRef(null);
  const rememberMetadata=(data)=>{metadataRef.current=data;setMetadata(data);};
  const readReview=async(load)=>{
    const revision=annotationRevision.current,data=await load();
    return revision===annotationRevision.current?data:{...data,annotations:metadataRef.current?.annotations||data.annotations};
  };
  const readMetadata=()=>readReview(()=>reader.metadata());
  const preparePages=pages=>readReview(()=>reader.prepare(pages));
  const pagesAt=(number)=>[number,...(!single&&number>1&&number<metadataRef.current?.pageCount?[number+1]:[])];
  const [mode,setMode]=useState('read'); const [selection,setSelection]=useState(null); const [comment,setComment]=useState('');
  const [replacement,setReplacement]=useState(null),[focusSerial,setFocusSerial]=useState(0);
  const select=useCallback(value=>{if(draftRef.current?.saving){setError('Wait for the current comment to finish saving.');return;}if(draftRef.current?.selection&&draftRef.current.comment.trim()){setReplacement(value);return;}setSelection(value);setComment('');},[]);
  const useArea=useCallback(()=>setMode('area'),[]);
  const focus=useCallback(id=>{setFocused(id);setFocusSerial(n=>n+1);setShowComments(true);},[]);
  const [saving,setSaving]=useState(false); const [sync,setSync]=useState(''); const [focused,setFocused]=useState(null); const [showComments,setShowComments]=useState(false);
  draftRef.current={selection,comment,saving};
  useEffect(()=>{if(selection)commentInput.current?.focus({preventScroll:true});},[selection]);
  useEffect(()=>{if(!focused||turn||navigating)return;const pin=Array.from(root.current?.querySelectorAll('[data-comment-id]')||[]).find(el=>el.dataset.commentId===focused);pin?.scrollIntoView({block:'nearest',inline:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[focused,focusSerial,page,turn,navigating,showComments]);
  useEffect(()=>{
    if(!mobile||!selection||!window.visualViewport)return;
    const viewport=window.visualViewport,element=root.current;
    const fit=()=>{element.style.setProperty('--proof-keyboard-offset',`${Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop)}px`);element.style.setProperty('--proof-visible-height',`${viewport.height}px`);};
    viewport.addEventListener('resize',fit);viewport.addEventListener('scroll',fit);fit();
    return()=>{viewport.removeEventListener('resize',fit);viewport.removeEventListener('scroll',fit);element.style.removeProperty('--proof-keyboard-offset');element.style.removeProperty('--proof-visible-height');};
  },[mobile,selection,expanded]);
  useLayoutEffect(()=>{
    if(expanded)return;
    const element=root.current;
    const fit=()=>{const rect=element.getBoundingClientRect();if(!rect.width)return;const value=`${Math.min(820,Math.max(320,window.innerHeight-Math.max(12,rect.top)-12))}px`;if(element.style.getPropertyValue('--reader-height')!==value)element.style.setProperty('--reader-height',value);};
    const observer=new ResizeObserver(fit);observer.observe(element);window.addEventListener('resize',fit);fit();
    return()=>{observer.disconnect();window.removeEventListener('resize',fit);};
  },[expanded]);
  useEffect(()=>{const media=window.matchMedia(MOBILE_QUERY);const change=()=>setMobile(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  useEffect(()=>{
    let active=true,timer;const localCache=createProofPageCache(reader);setCache(localCache);
    reviewGeneration.current++;discardLock.current=false;setDiscarding(null);setSaving(false);annotationRevision.current=0;saveAttempt.current=null;metadataRef.current=null;setMetadata(null);setOpened(false);setTurn(null);busy.current=false;setNavigating(false);setShowComments(false);setFocused(null);setReplacement(null);setPage(1);setSelection(null);setComment('');setError('');setSync('');
    // Both endpoints authenticate independently. Start the cover while metadata is in flight.
    let openingCover=localCache.get(1).then(value=>({value}),error=>({error}));
    const load=async()=>{
      try{
        let data=await readMetadata();if(!active)return;rememberMetadata(data);
        const cover=data.pages?.some(p=>p.page===1);
        if(!cover){
          const diagnostic=data.diagnostics?.find(d=>d.page===0||d.page===1);
          if(data.state==='failed'||diagnostic)throw new Error((diagnostic?.message||data.message||'Cover preparation failed')+(diagnostic?.reference?` Reference: ${diagnostic.reference}`:''));
          data=await preparePages([1]);if(!active)return;rememberMetadata(data);
        }
        if(data.pages?.some(p=>p.page===1)){
          const first=openingCover?await openingCover:null;openingCover=null;
          if(!first?.value)await localCache.get(1);if(!active)return;
          setOpened(true);return;
        }
        timer=setTimeout(load,1000);
      }catch(e){if(active)setError(e.message);}
    };
    load();return()=>{active=false;navigation.current++;busy.current=false;clearTimeout(timer);clearTimeout(turnTimer.current);clearTimeout(jumpTimer.current);localCache.dispose();};
  },[reader,refresh]);
  useEffect(()=>{
    if(!opened||!metadata?.pageCount||!cache)return;
    let active=true,timer,prepared=false;
    const {visible,desired}=proofWindow(page,metadata.pageCount,single);
    const load=async()=>{
      try{
        let data=metadataRef.current;
        const ready=new Set(data.pages.map(p=>p.page)),failed=new Set((data.diagnostics||[]).map(d=>d.page));
        const missing=desired.filter(n=>!ready.has(n)&&!failed.has(n));
        if(missing.length){
          if(!prepared){prepared=true;data=await preparePages([missing[0],missing.at(-1)].filter((n,i,a)=>a.indexOf(n)===i));}
          else data=await readMetadata();
          if(!active)return;rememberMetadata(data);
        }
        const available=new Set(data.pages.map(p=>p.page));
        for(const number of desired)if(available.has(number))cache.get(number,{priority:visible.includes(number)?100:0}).catch(()=>{});
        if(desired.some(n=>!available.has(n)&&!(data.diagnostics||[]).some(d=>d.page===n)))timer=setTimeout(load,2000);
      }catch(e){if(active)setError(e.message);}
    };
    load();return()=>{active=false;clearTimeout(timer);};
  },[reader,cache,opened,page,single,metadata?.pageCount]);
  useEffect(()=>{
    if(!cache||!opened||!metadata?.pageCount)return;
    const {visible,desired}=proofWindow(page,metadata.pageCount,single);
    cache.setVisible([...visible,...(turn?.oldPages||[])],{retain:desired});
  },[cache,opened,page,single,metadata?.pageCount,turn]);
  useEffect(()=>{const changed=()=>{if(!document.fullscreenElement)setExpanded(false);};document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
  useEffect(()=>{if(!expanded)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';root.current.focus({preventScroll:true});root.current.requestFullscreen?.().catch(()=>{});return()=>{document.body.style.overflow=overflow;};},[expanded]);
  const toggleFullscreen=()=>{
    if(expanded){setExpanded(false);if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});}
    else setExpanded(true);
  };
  const navigate=async(target)=>{
    if(!cache||busy.current||target===page||target<1||target>metadataRef.current?.pageCount)return;
    const id=++navigation.current,oldPages=pagesAt(page),targetPages=pagesAt(target);
    busy.current=true;setNavigating(true);setError('');cache.setVisible([...oldPages,...targetPages],{retain:proofWindow(target,metadataRef.current.pageCount,single).desired});
    try{
      const load=()=>Promise.all(targetPages.map(number=>cache.get(number)));
      try{await load();}catch(e){
        if(!e.pending)throw e;
        let data=await preparePages(targetPages);if(id!==navigation.current)return;rememberMetadata(data);
        for(let attempt=0;!targetPages.every(n=>data.pages.some(p=>p.page===n));attempt++){
          const failure=data.diagnostics?.find(d=>targetPages.includes(d.page));if(failure)throw new Error(`${failure.message} Reference: ${failure.reference}`);
          if(attempt>=90)throw new Error('These pages are still being prepared. Please try again shortly.');
          await new Promise(resolve=>setTimeout(resolve,1500));if(id!==navigation.current)return;
          data=await readMetadata();if(id!==navigation.current)return;rememberMetadata(data);
        }
        await load();
      }
      if(id!==navigation.current)return;
      const direction=target>page?'forward':'backward',front=cache.peek(direction==='forward'?oldPages.at(-1):oldPages[0]),back=cache.peek(direction==='forward'?targetPages[0]:targetPages.at(-1));
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(!reduced){setTurn({direction,front,back,oldPages,fromCover:page===1,toCover:target===1,stationary:!single&&oldPages.length===2?cache.peek(direction==='forward'?oldPages[0]:oldPages[1]):null});}
      setPage(target);setNavigating(false);
      if(reduced)busy.current=false;
      else turnTimer.current=setTimeout(()=>{setTurn(null);busy.current=false;},PAPER_TURN_MS+20);
    }catch(e){if(id===navigation.current){setError(e.message);setNavigating(false);busy.current=false;cache.setVisible(pagesAt(page),{retain:proofWindow(page,metadataRef.current.pageCount,single).desired});}}
  };
  useEffect(()=>{if(focusAnnotation&&metadata){const a=metadata.annotations.find((a)=>a._id===focusAnnotation);if(a){navigate(single||a.page===1?a.page:a.page%2===0?a.page:a.page-1);setFocused(a._id);setShowComments(true);}}},[focusAnnotation,metadata,single]);
  useEffect(()=>{if(!single)setPage((p)=>p>1&&p%2===1?p-1:p);},[single]);
  const annotations=(metadata?.annotations||[]).map((a,i)=>({...a,displayNumber:i+1}));
  const pending=annotations.filter((a)=>!a.submittedAt);
  const next=()=>navigate(Math.min(metadata.pageCount,page===1||single?page+1:page+2));
  const previous=()=>navigate(Math.max(1,single?page-1:page===2?1:page-2));
  const save=async(e)=>{
    e.preventDefault();if(!selection||!comment.trim()||saving)return;
    const {anchor,...fields}=selection;
    const generation=reviewGeneration.current,submitted={selection,comment},body={...fields,text:comment.trim()},key=JSON.stringify(body);
    if(saveAttempt.current?.key!==key)saveAttempt.current={key,id:crypto.randomUUID()};
    const saveAttemptId=saveAttempt.current.id;
    setSaving(true);setSync('Saving…');setError('');
    try{
      const data=await reader.save({...body,clientMutationId:saveAttempt.current.id});
      if(generation!==reviewGeneration.current)return;
      annotationRevision.current++;rememberMetadata({...metadataRef.current,annotations:data.annotations});
      if(draftRef.current.selection===submitted.selection&&draftRef.current.comment===submitted.comment){setSelection(replacement||null);setReplacement(null);setComment('');saveAttempt.current=null;setSync('Saved');if(!replacement){setShowComments(true);const added=data.annotations.find(a=>a.clientMutationId===saveAttemptId)||data.annotations.at(-1);if(added)setFocused(added._id);}}
      else setSync('Saved earlier comment — your current draft is still here');
    }catch(e){if(generation===reviewGeneration.current){setError(e.message);setSync('Save failed — retry');}}
    finally{if(generation===reviewGeneration.current)setSaving(false);}
  };
  const discard=async(id)=>{
    if(discardLock.current)return;
    const generation=reviewGeneration.current;discardLock.current=true;setDiscarding(id);setError('');
    try{const data=await reader.discard(id);if(generation!==reviewGeneration.current)return;annotationRevision.current++;rememberMetadata({...metadataRef.current,annotations:data.annotations});setSync('Saved');}
    catch(e){if(generation===reviewGeneration.current)setError(e.message);}
    finally{if(generation===reviewGeneration.current){discardLock.current=false;setDiscarding(null);}}
  };
  const submit=async()=>{if(selection){setError('Save or cancel the current comment first.');return;}setSaving(true);setError('');try{await reader.submit();const data=await readMetadata();rememberMetadata(data);setMode('read');setSync('Corrections submitted');onReviewed?.();}catch(e){setError(e.message);}finally{setSaving(false);}};
  const jump=(a)=>{clearTimeout(jumpTimer.current);if(busy.current){navigation.current++;clearTimeout(turnTimer.current);setTurn(null);busy.current=false;}navigate(single||a.page===1?a.page:a.page%2===0?a.page:a.page-1);setFocused(a._id);setFocusSerial(n=>n+1);setShowComments(true);};
  const content=<section ref={root} role={expanded?'dialog':'region'} aria-modal={expanded?true:undefined} className={`pdf-book${expanded?' is-expanded':''}${turn?' is-turning':''}`}  aria-label={`${title} reader`} onContextMenu={e=>{if(mode!=='text'||!e.target.closest('.proof-text-layer'))e.preventDefault();}} onKeyDown={(e)=>{if(expanded&&e.key==='Tab'){const items=[...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key==='Escape'&&expanded){e.preventDefault();e.stopPropagation();setExpanded(false);return;}if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(!metadata?.pageCount)return;if(e.key==='ArrowRight'&&mode==='read'){e.preventDefault();next();}if(e.key==='ArrowLeft'&&mode==='read'){e.preventDefault();previous();}if((e.ctrlKey||e.metaKey)&&['p','s'].includes(e.key.toLowerCase()))e.preventDefault();}} tabIndex={0}>
    <header className="proof-toolbar"><strong>{title}</strong>
      {metadata?.canComment&&<div className="proof-modes" aria-label="Review tools">{[['read','Read'],['text','Select text'],['image','Select image'],['area','Mark area']].map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}</div>}
      <div className="proof-tools">
        {!mobile&&<button aria-label={single?'Book view':'Single page'} title={single?'Book view':'Single page'} disabled={navigating||Boolean(turn)} onClick={()=>{setTurn(null);setSinglePreference(!singlePreference);setZoom(1);}}>{single?<Columns2 size={17}/>:<Square size={17}/>}</button>}
        <button aria-label={`Comments (${metadata?.annotations?.length||0})`} aria-expanded={showComments} title="Comments" onClick={()=>setShowComments(!showComments)}><MessageSquare size={17}/><span>{metadata?.annotations?.length||0}</span></button>
        <button aria-label={expanded?'Exit fullscreen':'Fullscreen'} title={expanded?'Exit fullscreen':'Fullscreen'} onClick={toggleFullscreen}>{expanded?<Minimize size={17}/>:<Maximize size={17}/>}</button>
      </div>
    </header>
    {error&&<div className="proof-error" role="alert">{error}</div>}
    {!metadata?<div className="proof-page-message">{error?'Unable to open magazine.':'Opening magazine…'}</div>:metadata.state==='failed'&&!opened?<div className="proof-page-message">{metadata.message}<button onClick={async()=>{try{await reader.retry();setRefresh((n)=>n+1);}catch(e){setError(e.message);}}}>Retry preparation</button></div>:!opened?<div className="proof-page-message" role="status">Preparing magazine cover…{error&&<button onClick={async()=>{try{await reader.retry();setRefresh((n)=>n+1);}catch(e){setError(e.message);}}}>Retry preparation</button>}</div>:<>
      <div className={`proof-layout${showComments?'':' no-comments'}`}>
        <BookStage page={page} single={single} zoom={zoom} cache={cache} turn={turn} mode={mode} onNext={next} onPrevious={previous}
          renderPage={number=>number<=metadata.pageCount?<Page cache={cache} key={`${version}-${number}`} reader={reader} number={number} annotations={annotations} mode={metadata.canComment?mode:'read'} onSelect={select} onFocus={focus} focused={focused} pendingSelection={selection?.page===number?selection:null} onUseArea={useArea}/>:null}/>
        {showComments&&<ProofComments annotations={annotations} focused={focused} focusSerial={focusSerial} onJump={jump} onClose={()=>setShowComments(false)} onDiscard={discard} discarding={discarding} canComment={metadata.canComment} pending={pending} saving={saving} onSubmit={submit} currentPages={pagesAt(page)}/>}
        {selection&&metadata.canComment&&<form className="proof-composer" aria-label="Comment editor" onSubmit={save} style={!mobile&&selection.anchor?{left:Math.max(8,Math.min((selection.anchor.x-(root.current?.getBoundingClientRect().left||0))+8,(root.current?.clientWidth||600)-310)),top:Math.max(8,Math.min(selection.anchor.y-(root.current?.querySelector('.proof-layout')?.getBoundingClientRect().top||0)+8,(root.current?.querySelector('.proof-layout')?.clientHeight||500)-275))}:undefined}>
          <strong>Page {selection.page} · {selection.kind==='image'?'Image':selection.kind==='text'?'Text':'Area'} comment</strong>
          {selection.selectedText&&<blockquote>{selection.selectedText}</blockquote>}
          <textarea ref={commentInput} aria-label="Correction comment" value={comment} onChange={e=>setComment(e.target.value)} required maxLength={4000}/>
          <div><button disabled={saving}>Save comment</button><button type="button" disabled={saving} onClick={()=>{setSelection(null);setReplacement(null);setComment('');}}>Cancel</button></div>
          {replacement&&<div className="proof-replacement" role="alert"><p>Save or discard this comment before choosing another selection.</p><button type="submit" disabled={saving||!comment.trim()}>Save current comment</button><button type="button" disabled={saving} onClick={()=>{setSelection(replacement);setReplacement(null);setComment('');}}>Discard current draft</button><button type="button" onClick={()=>setReplacement(null)}>Keep editing</button></div>}
        </form>}

      </div>
      <footer className="proof-footer"><div className="proof-zoom"><button onClick={()=>setZoom(z=>Math.max(.6,Math.round((z-.2)*10)/10))} aria-label="Zoom out"><Minus size={15}/></button><button className="proof-fit" aria-label="Fit pages to screen" onClick={()=>setZoom(1)}>{zoom===1?'Fit':`${Math.round(zoom*100)}%`}</button><button onClick={()=>setZoom(z=>Math.min(2,Math.round((z+.2)*10)/10))} aria-label="Zoom in"><Plus size={15}/></button></div>
        <div className="proof-pagination"><button aria-label="Previous page" disabled={page===1||navigating||Boolean(turn)} onClick={previous}><ChevronLeft size={19}/></button><label><span className="sr-only">Page</span><input aria-label="Go to page" type="number" min="1" max={metadata.pageCount} disabled={navigating||Boolean(turn)} value={pageInput} onChange={e=>{const value=e.target.value;setPageInput(value);clearTimeout(jumpTimer.current);const n=Number(value);if(n>=1&&n<=metadata.pageCount)jumpTimer.current=setTimeout(()=>navigate(single||n===1?n:n%2===0?n:n-1),250);}}/><span> / {metadata.pageCount}</span></label><button aria-label="Next page" disabled={page+(single||page===1?1:2)>metadata.pageCount||navigating||Boolean(turn)} onClick={next}><ChevronRight size={19}/></button></div>
        <span className="proof-sync" role="status">{navigating?'Preparing pages…':sync}</span>
      </footer>
    </>}
  </section>;
  return expanded?createPortal(content,document.body):content;
}
