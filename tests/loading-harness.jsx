import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionButton } from '../src/components/common/SoftFlutter';
function Harness() {
  const [calls, setCalls] = useState(0);
  const [busy, setBusy] = useState(false);
  return <><ActionButton onClick={() => { setCalls(n => n + 1); return new Promise(resolve => { window.finishAction = resolve; }); }}>Save changes</ActionButton><output>{calls}</output>
    <form onSubmit={event => { event.preventDefault(); setBusy(true); window.finishForm = () => setBusy(false); }}>
      <input aria-label="Form value" /><ActionButton loading={busy}>Submit form</ActionButton>
    </form>
    <ActionButton loading={busy}>Unrelated action</ActionButton>
  </>;
}
createRoot(document.getElementById('root')).render(<Harness />);
