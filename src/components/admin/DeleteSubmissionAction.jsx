import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { orderSenderName } from '../../utils/orderDisplay';
import { StateError } from '../common/StatePanel';

export default function DeleteSubmissionAction({ token, order, onDeleted, onBusyChange }) {
  const { lang } = useLanguage();
  const t = (en, sw) => lang === 'sw' ? sw : en;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const name = orderSenderName(order, t('Unnamed customer', 'Mteja asiye na jina'));

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
    onBusyChange(false);
  };
  const remove = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await api.admin.deleteSubmission(token, order._id);
      setOpen(false);
      onBusyChange(false);
      onDeleted(order._id);
    } catch (failure) {
      setError(failure);
    } finally { setPending(false); }
  };

  return <>
    <Button danger icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => { setOpen(true); onBusyChange(true); }}>
      {t('Delete submission', 'Futa wasilisho')}
    </Button>
    <Modal open={open} title={t('Permanently delete submission?', 'Futa wasilisho kabisa?')}
      onCancel={close} onOk={remove} confirmLoading={pending}
      okText={t('Delete permanently', 'Futa kabisa')} cancelText={t('Cancel', 'Ghairi')}
      okButtonProps={{ danger: true }} cancelButtonProps={{ disabled: pending }}
      closable={!pending} keyboard={!pending} maskClosable={false}>
      <p><strong>{name}</strong><br />{order.formTitle || order.formId?.title}</p>
      <p>{t('This permanently deletes the submission, its answers, photos, magazine PDFs, feedback and related history. This cannot be undone.', 'Hatua hii itafuta kabisa wasilisho, majibu, picha, PDF za jarida, maoni na historia inayohusiana. Haiwezi kutenguliwa.')}</p>
      <p>{t('It will disappear from staff pages and customer tracking immediately. File cleanup normally starts within six minutes and waits for active uploads or processing to finish.', 'Litaondolewa mara moja kwenye kurasa za wafanyakazi na ufuatiliaji wa mteja. Usafishaji wa faili kwa kawaida huanza ndani ya dakika sita na husubiri upakiaji au uchakataji unaoendelea ukamilike.')}</p>
      {error && <StateError compact error={error} title={t('Deletion could not be confirmed', 'Ufutaji haukuweza kuthibitishwa')} />}
    </Modal>
  </>;
}
