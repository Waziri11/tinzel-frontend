self.onmessage=async({data:{id,blob}})=>{
  try{const bytes=await blob.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);self.postMessage({id,hash:[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')});}
  catch(error){self.postMessage({id,error:error.message});}
};
