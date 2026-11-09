import React, { useRef, useState } from 'react';
import { Dropdown } from 'antd';
import { Bell, Ellipsis, LogOut, RefreshCw, ShieldOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { orderSenderName } from '../../utils/orderDisplay';
import OrderCountdownBadge from '../common/OrderCountdownBadge';
import ClientNotifications from './ClientNotifications';
import './clientOrderSummary.css';

const STAGES = ['submission', 'payment', 'design', 'review', 'printing', 'delivery'];

export default function ClientOrderSummary({ order, journey, description, loading, busy, lastLoaded, onRefresh, onLogout, token, onUnauthorized }) {
  const { t, lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuTrigger = useRef(null);
  const menuAction = ({ key }) => {
    setMenuOpen(false);
    if (key === 'notifications') setNotificationsOpen(true);
    else if (key === 'refresh') onRefresh();
    else if (key === 'forget' || key === 'logout') onLogout(key === 'forget');
  };
  return <>
    <section className="client-order-summary" aria-labelledby="customer-order-title" aria-busy={loading}>
      <header className="client-order-summary__heading">
        <div>
          <h1 id="customer-order-title" className="customer-order-name">{orderSenderName(order, ui('Your magazine', 'Jarida lako'))}</h1>
          {order.formTitle && <p className="client-order-edition">{order.formTitle}</p>}
        </div>
        <Dropdown trigger={['click']} placement="bottomRight" autoFocus open={menuOpen} onOpenChange={setMenuOpen}
          classNames={{ root: 'client-order-menu' }}
          menu={{ onClick: menuAction, items: [
            { key: 'notifications', icon: <Bell size={17} aria-hidden="true" />, label: ui('Notifications', 'Taarifa') },
            { key: 'refresh', icon: <RefreshCw size={17} aria-hidden="true" />, label: ui('Refresh order', 'Sasisha oda'), disabled: loading || busy },
            { type: 'divider' },
            { key: 'forget', icon: <ShieldOff size={17} aria-hidden="true" />, label: ui('Stop remembering this order', 'Usikumbuke oda hii tena'), disabled: busy },
            { key: 'logout', icon: <LogOut size={17} aria-hidden="true" />, label: t('track.signOut'), disabled: busy },
            ...(lastLoaded ? [{ type: 'divider' }, { key: 'checked', disabled: true, label: <small>{ui('Last checked: ', 'Ilihakikiwa mwisho: ')}{new Date(lastLoaded).toLocaleTimeString(lang === 'sw' ? 'sw-TZ' : 'en-TZ')}</small> }] : []),
          ] }}>
          <button ref={menuTrigger} type="button" className="client-order-menu-trigger" aria-label={ui('Order options', 'Chaguo za oda')} aria-haspopup="menu" aria-expanded={menuOpen}>
            <Ellipsis size={23} aria-hidden="true" />
          </button>
        </Dropdown>
      </header>
      <div className="client-order-meta">
        <span className="client-order-status">{t(journey.statusKey)}</span>
        <OrderCountdownBadge order={order} />
      </div>
      <p className="customer-status-description">{order.status === 'on_hold' ? order.holdReason || description : order.status === 'client_review'
        ? ui('Check your magazine below, then approve it or request changes.', 'Kagua jarida hapa chini, kisha liidhinishe au omba marekebisho.')
        : description}</p>
      <div className="client-order-progress">
        <div className="client-order-progress__heading">
          <span>{ui('Order progress', 'Maendeleo ya oda')}</span>
          <strong>{journey.complete ? t(journey.statusKey) : t(`track.stage.${STAGES[journey.stage]}`)}</strong>
        </div>
        <ol aria-label={t('track.progress')}>
          {STAGES.map((stage, index) => {
            const complete = journey.complete || index < journey.stage;
            const current = !journey.complete && index === journey.stage;
            return <li key={stage} className={complete ? 'is-complete' : current ? 'is-current' : undefined} aria-current={current ? 'step' : undefined}>
              <span className="client-order-progress__bar" aria-hidden="true" />
              <span className="client-order-progress__label">{t(`track.stage.${stage}`)}</span>
            </li>;
          })}
        </ol>
      </div>
    </section>
    <ClientNotifications open={notificationsOpen} onClose={() => setNotificationsOpen(false)} onAfterClose={() => menuTrigger.current?.focus()} token={token} onUnauthorized={onUnauthorized} />
  </>;
}
