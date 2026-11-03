import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionButton } from '../src/components/common/SoftFlutter';
function Harness() {
  const [calls, setCalls] = useState(0);
  return <><ActionButton onClick={() => { setCalls(n => n + 1); return new Promise(resolve => { window.finishAction = resolve; }); }}>Save changes</ActionButton><output>{calls}</output></>;
}
createRoot(document.getElementById('root')).render(<Harness />);
