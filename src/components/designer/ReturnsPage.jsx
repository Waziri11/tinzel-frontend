import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { api } from '../../services/api';
import BrandLoading from '../common/BrandLoading';
import './designerWorkspace.css';

export default function ReturnsPage({ token, onOpenOrder }) {
  const [filter, setFilter] = useState('active'); const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let live = true; setLoading(true); setError(''); api.designer.getReturns(token, { status: filter }).then((data) => live && setRows(data.returns || [])).catch((err) => live && setError(err.message)).finally(() => live && setLoading(false)); return () => { live = false; }; }, [token, filter]);
  return <section className="designer-page"><div className="designer-page-title"><div><h1>Returns & fixes</h1><p>Correction rounds from managers and clients.</p></div><div className="segmented"><button className={filter==='active'?'active':''} onClick={()=>setFilter('active')}>Open</button><button className={filter==='resolved'?'active':''} onClick={()=>setFilter('resolved')}>Resolved</button></div></div>
    {error && <div className="designer-alert is-error">{error}</div>}{loading ? <BrandLoading compact title="Loading returns"/> : <div className="designer-table-card"><table><thead><tr><th>Order</th><th>Client</th><th>From</th><th>Round</th><th>Progress</th><th></th></tr></thead><tbody>{rows.map((row) => { const done=(row.items||[]).filter(i=>i.status==='addressed').length; return <tr key={row._id}><td><strong>{row.trackingId}</strong></td><td>{row.clientName}</td><td>{row.source}</td><td>{row.roundNumber}</td><td>{row.status==='resolved'?<span className="return-progress done"><CheckCircle2 size={14}/>Resolved</span>:<span className="return-progress"><Clock3 size={14}/>{done}/{row.items.length} addressed</span>}</td><td><button onClick={()=>onOpenOrder(row.orderId)}>Open <ArrowRight size={15}/></button></td></tr>;})}</tbody></table>{!rows.length&&<div className="designer-empty">No {filter} returns.</div>}</div>}
  </section>;
}
