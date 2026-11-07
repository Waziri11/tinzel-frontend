import React, { useEffect, useId, useState } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { orderSenderName } from '../../utils/orderDisplay';

export default function OrderNamePicker({ value, onChange, disabled }) {
  const { lang } = useLanguage();
  const selectId = useId();
  const sw = lang === 'sw';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ orders: [], pageCount: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api.manager.getOrders('cookie', { search: search.trim(), page, limit: 20, scope: 'all' })
        .then(result => { if (active) { setData(result); setError(''); } })
        .catch(() => { if (active) setError(sw ? 'Imeshindikana kupakia oda.' : 'Unable to load orders.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, page, sw]);
  return <div style={{ display: 'grid', gap: 8 }}>
    <label>{sw ? 'Tafuta kwa jina la mteja' : 'Search by client name'}
      <input type="search" value={search} disabled={disabled} onChange={event => { setSearch(event.target.value); setPage(1); onChange(null); }} />
    </label>
    <label htmlFor={selectId}>{sw ? 'Chagua oda' : 'Select an order'}</label>
      <select id={selectId} value={value?._id || ''} disabled={disabled || loading} onChange={event => onChange(data.orders.find(order => order._id === event.target.value) || null)}>
        <option value="">{loading ? (sw ? 'Inapakia…' : 'Loading…') : (sw ? 'Chagua oda' : 'Select an order')}</option>
        {data.orders.map(order => <option key={order._id} value={order._id}>
          {[orderSenderName(order, sw ? 'Mteja asiye na jina' : 'Unnamed customer'), order.formTitle,
            order.createdAt && new Date(order.createdAt).toLocaleString(sw ? 'sw-TZ' : 'en-TZ')].filter(Boolean).join(' · ')}
        </option>)}
      </select>
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !data.orders.length && <p>{sw ? 'Hakuna oda inayolingana.' : 'No matching orders.'}</p>}
    {data.pageCount > 1 && <div>
      <button disabled={disabled || loading || page === 1} onClick={() => { setPage(page - 1); onChange(null); }}>{sw ? 'Nyuma' : 'Previous'}</button>
      <span> {page} / {data.pageCount} </span>
      <button disabled={disabled || loading || page >= data.pageCount} onClick={() => { setPage(page + 1); onChange(null); }}>{sw ? 'Mbele' : 'Next'}</button>
    </div>}
  </div>;
}
