import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ArrowRight, BookOpen, Camera, CheckCircle2 } from 'lucide-react';
import { localized, useLanguage } from '../../i18n/LanguageContext';
import '../../theme/customer.css';
export default function LandingHero({ onSelectNewOrder, onOpenFollowUp }) {
  const { lang, t } = useLanguage();
  const sw = lang === 'sw';
  const [covers, setCovers] = useState([]);
  const [{ active: activeCover, previous: previousCover }, setCoverPosition] = useState({
    active: 0, previous: null,
  });
  const [isPhone, setIsPhone] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 600px)');
    const update = () => setIsPhone(phone.matches);
    phone.addEventListener('change', update);
    return () => phone.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let cancelled = false;
    api.public.getForms().then(async (data) => {
      const seen = new Set();
      const editions = (data.forms || []).filter((form) => {
        if (!form.coverImageUrl || seen.has(form.coverImageUrl)) return false;
        seen.add(form.coverImageUrl);
        return true;
      });
      const loaded = await Promise.all(editions.map((form) => new Promise((resolve) => {
        const src = form.coverImageUrl.includes('/api/public/covers/')
          ? `${form.coverImageUrl.split('?')[0]}?w=480` : form.coverImageUrl;
        const image = new Image();
        image.onload = () => resolve({ ...form, src });
        image.onerror = () => resolve(null);
        image.src = src;
      })));
      if (!cancelled) setCovers(loaded.filter(Boolean));
    }).catch(() => {}); // Keep the bundled sample if the catalogue is unavailable.
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (covers.length < 2 || reducedMotion || isPhone) return;
    const timer = window.setInterval(() => {
      setCoverPosition(({ active }) => ({
        active: (active + 1) % covers.length, previous: active,
      }));
    }, 4500);
    return () => window.clearInterval(timer);
  }, [covers.length, reducedMotion, isPhone]);
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>
            {sw ? (
              <>
                Hadithi zako.
                <br />
                <em>Zinastahili karatasi.</em>
              </>
            ) : (
              <>
                Some stories
                <br />
                <em>deserve paper.</em>
              </>
            )}
          </h1>
          <p>
            {sw
              ? 'Geuza picha na hadithi zako kuwa jarida la kipekee. Hifadhi sherehe, upendo na matukio muhimu kwa miaka ijayo.'
              : 'Turn your photographs and stories into a magazine that is entirely yours. A thoughtful way to keep the moments that matter.'}
          </p>
          <div className="landing-actions">
            <button className="ui-button is-primary" onClick={onSelectNewOrder}>
              {t('landing.newOrder')}
              <ArrowRight size={17} />
            </button>
            <button className="ui-button landing-track" onClick={onOpenFollowUp}>
              {sw ? 'Tayari una oda? Ifuatilie' : 'Already have an order? Track it'}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
        <div className="landing-art">
          <div className="landing-covers">
            {covers.length ? covers.map((cover, index) => (
              <img
                key={cover.src}
                className={index === activeCover ? 'is-active' : index === previousCover ? 'is-outgoing' : ''}
                src={cover.src}
                alt={localized(cover, 'title', lang)}
                aria-hidden={index !== activeCover}
                width="480"
                height="679"
              />
            )) : (
              <img className="is-active" src="/brand/magazine-cover-sample.jpg"
                alt={sw ? 'Mfano wa jalada la jarida la Tinzel' : 'Sample Tinzel magazine cover'}
                width="480" height="679" fetchPriority="high" />
            )}
          </div>

        </div>
      </section>
      <section className="landing-process" aria-label={sw ? 'Inavyofanya kazi' : 'How it works'}>
        {[
          [
            BookOpen,
            sw ? 'Chagua toleo' : 'Choose your edition',
            sw ? 'Anza na jarida linalokufaa.' : 'Find the right beginning for your story.',
          ],
          [
            Camera,
            sw ? 'Shiriki hadithi yako' : 'Make it yours',
            sw ? 'Ongeza maneno na picha zako.' : 'Add your words and favourite photographs.',
          ],
          [
            CheckCircle2,
            sw ? 'Kagua kabla ya uchapishaji' : 'Review before print',
            sw ? 'Thibitisha jarida lote kabla ya uchapishaji.' : 'Approve your complete magazine before printing.',
          ],
        ].map(([Icon, title, description], i) => (
          <article key={i}>
            <span className="process-number">0{i + 1}</span>
            <div>
              <Icon size={20} aria-hidden="true" />
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
