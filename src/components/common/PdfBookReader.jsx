import { createProofPageCache, proofWindow } from '../../utils/proofPageCache';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { proofApi } from '../../services/api';
import './pdfBookReader.css';
import BookStage, {PAPER_TURN_MS} from './BookStage';
import {createPortal} from 'react-dom';
import {Maximize, Minimize, MessageSquare, X, ChevronLeft, ChevronRight, Columns2, Square, Minus, Plus} from 'lucide-react';

const Page=React.memo(function Page({ reader, cache, number, annotations, mode, onSelect, onFocus, focused, pendingSelection, onUseArea }) {
  const cached=cache.peek(number);
  const [image, setImage] = useState(cached?.image||''); const [text, setText] = useState(cached?.text||null); const [error, setError] = useState('');
  const [attempt,setAttempt]=useState(0);
  const surface = useRef(null); const drag = useRef(null); const [box, setBox] = useState(null);
  useEffect(() => {
    let active = true; let timer;
    const known=cache.peek(number);setImage(known?.image||'');setText(known?.text||null);setError('');
    const load = async () => {
      try {
        const value = await cache.get(number);
        if (!active) return;
        setImage(value.image); setText(value.text);
      } catch (e) { if (active) { if (e.pending) timer = setTimeout(load, 2000); else setError(e.message); } }
    };
    load(); return () => { active = false; clearTimeout(timer);  };
  }, [reader, cache, number, attempt]);
  const point = (event) => { const r = surface.current.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX-r.left)/r.width)), y: Math.max(0, Math.min(1, (event.clientY-r.top)/r.height)) }; };
  const rectangle = (a, b) => ({ x: Math.min(a.x,b.x), y: Math.min(a.y,b.y), width: Math.abs(a.x-b.x), height: Math.abs(a.y-b.y) });
  const finish = (event) => {
    if (mode === 'area' && drag.current) {
      const rect = rectangle(drag.current, point(event)); drag.current = null; setBox(null);
      if (rect.width > .003 && rect.height > .003) onSelect({ page: number, kind: 'area', rects: [rect], selectedText: '' });
    } else if (mode === 'text') {
      const selection = window.getSelection();
      if (!selection?.rangeCount || !selection.toString().trim() || !surface.current.contains(selection.anchorNode) || !surface.current.contains(selection.focusNode)) return;
      const r = surface.current.getBoundingClientRect();
      const rects = [...selection.getRangeAt(0).getClientRects()].map((b) => ({ x: Math.max(0,(b.left-r.left)/r.width), y: Math.max(0,(b.top-r.top)/r.height), width: Math.min(b.width/r.width, (r.right-b.left)/r.width), height: Math.min(b.height/r.height,(r.bottom-b.top)/r.height) })).filter((b) => b.width>0 && b.height>0);
      if (rects.length) onSelect({ page: number, kind: 'text', rects, selectedText: selection.toString() });
      selection.removeAllRanges();
    }
  };
  if (error) return <div className="proof-page-message" role="alert">{error}<button onClick={async () => { try { await reader.retry(); await reader.prepare([number]); setAttempt((n)=>n+1); } catch(e) { setError(e.message); } }}>Retry preparation</button></div>;
  if (!image || !text) return <div className="proof-page-message" role="status">Preparing page {number}…</div>;
  const styleRect = (r) => ({ left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%` });
  return <div className={`proof-sheet mode-${mode}`} ref={surface} style={{ aspectRatio: `${text.width}/${text.height}`,width:`min(100%, ${100*text.width/text.height}cqh)` }}
    onPointerDown={(e) => { if (mode === 'area') { drag.current=point(e); surface.current.setPointerCapture(e.pointerId); } }}
    onPointerMove={(e) => { if (drag.current) setBox(rectangle(drag.current,point(e))); }} onPointerCancel={() => {drag.current=null;setBox(null);}} onPointerUp={finish}>
    <img src={image} alt={`Magazine page ${number}`} draggable={false}/>
    {mode==='text'&&<div className="proof-text-layer" aria-label={`Page ${number} text`}>
      {text.text.map((t,i) => <span key={i} style={{left:`${t.x*100}%`,top:`${t.y*100}%`,width:`${t.width*100}%`,height:`${t.height*100}%`,fontSize:`${Math.max(1,t.height*text.height/text.width*100)}cqw`,transform:`rotate(${t.angle||0}deg)`}}>{t.str}</span>)}
    </div>}
    {pendingSelection?.rects.map((rect,index)=><div key={`draft-${index}`} className="proof-selection-mark" style={styleRect(rect)} aria-label="Unsaved correction selection"/>)}
    {mode==='text'&&!text.text.length&&<button className="proof-image-page-hint" onClick={onUseArea}>This page is image-based. Mark an area instead.</button>}
    {annotations.filter((a)=>a.page===number).flatMap((a)=>a.rects.map((r,i)=><button key={`${a._id}-${i}`} aria-label={`Comment: ${a.text}`} className={`proof-mark${focused===a._id?' is-focused':''}`} style={styleRect(r)} onClick={()=>onFocus(a._id)}/>))}
    {box&&<div className="proof-drag-box" style={styleRect(box)}/>}
  </div>;
});
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
  const select=useCallback(value=>{setSelection(value);setShowComments(true);},[]);
  const useArea=useCallback(()=>setMode('area'),[]);
  const focus=useCallback(id=>{setFocused(id);setShowComments(true);},[]);
  const [saving,setSaving]=useState(false); const [sync,setSync]=useState(''); const [focused,setFocused]=useState(null); const [showComments,setShowComments]=useState(false);
  draftRef.current={selection,comment};
  useEffect(()=>{if(selection&&showComments)commentInput.current?.focus({preventScroll:true});},[selection,showComments]);
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
    reviewGeneration.current++;discardLock.current=false;setDiscarding(null);setSaving(false);annotationRevision.current=0;saveAttempt.current=null;metadataRef.current=null;setMetadata(null);setOpened(false);setTurn(null);busy.current=false;setNavigating(false);setShowComments(false);setPage(1);setSelection(null);setComment('');setError('');setSync('');
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
  const annotations=metadata?.annotations||[];
  const pending=annotations.filter((a)=>!a.submittedAt);
  const next=()=>navigate(Math.min(metadata.pageCount,page===1||single?page+1:page+2));
  const previous=()=>navigate(Math.max(1,single?page-1:page===2?1:page-2));
  const save=async(e)=>{
    e.preventDefault();if(!selection||!comment.trim()||saving)return;
    const generation=reviewGeneration.current,submitted={selection,comment},body={...selection,text:comment.trim()},key=JSON.stringify(body);
    if(saveAttempt.current?.key!==key)saveAttempt.current={key,id:crypto.randomUUID()};
    setSaving(true);setSync('Saving…');setError('');
    try{
      const data=await reader.save({...body,clientMutationId:saveAttempt.current.id});
      if(generation!==reviewGeneration.current)return;
      annotationRevision.current++;rememberMetadata({...metadataRef.current,annotations:data.annotations});
      if(draftRef.current.selection===submitted.selection&&draftRef.current.comment===submitted.comment){setSelection(null);setComment('');saveAttempt.current=null;setSync('Saved');}
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
  const jump=(a)=>{navigate(single||a.page===1?a.page:a.page%2===0?a.page:a.page-1);setFocused(a._id);};
  const content=<section ref={root} role={expanded?'dialog':'region'} aria-modal={expanded?true:undefined} className={`pdf-book${expanded?' is-expanded':''}${turn?' is-turning':''}`}  aria-label={`${title} reader`} onContextMenu={(e)=>e.preventDefault()} onKeyDown={(e)=>{if(expanded&&e.key==='Tab'){const items=[...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key==='Escape'&&expanded){e.preventDefault();e.stopPropagation();setExpanded(false);return;}if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(!metadata?.pageCount)return;if(e.key==='ArrowRight'){e.preventDefault();next();}if(e.key==='ArrowLeft'){e.preventDefault();previous();}if((e.ctrlKey||e.metaKey)&&['p','s'].includes(e.key.toLowerCase()))e.preventDefault();}} tabIndex={0}>
    <header className="proof-toolbar"><strong>{title}</strong>
      {metadata?.canComment&&<div className="proof-modes" aria-label="Review tools">{[['read','Read'],['text','Select text'],['area','Mark image / area']].map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}</div>}
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
        {showComments&&<aside className="proof-comments" aria-label="Magazine comments"><div className="proof-comments-heading"><strong>Corrections</strong><button aria-label="Close comments" onClick={()=>setShowComments(false)}><X size={16}/></button></div>
          {selection&&metadata.canComment&&<form onSubmit={save}><strong>Page {selection.page} correction</strong>{selection.selectedText&&<blockquote>{selection.selectedText}</blockquote>}<textarea ref={commentInput} aria-label="Correction comment" value={comment} onChange={(e)=>setComment(e.target.value)} required maxLength={4000}/><button disabled={saving}>Save comment</button><button type="button" disabled={saving} onClick={()=>{setSelection(null);setComment('');}}>Cancel</button></form>}
          {!annotations.length&&!selection&&<p>{metadata.canComment?'Select text or mark an image area to add a correction.':'No submitted corrections for this version.'}</p>}
          {annotations.map((a)=><article key={a._id} className={focused===a._id?'is-focused':''}><button onClick={()=>jump(a)}>Page {a.page} · {a.authorName}</button>{a.selectedText&&<blockquote>{a.selectedText}</blockquote>}<p>{a.text}</p><small>{a.submittedAt?'Submitted':'Private review comment'} · {new Date(a.createdAt).toLocaleString()}</small>{!a.submittedAt&&metadata.canComment&&<button disabled={Boolean(discarding)} onClick={()=>discard(a._id)}>{discarding===a._id?'Removing…':'Discard'}</button>}</article>)}
          {metadata.canComment&&pending.length>0&&<button disabled={saving} onClick={submit}>Return for corrections ({pending.length})</button>}
        </aside>}
      </div>
      <footer className="proof-footer"><div className="proof-zoom"><button onClick={()=>setZoom(z=>Math.max(.6,Math.round((z-.2)*10)/10))} aria-label="Zoom out"><Minus size={15}/></button><button className="proof-fit" aria-label="Fit pages to screen" onClick={()=>setZoom(1)}>{zoom===1?'Fit':`${Math.round(zoom*100)}%`}</button><button onClick={()=>setZoom(z=>Math.min(2,Math.round((z+.2)*10)/10))} aria-label="Zoom in"><Plus size={15}/></button></div>
        <div className="proof-pagination"><button aria-label="Previous page" disabled={page===1||navigating||Boolean(turn)} onClick={previous}><ChevronLeft size={19}/></button><label><span className="sr-only">Page</span><input aria-label="Go to page" type="number" min="1" max={metadata.pageCount} disabled={navigating||Boolean(turn)} value={pageInput} onChange={e=>{const value=e.target.value;setPageInput(value);clearTimeout(jumpTimer.current);const n=Number(value);if(n>=1&&n<=metadata.pageCount)jumpTimer.current=setTimeout(()=>navigate(single||n===1?n:n%2===0?n:n-1),250);}}/><span> / {metadata.pageCount}</span></label><button aria-label="Next page" disabled={page+(single||page===1?1:2)>metadata.pageCount||navigating||Boolean(turn)} onClick={next}><ChevronRight size={19}/></button></div>
        <span className="proof-sync" role="status">{navigating?'Preparing pages…':sync}</span>
      </footer>
    </>}
  </section>;
  return expanded?createPortal(content,document.body):content;
}
