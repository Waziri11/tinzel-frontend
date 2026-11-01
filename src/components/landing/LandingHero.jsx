import React from 'react';
import { ArrowRight, BookOpen, Camera, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import '../../theme/customer.css';
export default function LandingHero({ onSelectNewOrder, onOpenFollowUp }) {
  const { lang, t } = useLanguage();
  const sw = lang === 'sw';
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
            <button className="landing-track" onClick={onOpenFollowUp}>
              {sw ? 'Tayari una oda? Ifuatilie' : 'Already have an order? Track it'}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <div className="landing-art">
          <div className="landing-arch">
            <img
              src="/brand/magazine-cover-sample.jpg"
              alt={sw ? 'Mfano wa jalada la jarida la Tinzel' : 'Sample Tinzel magazine cover'}
              width="480"
              height="679"
              fetchPriority="high"
            />
          </div>
          <span>{sw ? 'Hadithi yako. Imeundwa kukumbukwa.' : 'Your story. Designed to be remembered.'}</span>
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
