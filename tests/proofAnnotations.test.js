import test from 'node:test';
import assert from 'node:assert/strict';
import {smallestImage,containsPoint,annotationStatus} from '../src/utils/proofAnnotations.js';
const region=(id,x,y,w,h)=>({id,rect:{x,y,width:w,height:h},quad:[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]});
test('overlapping image selection chooses the smallest containing region and respects rotated boundaries',()=>{
 const large=region('large',.1,.1,.8,.8),small=region('small',.2,.2,.1,.1),rotated={id:'rotated',rect:{x:.5,y:.2,width:.3,height:.4},quad:[{x:.65,y:.2},{x:.8,y:.4},{x:.65,y:.6},{x:.5,y:.4}]};
 assert.equal(smallestImage([large,small,rotated],{x:.25,y:.25}).id,'small');assert.equal(smallestImage([large,small,rotated],{x:.65,y:.4}).id,'rotated');assert.equal(containsPoint(rotated.quad,{x:.51,y:.21}),false);assert.equal(smallestImage([small],{x:.9,y:.9}),undefined);
});
test('tracking uses server checklist status and supports legacy private/submitted annotations',()=>{
 assert.equal(annotationStatus({}),'private');assert.equal(annotationStatus({submittedAt:'now'}),'submitted');assert.equal(annotationStatus({submittedAt:'now',correction:{status:'addressed'}}),'addressed');assert.equal(annotationStatus({reviewStatus:'open'}),'open');
});
