import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal } from 'antd';
import { useLanguage } from '../../i18n/LanguageContext';
import TinzelLogo from './TinzelLogo';
import './states.css';

const ConfirmContext = createContext(null);
export function ConfirmProvider({ children }) {
  const { lang } = useLanguage();
  const [request, setRequest] = useState(null);
  const queue = useRef([]);
  const active = useRef(null);
  const closing = useRef(false);
  const showNext = useCallback(() => {
    if (active.current || closing.current || !queue.current.length) return;
    active.current = queue.current.shift();
    setRequest(active.current);
  }, []);
  const confirm = useCallback(options => new Promise(resolve => {
    queue.current.push({ ...options, resolve });
    showNext();
  }), [showNext]);
  const finish = answer => {
    if (!active.current) return;
    closing.current = true;
    active.current?.resolve(answer);
    active.current = null;
    setRequest(null);
  };
  useEffect(() => () => {
    active.current?.resolve(false);
    queue.current.forEach(item => item.resolve(false));
    active.current = null;
    queue.current = [];
  }, []);
  return <ConfirmContext.Provider value={confirm}>{children}
    <Modal open={!!request} className="tinzel-confirm" zIndex={12000} title={<span className="tinzel-confirm__title"><TinzelLogo variant="icon" height={28} />{request?.title || (lang === 'sw' ? 'Thibitisha hatua' : 'Confirm this action')}</span>}
      onCancel={() => finish(false)} onOk={() => finish(true)}
      afterClose={() => { closing.current = false; showNext(); }}
      okText={request?.confirmLabel || (lang === 'sw' ? 'Endelea' : 'Continue')}
      cancelText={request?.cancelLabel || (lang === 'sw' ? 'Ghairi' : 'Cancel')}
      okButtonProps={{ danger: !!request?.danger }} maskClosable={false} focusTriggerAfterClose>
      <p>{request?.description}</p>
    </Modal>
  </ConfirmContext.Provider>;
}
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm requires ConfirmProvider');
  return confirm;
}
