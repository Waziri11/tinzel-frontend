import ExpressOrderBadge from '../common/ExpressOrderBadge';
import { orderSenderName } from '../../utils/orderDisplay';
import { ActionButton } from '../common/SoftFlutter';
import { useInterfaceText } from '../../i18n/InterfaceText';
import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import PageSkeleton from '../common/PageSkeleton';
import StatePanel, { StateError } from '../common/StatePanel';
import { useLanguage } from '../../i18n/LanguageContext';
import '../manager/managerDashboard.css';
import './designerWorkspace.css';

const COLUMNS = [
  { id: 'new', title: 'New design orders', description: 'Assigned orders and designs awaiting review.' },
  { id: 'manager', title: 'Returned by managers', description: 'Changes requested during manager review.' },
  { id: 'client', title: 'Returned by client', description: 'Changes requested by the client.' },
  { id: 'completed', title: 'Completed', description: 'Approved designs, printing and delivered orders.' },
];
const PAGE_SIZE = 10;

function BoardColumn({ column, token, search, refresh, onOpenOrder, onClearSearch }) {
  const tx = useInterfaceText();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ orders: [], total: 0, pageCount: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
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
        setHasLoaded(true);
      })
      .catch(err => { if (active) setError(err); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, search, page, refresh, retry, column.id]);
  return (
    <section className={`manager-board-column is-mobile-active designer-kanban-column is-${column.id}`} aria-labelledby={`column-${column.id}`} aria-description={tx(column.description)} aria-busy={loading}>
      <header className="designer-kanban-heading">
        <h2 id={`column-${column.id}`}>{tx(column.title)}</h2>
        <span role="status" className="designer-kanban-count" aria-label={hasLoaded ? tx('Orders') : ui('Order count unavailable', 'Idadi ya oda haipatikani')}>{hasLoaded ? data.total : '—'}</span>
      </header>
      <div className="manager-board-column__body designer-kanban-cards">
        {error && <StateError compact error={error} onRetry={() => setRetry(n => n + 1)}>
          {hasLoaded && <p>{ui('Showing the last loaded orders. They may be out of date.', 'Tunaonyesha oda zilizopakiwa mara ya mwisho. Huenda zimebadilika.')}</p>}
        </StateError>}
        {loading && hasLoaded && <p role="status">{ui('Refreshing this column…', 'Tunapakia safu hii upya…')}</p>}
        {loading && !hasLoaded ? <PageSkeleton variant="table" compact title={tx('Loading assigned orders')} />
          : !error && hasLoaded && data.orders.length === 0 ? <StatePanel compact kind="empty"
            title={search ? ui('No matching orders', 'Hakuna oda zinazolingana') : column.id === 'completed' ? ui('No completed orders yet', 'Bado hakuna oda zilizokamilika') : column.id === 'new' ? ui('No design orders waiting', 'Hakuna oda za usanifu zinazosubiri') : ui('No corrections waiting', 'Hakuna marekebisho yanayosubiri')}
            description={search ? ui('Try a different name or clear your search.', 'Jaribu jina jingine au futa utafutaji.') : ui('Orders will appear here when they reach this stage.', 'Oda zitaonekana hapa zikifika hatua hii.')}>
            {search && <button type="button" className="secondary-button" onClick={onClearSearch}>{ui('Clear search', 'Futa utafutaji')}</button>}
          </StatePanel> : data.orders.map(order => (
            <article className="designer-kanban-card" key={order._id}>
              <button type="button" className="manager-stage-row" onClick={() => onOpenOrder(order._id)} aria-label={`${tx('Open')} ${orderSenderName(order, tx('Unnamed customer'))}`}>
                <span className="manager-stage-row__age">{tx('Updated')} {new Date(order.updatedAt).toLocaleDateString()}</span>
                <strong>{orderSenderName(order, tx('Unnamed customer'))}</strong>
                <ExpressOrderBadge order={order} />
                <span className="manager-stage-row__subtitle">{order.formTitle}</span>
                <span className="manager-stage-row__meta"><span className={`manager-status is-${order.status}`}>{tx(order.status.replaceAll('_', ' '))}</span></span>
              </button>
            </article>
          ))}
      </div>
      {data.pageCount > 1 && <nav className="manager-pagination designer-kanban-pagination" aria-label={`${tx(column.title)} ${tx('Pages')}`}>
        <button type="button" aria-label={tx('Previous page')} disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
        <span>{tx('Page')} {page} / {data.pageCount}</span>
        <button type="button" aria-label={tx('Next page')} disabled={loading || page >= data.pageCount} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
      </nav>}
    </section>
  );
}

export default function DesignerQueue({ token, onOpenOrder }) {
  const tx = useInterfaceText();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
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
      <div className="manager-search designer-kanban-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label={tx('Search orders')} placeholder={tx('Search by client name')} value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div className="designer-kanban">{COLUMNS.map(column => <BoardColumn key={column.id} column={column} token={token} search={debouncedSearch} refresh={refresh} onOpenOrder={onOpenOrder} onClearSearch={() => { setSearch(''); setDebouncedSearch(''); }} />)}</div>
    </section>
  );
}
