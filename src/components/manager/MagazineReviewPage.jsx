import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { navigate } from "../../navigation/location";
import { useLanguage } from "../../i18n/LanguageContext";
import PageSkeleton from "../common/PageSkeleton";
import ManagerMagazineReview from "./ManagerMagazineReview";
import { magazineReviewPath } from "./MagazineDraftCards";
export default function MagazineReviewPage({ token, orderId, version }) {
  const { lang } = useLanguage(),
    t = (en, sw) => (lang === "sw" ? sw : en);
  const [order, setOrder] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const guard = useRef(null);
  const registerGuard = useCallback((value) => {
    guard.current = value;
  }, []);
  useEffect(() => {
    let active = true;
    api.manager
      .getOrder(token, orderId)
      .then((data) => {
        if (active) setOrder(data.order);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token, orderId]);
  const reload = async () => {
    if (guard.current && !guard.current()) return;
    try {
      const data = await api.manager.getOrder(token, orderId);
      setOrder(data.order);
      guard.current = null;
      if (data.order.currentDraftVersion !== version) {
        // Leaving was already confirmed above; avoid asking twice for the same notes.
        window.history.pushState({}, '', magazineReviewPath(orderId, data.order.currentDraftVersion));
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else setRevision((n) => n + 1);
    } catch (e) {
      setError(e.message);
    }
  };
  const back = () =>
    navigate(
      `/staff/design-phase?orderId=${encodeURIComponent(orderId)}&tab=drafts`,
    );
  if (!order)
    return error ? (
      <section className="magazine-review-page">
        <p role="alert">{error}</p>
        <button onClick={back}>{t("Back to order", "Rudi kwenye oda")}</button>
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
          <p>
            {[order.trackingId, order.clientName].filter(Boolean).join(' · ')}
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
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
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
            const data = await api.manager.getOrder(token, orderId);
            setOrder(data.order);
            setRevision((n) => n + 1);
          }}
        />
      ) : (
        <p role="alert">
          {t("Magazine version not found.", "Toleo la jarida halipatikani.")}
        </p>
      )}
    </section>
  );
}
