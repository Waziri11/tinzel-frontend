export const geometryVersion=2;
export const rectStyle=r=>({left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%`});
export function containsPoint(quad,p){let inside=false;for(let i=0,j=quad.length-1;i<quad.length;j=i++){const a=quad[i],b=quad[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
export function smallestImage(regions,p){return regions.filter(r=>containsPoint(r.quad,p)).sort((a,b)=>a.rect.width*a.rect.height-b.rect.width*b.rect.height)[0];}
export function selectionAnchor(surface,selection){
 if(!selection?.rangeCount||!selection.toString().trim()||!surface.contains(selection.anchorNode)||!surface.contains(selection.focusNode))return null;
 const bounds=surface.getBoundingClientRect(),range=selection.getRangeAt(0),rects=[];
 const walker=document.createTreeWalker(surface.querySelector('.proof-text-layer'),NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode;if(!range.intersectsNode(node))continue;
  const part=document.createRange();part.selectNodeContents(node);
  if(range.startContainer===node)part.setStart(node,range.startOffset);
  if(range.endContainer===node)part.setEnd(node,range.endOffset);
  for(const b of part.getClientRects()){
   const left=Math.max(bounds.left,b.left),top=Math.max(bounds.top,b.top),right=Math.min(bounds.right,b.right),bottom=Math.min(bounds.bottom,b.bottom);
   if(right>left&&bottom>top)rects.push({x:(left-bounds.left)/bounds.width,y:(top-bounds.top)/bounds.height,width:(right-left)/bounds.width,height:(bottom-top)/bounds.height});
  }
 }
 if(!rects.length)return null;
 return {kind:'text',rects:rects.slice(0,200),selectedText:selection.toString().trim()};
}
export const annotationStatus=a=>a.reviewStatus||(!a.submittedAt?'private':a.correction?.status||'submitted');
