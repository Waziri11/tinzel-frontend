import React, { useEffect, useState } from "react";
import { proofApi } from "../../services/api";
import { navigate } from "../../navigation/location";
import { useLanguage } from "../../i18n/LanguageContext";
import "./managerMagazineReview.css";
import StatePanel, { StateError } from "../common/StatePanel";
export const magazineReviewPath = (id, version) =>
  `/staff/review/${encodeURIComponent(id)}/versions/${version}`;
function DraftCard({ token, order, draft }) {
  const { lang } = useLanguage(),
    t = (en, sw) => (lang === "sw" ? sw : en);
  const [cover, setCover] = useState("");
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let url = "";
    setCover("");
    setError(null);
    proofApi(token, order._id, draft.versionNumber)
      .page(1, controller.signal)
      .then((blob) => {
        if (!controller.signal.aborted) {
          url = URL.createObjectURL(blob);
          setCover(url);
        }
      })
      .catch(error => { if (!controller.signal.aborted) setError(error); });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [token, order._id, draft.versionNumber, attempt]);
  const current = draft.versionNumber === order.currentDraftVersion;
  return (
    <article className="magazine-draft-card">
      <div className="magazine-draft-cover">
        {cover ? (
          <img
            src={cover}
            alt={`${t("Magazine cover, version", "Jalada la jarida, toleo")} ${draft.versionNumber}`}
          />
        ) : (
          error ? <StateError compact error={error} onRetry={() => setAttempt(n => n + 1)} title={t('Cover preview unavailable', 'Hakikisho la jalada halipatikani')} /> : <StatePanel compact kind="loading" title={t('Loading cover…', 'Tunapakia jalada…')} />
        )}
      </div>
      <div className="magazine-draft-summary">
        <h3>
          {t("Version", "Toleo")} {draft.versionNumber}
        </h3>
        <p>
          {current
            ? t("Current version", "Toleo la sasa")
            : t("Previous version", "Toleo la awali")}
        </p>
        {draft.designerNotes && <p>{draft.designerNotes}</p>}
        <button
          type="button"
          className="primary-button"
          aria-label={`${t("Review magazine version", "Kagua toleo la jarida")} ${draft.versionNumber}`}
          onClick={() =>
            navigate(magazineReviewPath(order._id, draft.versionNumber))
          }
        >
          {current && order.status === "draft_manager_review"
            ? t("Review magazine", "Kagua jarida")
            : t("View magazine", "Angalia jarida")}
        </button>
      </div>
    </article>
  );
}
export default function MagazineDraftCards({ token, order }) {
  const { lang } = useLanguage();
  if (!order.draftVersions?.length)
    return <StatePanel compact kind="empty" title={lang === "sw" ? "Bado hakuna rasimu" : "No drafts yet"} description={lang === "sw" ? "Jarida litaonekana hapa msanifu atakapowasilisha rasimu." : "The magazine will appear here when the designer submits a draft."} />;
  return (
    <div className="magazine-draft-cards">
      {[...order.draftVersions].reverse().map((draft) => (
        <DraftCard
          key={draft.versionNumber}
          token={token}
          order={order}
          draft={draft}
        />
      ))}
    </div>
  );
}
