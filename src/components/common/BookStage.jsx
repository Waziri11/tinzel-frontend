import React, {useLayoutEffect, useRef, useState} from 'react';

// Shared by CSS and the navigation lock; the paper settles before another turn starts.
export const PAPER_TURN_MS=640;
const PAPER_SEGMENTS=16;

// Each hinge bends a little more toward the free edge. Nesting the strips keeps
// their edges joined while the sheet curls; the annotation surface never moves.
function PaperLeaf({turn,width,single}){
  const backward=!single&&turn.direction==='backward';
  const strip=width/PAPER_SEGMENTS;
  const section=index=>{
    const frontIndex=backward?PAPER_SEGMENTS-1-index:index;
    const backIndex=PAPER_SEGMENTS-1-frontIndex;
    const face=(value,offset,className)=><div className={className}>{value&&<img src={value.image} alt="" draggable={false} style={{width,left:1-offset*strip}}/>}</div>;
    return <div className="book-paper-segment" style={{'--hinge-bend':`${(backward?-1:1)*(1.8+index*.22)}deg`,'--shade-start':.06+index*.012,'--shade-end':.06+(index+1)*.012}} key={index}>
      {face(single&&turn.direction==='backward'?turn.back:turn.front,frontIndex,'book-turn-front')}
      {face(single?null:turn.back,backIndex,'book-turn-back')}
      {index<PAPER_SEGMENTS-1&&section(index+1)}
    </div>;
  };
  return <div className="book-turn-leaf" style={{'--strip-width':`${strip}px`}}>{section(0)}</div>;
}

// The page surfaces remain independent of the decorative turning leaf, so annotation anchors
// always refer to an untransformed page. Only the transient leaf animates on the compositor.
export default function BookStage({page,single,zoom,cache,turn,mode,renderPage,onNext,onPrevious}){
  const stage=useRef(null),gesture=useRef(null);
  const [size,setSize]=useState({width:600,height:600});
  useLayoutEffect(()=>{
    const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(stage.current);return()=>observer.disconnect();
  },[]);
  const current=cache?.peek(page)?.text||cache?.peek(1)?.text;
  const facing=!single&&page>1?cache?.peek(page+1)?.text:null;
  const ratio=Math.max(current?current.width/current.height:.75,facing?facing.width/facing.height:0);
  const height=Math.max(1,Math.min(size.height-24,(size.width-24)/(single?ratio:2*ratio)))*zoom;
  const width=height*ratio,spread=!single&&page>1;
  const frameStyle={width:width*(spread?2:1),height,'--leaf-width':`${width}px`,'--paper-turn-duration':`${PAPER_TURN_MS}ms`};
  const portrait=(value)=>value&&<img src={value.image} alt="" draggable={false}/>;
  return <div className={`proof-stage${zoom>1?' is-zoomed':''}`} ref={stage}
    onPointerDown={event=>{if(mode!=='read'||zoom>1||event.target.closest('button,input,textarea'))return;gesture.current={x:event.clientX,y:event.clientY,at:performance.now()};}}
    onPointerCancel={()=>gesture.current=null}
    onPointerUp={event=>{const start=gesture.current;gesture.current=null;if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5&&performance.now()-start.at<900){if(dx<0)onNext();else onPrevious();}}}>
    <div className={`book-position${spread?' is-spread':''}`} style={frameStyle}>
      <div className="book-page-slot">{renderPage(page)}</div>
      {spread&&<div className="book-page-slot">{renderPage(page+1)}</div>}
      {spread&&<div className="book-spine" aria-hidden="true"/>}
      {turn&&<div className={`book-turn turn-${turn.direction}${single?' turn-single':''}${turn.fromCover?' from-cover':''}${turn.toCover?' to-cover':''}`} aria-hidden="true">
        {(turn.stationary||(single&&turn.direction==='backward'))&&<div className="book-stationary">{portrait(single?turn.front:turn.stationary)}</div>}
        <PaperLeaf turn={turn} width={width} single={single}/>
      </div>}
    </div>
  </div>;
}
