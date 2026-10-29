import { createProofPageCache, proofBatch } from '../../utils/proofPageCache';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { proofApi } from '../../services/api';
import './pdfBookReader.css';

function Page({ reader, cache, number, annotations, mode, onSelect, onFocus, focused }) {
  const [image, setImage] = useState(''); const [text, setText] = useState(null); const [error, setError] = useState('');
  const [attempt,setAttempt]=useState(0);
  const surface = useRef(null); const drag = useRef(null); const [box, setBox] = useState(null);
  useEffect(() => {
    let active = true; let timer;
    setImage(''); setText(null); setError('');
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
  return <div className={`proof-sheet mode-${mode}`} ref={surface} style={{ aspectRatio: `${text.width}/${text.height}` }}
    onPointerDown={(e) => { if (mode === 'area') { drag.current=point(e); surface.current.setPointerCapture(e.pointerId); } }}
    onPointerMove={(e) => { if (drag.current) setBox(rectangle(drag.current,point(e))); }} onPointerCancel={() => {drag.current=null;setBox(null);}} onPointerUp={finish}>
    <img src={image} alt={`Magazine page ${number}`} draggable={false}/>
    <div className="proof-text-layer" aria-label={`Page ${number} text`}>
      {text.text.map((t,i) => <span key={i} style={{left:`${t.x*100}%`,top:`${t.y*100}%`,width:`${t.width*100}%`,height:`${t.height*100}%`,fontSize:`${Math.max(1,t.height*text.height/text.width*100)}cqw`,transform:`rotate(${t.angle||0}deg)`}}>{t.str}</span>)}
    </div>
    {annotations.filter((a)=>a.page===number).flatMap((a)=>a.rects.map((r,i)=><button key={`${a._id}-${i}`} aria-label={`Comment: ${a.text}`} className={`proof-mark${focused===a._id?' is-focused':''}`} style={styleRect(r)} onClick={()=>onFocus(a._id)}/>))}
    {box&&<div className="proof-drag-box" style={styleRect(box)}/>}
  </div>;
}
export default function PdfBookReader({ token, orderId, version, client = false, title = 'Magazine proof', onReviewed, focusAnnotation }) {
  const reader = useMemo(()=>proofApi(token,orderId,version,client),[token,orderId,version,client]);
  const [cache,setCache]=useState(null);
  const [opened,setOpened]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const root=useRef(null); const [metadata,setMetadata]=useState(null); const [error,setError]=useState('');
  const [page,setPage]=useState(1); const [single,setSingle]=useState(window.innerWidth<=760); const [zoom,setZoom]=useState(1);
  const [mode,setMode]=useState('read'); const [selection,setSelection]=useState(null); const [comment,setComment]=useState('');
  const [saving,setSaving]=useState(false); const [sync,setSync]=useState(''); const [focused,setFocused]=useState(null); const [showComments,setShowComments]=useState(true);
  useEffect(()=>{const media=window.matchMedia('(max-width:760px)');const change=()=>setSingle(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  useEffect(()=>{
    let active=true,timer;const localCache=createProofPageCache(reader);setCache(localCache);
    setMetadata(null);setOpened(false);setPage(1);setSelection(null);setComment('');setError('');setSync('');
    const load=async()=>{
      try{
        let data=await reader.metadata();if(!active)return;setMetadata(data);
        const cover=data.pages?.some(p=>p.page===1);
        if(!cover){
          const diagnostic=data.diagnostics?.find(d=>d.page===0||d.page===1);
          if(data.state==='failed'||diagnostic)throw new Error((diagnostic?.message||data.message||'Cover preparation failed')+(diagnostic?.reference?` Reference: ${diagnostic.reference}`:''));
          data=await reader.prepare([1]);if(!active)return;setMetadata(data);
        }
        if(data.pages?.some(p=>p.page===1)){
          await localCache.get(1);if(!active)return;
          setOpened(true);return;
        }
        timer=setTimeout(load,1000);
      }catch(e){if(active)setError(e.message);}
    };
    load();return()=>{active=false;clearTimeout(timer);localCache.dispose();};
  },[reader,refresh]);
  useEffect(()=>{
    if(!opened||!metadata?.pageCount||!cache)return;
    let active=true,timer;
    const visible=[page,...(!single&&page>1&&page<metadata.pageCount?[page+1]:[])];
    const desired=[...new Set(visible.flatMap((number)=>proofBatch(number,metadata.pageCount)))];
    const load=async()=>{
      try{
        cache.setVisible(visible);
        const current=await reader.metadata();if(!active)return;
        const known=new Set(current.pages.map(p=>p.page));
        const data=desired.every(n=>known.has(n))?current:await reader.prepare(visible);if(!active)return;
        const failedVisible=data.diagnostics?.find(d=>visible.includes(d.page));if(failedVisible)throw new Error(`${failedVisible.message} Reference: ${failedVisible.reference}`);
        const ready=new Set(data.pages.map((p)=>p.page));
        // Fetch visible pages before background pages; the cache pins the current spread.
        for(const number of [...visible,...desired.filter((n)=>!visible.includes(n))])if(ready.has(number))cache.get(number,{priority:visible.includes(number)?100:0}).catch(()=>{});
        if(desired.some((n)=>!ready.has(n)))timer=setTimeout(load,2000);
      }catch(e){if(active)setError(e.message);}
    };
    load();return()=>{active=false;clearTimeout(timer);};
  },[reader,cache,opened,page,single,metadata?.pageCount]);
  useEffect(()=>{if(focusAnnotation&&metadata){const a=metadata.annotations.find((a)=>a._id===focusAnnotation);if(a){setPage(single||a.page===1?a.page:a.page%2===0?a.page:a.page-1);setFocused(a._id);setShowComments(true);}}},[focusAnnotation,metadata,single]);
  useEffect(()=>{if(!single)setPage((p)=>p>1&&p%2===1?p-1:p);},[single]);
  const annotations=metadata?.annotations||[];
  const pending=annotations.filter((a)=>!a.submittedAt);
  const next=()=>setPage((p)=>Math.min(metadata.pageCount,p===1||single?p+1:p+2));
  const previous=()=>setPage((p)=>Math.max(1,single?p-1:p===2?1:p-2));
  const save=async(e)=>{e.preventDefault();if(!selection||!comment.trim())return;setSaving(true);setSync('Saving…');setError('');try{const data=await reader.save({...selection,text:comment});setMetadata((m)=>({...m,annotations:data.annotations}));setSelection(null);setComment('');setSync('Saved');}catch(e){setError(e.message);setSync('Save failed — retry');}finally{setSaving(false);}};
  const discard=async(id)=>{setError('');try{const data=await reader.discard(id);setMetadata((m)=>({...m,annotations:data.annotations}));setSync('Saved');}catch(e){setError(e.message);}};
  const submit=async()=>{if(selection){setError('Save or cancel the current comment first.');return;}setSaving(true);setError('');try{await reader.submit();const data=await reader.metadata();setMetadata(data);setMode('read');setSync('Corrections submitted');onReviewed?.();}catch(e){setError(e.message);}finally{setSaving(false);}};
  const jump=(a)=>{setPage(single||a.page===1?a.page:a.page%2===0?a.page:a.page-1);setFocused(a._id);};
  return <section ref={root} className="pdf-book" aria-label={`${title} reader`} onContextMenu={(e)=>e.preventDefault()} onKeyDown={(e)=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(!metadata?.pageCount)return;if(e.key==='ArrowRight'){e.preventDefault();next();}if(e.key==='ArrowLeft'){e.preventDefault();previous();}if((e.ctrlKey||e.metaKey)&&['p','s'].includes(e.key.toLowerCase()))e.preventDefault();}} tabIndex={0}>
    <header><strong>{title}</strong><div className="proof-tools"><button onClick={()=>setZoom((z)=>Math.max(.6,z-.2))} aria-label="Zoom out">−</button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom((z)=>Math.min(2,z+.2))} aria-label="Zoom in">+</button><button onClick={()=>setSingle(!single)}>{single?'Book view':'Single page'}</button><button onClick={()=>{if(document.fullscreenElement)document.exitFullscreen();else root.current.requestFullscreen?.().catch(()=>setError('Fullscreen is unavailable'));}}>Fullscreen</button><button onClick={()=>setShowComments(!showComments)}>Comments ({annotations.length})</button></div></header>
    {metadata?.canComment&&<div className="proof-tools proof-mode">{[['read','Read'],['text','Select text'],['area','Mark image / area']].map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}<span role="status">{sync}</span></div>}
    {error&&<div className="proof-error" role="alert">{error}</div>}
    {!metadata?<div className="proof-page-message">{error?'Unable to open magazine.':'Opening magazine…'}</div>:metadata.state==='failed'&&!opened?<div className="proof-page-message">{metadata.message}<button onClick={async()=>{try{await reader.retry();setRefresh((n)=>n+1);}catch(e){setError(e.message);}}}>Retry preparation</button></div>:!opened?<div className="proof-page-message" role="status">Preparing magazine cover…{error&&<button onClick={async()=>{try{await reader.retry();setRefresh((n)=>n+1);}catch(e){setError(e.message);}}}>Retry preparation</button>}</div>:<>
      <div className={`proof-layout${showComments?'':' no-comments'}`}>
        <div className="proof-scroll"><div className="pdf-book-spread" style={{width:`${zoom*100}%`,minWidth:'100%'}}>
          <Page cache={cache} key={`${version}-${page}`} reader={reader} number={page} annotations={annotations} mode={metadata.canComment?mode:'read'} onSelect={setSelection} onFocus={setFocused} focused={focused}/>
          {!single&&page>1&&page<metadata.pageCount&&<Page cache={cache} key={`${version}-${page+1}`} reader={reader} number={page+1} annotations={annotations} mode={metadata.canComment?mode:'read'} onSelect={setSelection} onFocus={setFocused} focused={focused}/>}
        </div></div>
        {showComments&&<aside className="proof-comments" aria-label="Magazine comments">
          {selection&&metadata.canComment&&<form onSubmit={save}><strong>Page {selection.page} correction</strong>{selection.selectedText&&<blockquote>{selection.selectedText}</blockquote>}<textarea aria-label="Correction comment" value={comment} onChange={(e)=>setComment(e.target.value)} required maxLength={4000}/><button disabled={saving}>Save comment</button><button type="button" disabled={saving} onClick={()=>{setSelection(null);setComment('');}}>Cancel</button></form>}
          {!annotations.length&&<p>{metadata.canComment?'Select text or mark an image area to add a correction.':'No submitted corrections for this version.'}</p>}
          {annotations.map((a)=><article key={a._id} className={focused===a._id?'is-focused':''}><button onClick={()=>jump(a)}>Page {a.page} · {a.authorName}</button>{a.selectedText&&<blockquote>{a.selectedText}</blockquote>}<p>{a.text}</p><small>{a.submittedAt?'Submitted':'Private review comment'} · {new Date(a.createdAt).toLocaleString()}</small>{!a.submittedAt&&metadata.canComment&&<button onClick={()=>discard(a._id)}>Discard</button>}</article>)}
          {metadata.canComment&&pending.length>0&&<button disabled={saving} onClick={submit}>Return for corrections ({pending.length})</button>}
        </aside>}
      </div>
      <footer><button aria-label="Previous page" disabled={page===1} onClick={previous}>←</button><label>Page <input aria-label="Go to page" type="number" min="1" max={metadata.pageCount} value={page} onChange={(e)=>{const n=Number(e.target.value);if(n>=1&&n<=metadata.pageCount)setPage(single||n===1?n:n%2===0?n:n-1);}}/> of {metadata.pageCount}</label><button aria-label="Next page" disabled={page+(single||page===1?1:2)>metadata.pageCount} onClick={next}>→</button></footer>
    </>}
  </section>;
}
