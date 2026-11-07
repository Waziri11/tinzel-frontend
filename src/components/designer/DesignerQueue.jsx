import { ActionButton } from '../common/SoftFlutter';
import { useInterfaceText } from '../../i18n/InterfaceText';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import PageSkeleton from '../common/PageSkeleton';
import './designerWorkspace.css';

const COLUMNS = [
  { id: 'new', title: 'New design orders', description: 'Assigned orders and designs awaiting review.' },
  { id: 'manager', title: 'Returned by managers', description: 'Changes requested during manager review.' },
  { id: 'client', title: 'Returned by client', description: 'Changes requested by the client.' },
  { id: 'completed', title: 'Completed', description: 'Approved designs, printing and delivered orders.' },
];
const PAGE_SIZE = 10;

function BoardColumn({ column, token, search, refresh, onOpenOrder }) {
  const tx = useInterfaceText();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ orders: [], total: 0, pageCount: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const query = useRef(search);
  useEffect(() => {
    let active = true;
    const requestedPage = query.current !== search ? 1 : page;
    query.current = search;
    if (requestedPage !== page) { setPage(requestedPage); return; }
    setLoading(true);
    setError('');
    api.designer.getOrders(token, { column: column.id, search, page: requestedPage, limit: PAGE_SIZE })
      .then(result => {
        if (!active) return;
        if (requestedPage > result.pageCount) { setPage(result.pageCount); return; }
        setData(result);
      })
      .catch(err => { if (active) setError(err.message || tx('Unable to load orders')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, search, page, refresh, retry, column.id]);
  return (
    <section className={`designer-kanban-column is-${column.id}`} aria-labelledby={`column-${column.id}`} aria-busy={loading}>
      <header className="designer-kanban-heading">
        <div><h2 id={`column-${column.id}`}>{tx(column.title)}</h2><p>{tx(column.description)}</p></div>
        <span className="designer-kanban-count" aria-label={tx('Orders')}>{data.total}</span>
      </header>
      <div className="designer-kanban-cards">
        {error ? <div className="designer-alert is-error" role="alert">{error}<button type="button" className="secondary-button" onClick={() => setRetry(n => n + 1)}>{tx('Retry')}</button></div>
          : loading ? <PageSkeleton variant="table" compact title={tx('Loading assigned orders')} />
          : data.orders.length === 0 ? <p className="designer-kanban-empty">{tx(search ? 'No matching orders.' : 'No orders in this column.')}</p>
          : data.orders.map(order => (
            <article className="designer-kanban-card" key={order._id}>
              <div className="designer-kanban-card-top"><strong>{order.trackingId || order.submissionId}</strong><span className="designer-status" data-status={order.status}>{tx(order.status.replaceAll('_', ' '))}</span></div>
              <h3>{order.clientName}</h3><p>{order.formTitle}</p>
              <div className="designer-kanban-card-bottom"><small>{tx('Updated')} {new Date(order.updatedAt).toLocaleDateString()}</small>
                <button type="button" onClick={() => onOpenOrder(order._id)} aria-label={`${tx('Open')} ${order.trackingId || order.submissionId}`}>{tx('Open')}<ArrowRight size={15} /></button>
              </div>
            </article>
          ))}
      </div>
      {data.pageCount > 1 && <nav className="designer-kanban-pagination" aria-label={`${tx(column.title)} ${tx('Pages')}`}>
        <button type="button" className="secondary-button" aria-label={tx('Previous page')} disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
        <span>{tx('Page')} {page} / {data.pageCount}</span>
        <button type="button" className="secondary-button" aria-label={tx('Next page')} disabled={loading || page >= data.pageCount} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
      </nav>}
    </section>
  );
}

export default function DesignerQueue({ token, onOpenOrder }) {
  const tx = useInterfaceText();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const reload = () => setRefresh(n => n + 1);
    window.addEventListener('tinzel:draft-submitted', reload);
    window.addEventListener('focus', reload);
    return () => { window.removeEventListener('tinzel:draft-submitted', reload); window.removeEventListener('focus', reload); };
  }, []);
  return (
    <section className="designer-page">
      <div className="designer-page-title"><div><h1>{tx('Design orders')}</h1><p>{tx('Open an order to work with its files, drafts and revision history.')}</p></div>
        <ActionButton type="button" className="secondary-button" onClick={() => setRefresh(n => n + 1)}><RefreshCw size={16} />{tx('Refresh')}</ActionButton>
      </div>
      <div className="designer-kanban-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label={tx('Search orders')} placeholder={tx('Search order ID or client...')} value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div className="designer-kanban">{COLUMNS.map(column => <BoardColumn key={column.id} column={column} token={token} search={debouncedSearch} refresh={refresh} onOpenOrder={onOpenOrder} />)}</div>
    </section>
  );
}
