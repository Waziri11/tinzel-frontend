import ExpressOrderBadge from '../common/ExpressOrderBadge';
import { orderSenderName } from '../../utils/orderDisplay';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { navigate } from "../../navigation/location";
import { useLanguage } from "../../i18n/LanguageContext";
import PageSkeleton from "../common/PageSkeleton";
import StatePanel, { StateError } from "../common/StatePanel";
import ManagerMagazineReview from "./ManagerMagazineReview";
import { magazineReviewPath } from "./MagazineDraftCards";
export default function MagazineReviewPage({ token, orderId, version }) {
  const { lang } = useLanguage(),
    t = (en, sw) => (lang === "sw" ? sw : en);
  const [order, setOrder] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const guard = useRef(null);
  const registerGuard = useCallback((value) => {
    guard.current = value;
  }, []);
  useEffect(() => {
    let active = true;
    setError(null);
    api.manager
      .getOrder(token, orderId)
      .then((data) => {
        if (active) setOrder(data.order);
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [token, orderId, attempt]);
  const reload = async () => {
    if (guard.current && !(await guard.current())) return;
    setRefreshing(true);
    setError(null);
    try {
      const data = await api.manager.getOrder(token, orderId);
      setOrder(data.order);
      guard.current = null;
      if (data.order.currentDraftVersion !== version) {
        // The combined notes/comment guard above has already approved this change.
        navigate(magazineReviewPath(orderId, data.order.currentDraftVersion), { confirmed: true });
      } else setRevision((n) => n + 1);
    } catch (e) {
      setError(e);
    } finally { setRefreshing(false); }
  };
  const back = () =>
    navigate(
      `/staff/design-phase?orderId=${encodeURIComponent(orderId)}&tab=drafts`,
    );
  if (!order)
    return error ? (
      <section className="magazine-review-page">
        <StateError error={error} onRetry={() => setAttempt(n => n + 1)} title={t('The magazine could not be opened', 'Jarida halikuweza kufunguliwa')}>
          <button className="secondary-button" onClick={back}>{t("Back to order", "Rudi kwenye oda")}</button>
        </StateError>
      </section>
    ) : (
      <PageSkeleton variant="detail" />
    );
  const exists = order.draftVersions?.some((d) => d.versionNumber === version);
  return (
    <section className="magazine-review-page">
      <header className="magazine-review-heading">
        <div>
          <button type="button" className="secondary-button" onClick={back}>
            {t("Back to order", "Rudi kwenye oda")}
          </button>
          <h1>{t("Magazine review", "Ukaguzi wa jarida")}</h1>
          <ExpressOrderBadge order={order} />
          <p>
            {orderSenderName(order, t('Unnamed customer', 'Mteja asiye na jina'))}
          </p>
        </div>
        <label>
          {t("Version", "Toleo")}
          <select
            aria-label={t("Magazine version", "Toleo la jarida")}
            value={version}
            onChange={(e) =>
              navigate(magazineReviewPath(orderId, Number(e.target.value)))
            }
          >
            {[...(order.draftVersions || [])].reverse().map((d) => (
              <option value={d.versionNumber} key={d.versionNumber}>
                {t("Version", "Toleo")} {d.versionNumber}
              </option>
            ))}
          </select>
        </label>
      </header>
      {notice && <StatePanel compact kind="success" title={notice} />}
      {refreshing && <p role="status">{t('Checking the current version…', 'Tunakagua toleo la sasa…')}</p>}
      {error && <StateError compact error={error} onRetry={reload} title={t('The latest review could not be loaded', 'Ukaguzi wa sasa haukuweza kupakiwa')} />}
      {exists && version !== order.currentDraftVersion && <StatePanel compact kind="info" title={t('You are viewing an earlier version', 'Unaangalia toleo la awali')} description={t('This version is read only. Open the current version to check the latest review.', 'Toleo hili ni la kusoma tu. Fungua toleo la sasa kukagua mabadiliko mapya.')}>
        <button className="secondary-button" onClick={() => navigate(magazineReviewPath(orderId, order.currentDraftVersion))}>{t('Open current version', 'Fungua toleo la sasa')}</button>
      </StatePanel>}
      {exists ? (
        <ManagerMagazineReview
          key={`${orderId}:${version}:${revision}`}
          token={token}
          order={order}
          version={version}
          registerGuard={registerGuard}
          onReload={reload}
          onReviewed={async (message) => {
            guard.current = null;
            setNotice(message);
            try {
              const data = await api.manager.getOrder(token, orderId);
              setOrder(data.order);
              setRevision((n) => n + 1);
            } catch (error) { setError(error); }
          }}
        />
      ) : (
        <StatePanel kind="warning" title={t("Magazine version not found", "Toleo la jarida halipatikani")}
          description={t('Choose an available version or return to the order.', 'Chagua toleo linalopatikana au rudi kwenye oda.')}>
          {order.currentDraftVersion > 0 && <button className="primary-button" onClick={() => navigate(magazineReviewPath(orderId, order.currentDraftVersion))}>{t('Open current version', 'Fungua toleo la sasa')}</button>}
          <button className="secondary-button" onClick={back}>{t('Back to order', 'Rudi kwenye oda')}</button>
        </StatePanel>
      )}
    </section>
  );
}
