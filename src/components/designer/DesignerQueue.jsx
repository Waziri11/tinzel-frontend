import React, { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import BrandLoading from '../common/BrandLoading';
import './designerWorkspace.css';

export default function DesignerQueue({ token, onOpenOrder }) {
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setOrders((await api.designer.getOrders(token)).orders || []); } catch (err) { setError(err.message || 'Unable to load orders'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [token]);
  if (loading) return <BrandLoading title="Loading assigned orders" description="Getting your design queue ready." />;
  return <section className="designer-page">
    <div className="designer-page-title"><div><h1>Design orders</h1><p>Open an order to work with its files, drafts and history.</p></div><button type="button" className="secondary-button" onClick={load}><RefreshCw size={16}/>Refresh</button></div>
    {error && <div className="designer-alert is-error">{error}</div>}
    <div className="designer-table-card"><table><thead><tr><th>Order</th><th>Client</th><th>Edition</th><th>Status</th><th>Updated</th><th></th></tr></thead>
      <tbody>{orders.map((order) => <tr key={order._id}><td><strong>{order.trackingId || order.submissionId}</strong></td><td>{order.clientName}</td><td>{order.formTitle}</td><td><span className="designer-status">{order.status.replaceAll('_',' ')}</span></td><td>{new Date(order.updatedAt).toLocaleDateString()}</td><td><button type="button" aria-label={`Open ${order.trackingId || order.submissionId}`} onClick={() => onOpenOrder(order._id)}>Open <ArrowRight size={15}/></button></td></tr>)}</tbody>
    </table>{!orders.length && <div className="designer-empty">No orders are assigned to you.</div>}</div>
  </section>;
}
