import React,{useEffect,useRef,useState} from 'react';
import {annotationStatus} from '../../utils/proofAnnotations';
export default function ProofComments({annotations,focused,focusSerial,onJump,onClose,onDiscard,discarding,canComment,pending,saving,onSubmit,currentPages}){
 const [filter,setFilter]=useState('all'),root=useRef(null);
 const matches=a=>filter==='all'||(filter==='page'?currentPages.includes(a.page):annotationStatus(a)===filter);
 const shown=annotations.filter(matches).sort((a,b)=>a.page-b.page||a.displayNumber-b.displayNumber),groups=Map.groupBy?Map.groupBy(shown,a=>a.page):shown.reduce((m,a)=>m.set(a.page,[...(m.get(a.page)||[]),a]),new Map());
 useEffect(()=>{if(!focused)return;if(annotations.some(a=>a._id===focused&&!matches(a)))setFilter('all');},[focused,focusSerial]);
 useEffect(()=>{if(!focused)return;const row=Array.from(root.current?.querySelectorAll('[data-comment-row]')||[]).find(el=>el.dataset.commentRow===focused);row?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[focused,focusSerial,filter]);
 const active=shown.findIndex(a=>a._id===focused);
 return <aside ref={root} className="proof-comments" aria-label="Magazine comments">
  <div className="proof-comments-controls"><div className="proof-comments-heading"><strong>Comments · {annotations.length}</strong><button aria-label="Close comments" onClick={onClose}>×</button></div>
  <label className="proof-filter">Show <select aria-label="Filter comments" value={filter} onChange={e=>setFilter(e.target.value)}>{[['all','All'],['page','Current page'],['private','Private'],['open','Open'],['addressed','Addressed']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
  <nav className="proof-comment-navigation" aria-label="Comment navigation"><button aria-label="Previous comment" disabled={!shown.length||active<=0} onClick={()=>onJump(shown[active-1])}>← Previous</button><button aria-label="Next comment" disabled={!shown.length||active===shown.length-1} onClick={()=>onJump(shown[Math.max(0,active+1)])}>Next →</button></nav></div>
  {!shown.length&&<p>{annotations.length?'No comments match this filter.':canComment?'Select text or an image to add a correction.':'No submitted corrections for this version.'}</p>}
  {Array.from(groups).sort(([a],[b])=>a-b).map(([page,items])=><section className="proof-comment-group" key={page} aria-label={`Page ${page} comments`}><h3>Page {page} <span>{items.length}</span></h3>{items.map(a=><article key={a._id} data-comment-row={a._id} className={focused===a._id?'is-focused':''}>
   <button className="proof-comment-card" aria-label={`Open comment ${a.displayNumber} on page ${a.page}`} aria-current={focused===a._id?'true':undefined} onClick={()=>onJump(a)}><span className="proof-comment-title">#{a.displayNumber} · {a.authorName}</span><span className={`proof-comment-status status-${annotationStatus(a)}`}>{annotationStatus(a)}</span>{a.selectedText&&<blockquote>{a.selectedText}</blockquote>}<span className="proof-comment-body">{a.text}</span><small>{new Date(a.createdAt).toLocaleString()}</small></button>
   {a.correction&&<div className="proof-comment-response"><small>Round {a.correction.roundNumber} · {a.correction.roundStatus.replaceAll('_',' ')}</small>{a.correction.designerResponse&&<><strong>Designer response</strong><p>{a.correction.designerResponse}</p></>}{a.correction.addressedAt&&<small>Addressed {new Date(a.correction.addressedAt).toLocaleString()}</small>}</div>}
   {!a.submittedAt&&canComment&&<button disabled={Boolean(discarding)} onClick={()=>onDiscard(a._id)}>{discarding===a._id?'Removing…':'Discard'}</button>}
  </article>)}</section>)}
  {canComment&&pending.length>0&&<button disabled={saving} onClick={onSubmit}>Return for corrections ({pending.length})</button>}
 </aside>;
}
