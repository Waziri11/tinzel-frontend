import React,{useEffect,useMemo,useRef,useState} from 'react';
import {geometryVersion,rectStyle,smallestImage,selectionAnchor} from '../../utils/proofAnnotations';
let measureContext;
const TextRun=React.memo(function TextRun({item:t,ratio}){
 // Scale is independent of viewport size; one measurement also covers zoom and resize.
 const scale=useMemo(()=>{measureContext ||= document.createElement('canvas').getContext('2d');measureContext.font=`100px ${t.fontFamily||'sans-serif'}`;const measured=measureContext.measureText(t.str).width;return measured>0&&t.height>0?t.width/(t.height*ratio*measured/100):1;},[t,ratio]);
 return <span dir={t.dir||'ltr'} style={{left:`${t.x*100}%`,top:`${t.y*100}%`,fontSize:`${Math.max(.01,t.height*ratio*100)}cqw`,fontFamily:t.fontFamily||'sans-serif',transform:`rotate(${t.angle||0}deg) scaleX(${scale})`}}>{t.str}{t.hasEOL?'\n':''}</span>;
});
export default React.memo(function ProofPage({reader,cache,number,annotations,mode,onSelect,onFocus,focused,pendingSelection,onUseArea}){
 const known=cache.peek(number),[value,setValue]=useState(known),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const surface=useRef(null),drag=useRef(null),[box,setBox]=useState(null),[candidate,setCandidate]=useState(null),[hover,setHover]=useState(null),[geometryState,setGeometryState]=useState(''),[geometryError,setGeometryError]=useState(''),[geometryAttempt,setGeometryAttempt]=useState(0);
 useEffect(()=>{let active=true,timer;setValue(cache.peek(number));setError('');setCandidate(null);
  const load=async()=>{try{const data=await cache.get(number);if(active)setValue({...data});}catch(e){if(active){if(e.pending)timer=setTimeout(load,1500);else setError(e.message);}}};load();return()=>{active=false;clearTimeout(timer);};
 },[reader,cache,number,attempt]);
 useEffect(()=>{
  if(!value||!['text','image'].includes(mode)||value.text.geometryVersion>=geometryVersion)return;
  let active=true,timer,attempts=0;setGeometryState('preparing');setGeometryError('');
  const run=async()=>{try{
   let status=await reader.prepare([number],{geometryOnly:true,retry:geometryAttempt>0});
   const poll=async()=>{
    const g=await reader.text(number);if(!active)return;
    if(g.geometryVersion>=geometryVersion){cache.updateText(number,g);setValue(v=>({...v,text:g}));setGeometryState('');return;}
    const page=status.pages?.find(p=>p.page===number);if(page?.geometryState==='failed')throw new Error((page.geometryError?.message||'Selection preparation failed')+(page.geometryError?.reference?` Reference: ${page.geometryError.reference}`:''));
    if(++attempts>40)throw new Error('Selection preparation is taking too long. Retry or mark an area.');
    status=attempts%6===0?await reader.prepare([number],{geometryOnly:true}):await reader.metadata();if(active)timer=setTimeout(()=>poll().catch(fail),1500);
   };await poll();
  }catch(e){fail(e);}};
  const fail=error=>{if(active){setGeometryState('failed');setGeometryError(error?.message||'Selection preparation failed.');}};run();return()=>{active=false;clearTimeout(timer);};
 },[reader,cache,number,mode,value?.text.geometryVersion,geometryAttempt]);
 useEffect(()=>{
  setCandidate(null);if(mode!=='text')return;
  let timer;
  const selected=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!surface.current)return;const anchor=selectionAnchor(surface.current,window.getSelection());setCandidate(anchor?{...anchor,page:number}:null);},80);};
  document.addEventListener('selectionchange',selected);return()=>{clearTimeout(timer);document.removeEventListener('selectionchange',selected);};
 },[mode,number]);
 const point=e=>{const b=surface.current.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))};};
 const rectangle=(a,b)=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)});
 const commit=selection=>{const b=surface.current.getBoundingClientRect(),r=selection.rects[0];onSelect({...selection,anchor:{x:b.left+(r.x+r.width)*b.width,y:b.top+(r.y+r.height)*b.height}});setCandidate(null);window.getSelection()?.removeAllRanges();};
 const chooseImage=region=>setCandidate({page:number,kind:'image',imageRegionId:region.id,imageQuad:region.quad,rects:[region.rect],selectedText:''});
 if(error)return <div className="proof-page-message" role="alert">{error}<button onClick={async()=>{try{await reader.retry();await reader.prepare([number]);setAttempt(n=>n+1);}catch(e){setError(e.message);}}}>Retry preparation</button></div>;
 if(!value)return <div className="proof-page-message" role="status">Preparing page {number}…</div>;
 const {image,text}=value,regions=text.imageRegions||[],selected=pendingSelection||candidate;
 return <div ref={surface} className={`proof-sheet mode-${mode}`} style={{aspectRatio:`${text.width}/${text.height}`,width:`min(100%, ${100*text.width/text.height}cqh)`}}
  onPointerDown={e=>{if(mode==='area'&&!e.target.closest('button')){drag.current=point(e);surface.current.setPointerCapture(e.pointerId);}}}
  onPointerMove={e=>{if(drag.current)setBox(rectangle(drag.current,point(e)));if(mode==='image')setHover(smallestImage(regions,point(e)));}}
  onPointerLeave={()=>setHover(null)} onPointerCancel={()=>{drag.current=null;setBox(null);}}
  onPointerUp={e=>{if(mode==='area'&&drag.current){const rect=rectangle(drag.current,point(e));drag.current=null;setBox(null);if(rect.width>.003&&rect.height>.003)commit({page:number,kind:'area',rects:[rect],selectedText:''});}}}
  onClick={e=>{if(mode==='image'&&!e.target.closest('button')){const region=smallestImage(regions,point(e));if(region)chooseImage(region);}}}>
  <img src={image} alt={`Magazine page ${number}`} draggable={false}/>
  {mode==='text'&&<div className="proof-text-layer" aria-label={`Page ${number} text`}>{text.text.map((t,i)=><TextRun key={i} item={t} ratio={text.height/text.width}/>)}</div>}
  {mode==='image'&&<svg className="proof-image-targets" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label={`Page ${number} images`}>{regions.map((r,i)=><polygon key={r.id} points={r.quad.map(p=>`${p.x},${p.y}`).join(' ')} className={hover?.id===r.id?'is-hovered':''} role="button" aria-label={`Select ${r.pageImage?'page image':'image'} ${i+1} on page ${number}`} tabIndex={0} onKeyDown={e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();chooseImage(r);}}}/>)}</svg>}
  {selected?.rects.map((r,i)=><div key={i} className="proof-selection-mark" aria-label={pendingSelection?'Unsaved correction selection':'Selected correction target'} style={rectStyle(r)}/>)}
  {candidate&&<button className="proof-add-comment" onPointerDown={e=>e.preventDefault()} onClick={e=>{e.stopPropagation();const latest=candidate.kind==='text'?selectionAnchor(surface.current,window.getSelection()):null;commit(latest?{...latest,page:number}:candidate);}} style={{left:`${Math.min(75,candidate.rects[0].x*100)}%`,top:`${Math.min(88,(candidate.rects[0].y+candidate.rects[0].height)*100)}%`}}>Add comment</button>}
  {['text','image'].includes(mode)&&geometryState&&<div className="proof-geometry-status" role="status">{geometryState==='failed'?<>{geometryError} <button onClick={()=>setGeometryAttempt(n=>n+1)}>Retry selection</button></>:'Preparing selection tools…'}</div>}
  {mode==='text'&&!text.text.length&&<button className="proof-image-page-hint" onClick={onUseArea}>No selectable PDF text. Mark an area instead.</button>}
  {mode==='image'&&text.geometryVersion>=geometryVersion&&!regions.length&&<button className="proof-image-page-hint" onClick={onUseArea}>No separate PDF images. Mark an area instead.</button>}
  {annotations.filter(a=>a.page===number).map(a=><React.Fragment key={a._id}>
   {a.imageQuad?.length===4?<svg className={`proof-saved-image${focused===a._id?' is-focused':''}`} viewBox="0 0 1 1" preserveAspectRatio="none"><polygon points={a.imageQuad.map(p=>`${p.x},${p.y}`).join(' ')}/></svg>:a.rects.map((r,i)=><div key={i} className={`proof-mark${focused===a._id?' is-focused':''}`} style={rectStyle(r)}/>)}
   <button className={`proof-pin${focused===a._id?' is-focused':''}`} data-comment-id={a._id} style={{left:`${a.rects[0].x*100}%`,top:`${a.rects[0].y*100}%`}} aria-label={`Comment ${a.displayNumber}: ${a.text}`} aria-pressed={focused===a._id} onClick={e=>{e.stopPropagation();onFocus(a._id);}}>{a.displayNumber}</button>
  </React.Fragment>)}
  {box&&<div className="proof-drag-box" style={rectStyle(box)}/>}
 </div>;
});
