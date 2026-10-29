import React, {useLayoutEffect, useRef, useState} from 'react';

// The page surfaces remain independent of the decorative turning leaf, so annotation anchors
// always refer to an untransformed page. Only the transient leaf animates on the compositor.
export default function BookStage({page,single,zoom,cache,turn,mode,renderPage,onNext,onPrevious}){
  const stage=useRef(null),gesture=useRef(null);
  const [size,setSize]=useState({width:600,height:600});
  useLayoutEffect(()=>{
    const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(stage.current);return()=>observer.disconnect();
  },[]);
  const cover=cache?.peek(1)?.text,ratio=cover?cover.width/cover.height:.75;
  const height=Math.max(1,Math.min(size.height-24,(size.width-24)/(single?ratio:2*ratio)))*zoom;
  const width=height*ratio,spread=!single&&page>1;
  const frameStyle={width:width*(spread?2:1),height,'--leaf-width':`${width}px`};
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
        {turn.stationary&&<div className="book-stationary">{portrait(turn.stationary)}</div>}
        <div className="book-turn-leaf"><div className="book-turn-front">{portrait(turn.front)}</div><div className="book-turn-back">{portrait(turn.back)}</div></div>
      </div>}
    </div>
  </div>;
}
