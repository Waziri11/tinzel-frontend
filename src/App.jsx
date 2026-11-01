import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import { Drawer } from 'antd';
import LandingHero from './components/landing/LandingHero';
import TinzelLogo from './components/common/TinzelLogo';
import BrandLoading from './components/common/BrandLoading';
import LanguageSelect from './components/landing/LanguageSelect';
import LanguageSwitcher from './components/common/LanguageSwitcher';
import { PageBoundary, Button, EmptyState } from './components/common/UI';
import { useLanguage } from './i18n/LanguageContext';
import { navigate } from './navigation/location';
import './theme/shell.css';
const MagazineShowcase=lazy(()=>import('./components/client/MagazineShowcase'));
const ClientTrackingPortal=lazy(()=>import('./components/client/ClientTrackingPortal'));
const StaffWorkspace=lazy(()=>import('./components/common/StaffWorkspace'));
export default function App(){
 const {lang,t}=useLanguage(); const [path,setPath]=useState(window.location.pathname);const [menu,setMenu]=useState(false);const menuButton=useRef(null);
 const sw=lang==='sw';
 const staff=/^\/staff(?:\/|$)/.test(path), catalogue=/^\/(catalogue|showcase)(?:\/[^/]+)?\/?$/.test(path), tracking=/^\/track\/?$/.test(path), home=path==='/';
 useEffect(()=>{const update=()=>{setPath(window.location.pathname);setMenu(false);};window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update);},[]);
 useEffect(()=>{document.title=`Tinzel — ${staff?(sw?'Ofisi':'Workspace'):catalogue?(sw?'Matoleo':'Editions'):tracking?(sw?'Fuatilia oda':'Track your order'):(sw?'Hadithi yako, kwenye karatasi':'Your story, in print')}`;},[path,lang]);
 if(!lang)return <main className="language-page"><LanguageSelect/></main>;
 const nav=<><a href="/catalogue" aria-current={catalogue?'page':undefined} onClick={e=>{e.preventDefault();navigate('/catalogue');}}>{sw?'Matoleo':'Editions'}</a><a href="/track" aria-current={tracking?'page':undefined} onClick={e=>{e.preventDefault();navigate('/track');}}>{t('nav.followUp')}</a><a href="/staff" onClick={e=>{e.preventDefault();navigate('/staff');}}>{t('nav.staffLogin')}</a></>;
 return <div className="app-shell"><a className="ui-skip" href="#main-content">{sw?'Ruka hadi maudhui':'Skip to content'}</a>
 {!staff&&<header className="public-header"><div className="public-header-inner"><a href="/" aria-label="Tinzel Home" onClick={e=>{e.preventDefault();navigate('/');}}><TinzelLogo variant="full" height={40}/></a><nav className="public-nav" aria-label={sw?'Urambazaji mkuu':'Main navigation'}>{nav}</nav><div className="public-header-tools"><LanguageSwitcher/><button ref={menuButton} className="ui-button public-menu" aria-label={sw?'Fungua menyu':'Open menu'} aria-expanded={menu} onClick={()=>setMenu(true)}><Menu size={20}/></button></div></div></header>}
 <Drawer title={sw?'Menyu':'Menu'} placement="right" open={menu} onClose={()=>setMenu(false)} afterOpenChange={open=>{if(!open)menuButton.current?.focus();}} size="min(340px,90vw)"><nav className="public-mobile-nav">{nav}</nav></Drawer>
 <main id="main-content" tabIndex={-1} className={staff?'workspace-root':'public-main'}><PageBoundary key={path}><Suspense fallback={<BrandLoading title={sw?'Inafunguka…':'Opening Tinzel…'}/>}>
 {home&&<LandingHero onSelectNewOrder={()=>navigate('/catalogue')} onOpenFollowUp={()=>navigate('/track')} onOpenLogin={()=>navigate('/staff')}/>}
 {catalogue&&<MagazineShowcase onBackToHome={()=>navigate('/')} onNavigateToTracking={()=>navigate('/track')}/>}
 {tracking&&<div className="tracking-page"><ClientTrackingPortal/></div>}
 {staff&&<StaffWorkspace onExitToHome={()=>navigate('/')}/>}
 {!home&&!catalogue&&!tracking&&!staff&&<div className="ui-page"><EmptyState title={sw?'Ukurasa haupatikani':'Page not found'} description={sw?'Kiungo hiki hakipatikani. Unaweza kurudi mwanzo au kufuatilia oda yako.':'This link is unavailable. Return home or track your existing order.'}><Button variant="primary" onClick={()=>navigate('/')}>{sw?'Rudi mwanzo':'Return home'}</Button></EmptyState></div>}
 </Suspense></PageBoundary></main>
 {!staff&&<footer className="public-footer"><TinzelLogo variant="wordmark" height={24}/><span>{sw?'Hadithi zako. Kumbukumbu za kudumu.':'Your stories. Lasting memories.'}</span><a href="/track" onClick={e=>{e.preventDefault();navigate('/track');}}>{sw?'Fuatilia oda':'Track an order'}</a></footer>}
 </div>;
}
