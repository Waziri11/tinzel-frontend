import React, {useState,useEffect} from 'react';
import {api} from '../../services/api';
import {useLanguage} from '../../i18n/LanguageContext';
const bytes=value=>value==null?null:`${(value/1024/1024).toLocaleString(undefined,{maximumFractionDigits:1})} MB`;
export default function SystemPage({token,user}) {
  const {lang}=useLanguage(),t=(en,sw)=>lang==='sw'?sw:en;
  const [sections,setSections]=useState({}),[loading,setLoading]=useState({}),[errors,setErrors]=useState({});
  const refresh=()=>{for(const name of ['runtime','storage','messaging']){setLoading(x=>({...x,[name]:true}));setErrors(x=>({...x,[name]:false}));api.system.section(token,name).then(data=>setSections(x=>({...x,[name]:data}))).catch(()=>setErrors(x=>({...x,[name]:true}))).finally(()=>setLoading(x=>({...x,[name]:false})));}};
  useEffect(()=>{refresh();},[token]);
  const no=t('Unavailable','Haipatikani'),row=(label,value)=><div style={{display:'flex',justifyContent:'space-between',gap:16,padding:'10px 0',borderBottom:'1px solid var(--border-color)'}}><span>{label}</span><strong>{value??no}</strong></div>;
  const configured=x=>x?t('Configured','Imesanidiwa'):t('Not configured','Haijasanidiwa');
  return <section><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:20}}><h1 className="ui-title">{t('System','Mfumo')}</h1><button className="ui-button" onClick={refresh} disabled={Object.values(loading).some(Boolean)}>{t('Refresh','Onyesha upya')}</button></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:20}}>
      {['runtime','storage','messaging'].map(name=>{const data=sections[name];return <article key={name} style={{padding:20,border:'1px solid var(--border-color)',background:'white',borderRadius:10,minWidth:0}} aria-busy={!!loading[name]}>
        <h2>{name==='runtime'?t('Application','Programu'):name==='storage'?t('Storage','Hifadhi'):t('Messaging services','Huduma za ujumbe')}</h2>
        {loading[name]&&<p role="status">{t('Loading…','Inapakia…')}</p>}{errors[name]&&<p role="alert">{t('Measurement unavailable. Try refreshing.','Takwimu hazipatikani. Jaribu tena.')}</p>}
        {data&&<>{name==='runtime'?<>{row(t('Application memory used','Kumbukumbu inayotumiwa na programu'),bytes(data.processMemoryBytes))}{row(t('JavaScript heap used / allocated','Heap ya JavaScript iliyotumika / iliyotengwa'),`${bytes(data.heapUsedBytes)} / ${bytes(data.heapAllocatedBytes)}`)}{row(t('Hosting RAM available','RAM ya seva iliyopo'),bytes(data.hostingRamAvailableBytes))}{row(t('Instance uptime','Muda wa programu kufanya kazi'),`${Math.floor(data.uptimeSeconds/60)} min`)}{row(t('Database','Hifadhidata'),data.database==='connected'?t('Connected','Imeunganishwa'):t('Disconnected','Haijaunganishwa'))}</>:name==='storage'?<>{row(t('Database data','Data ya hifadhidata'),bytes(data.databaseDataBytes))}{row(t('Allocated database storage','Hifadhi iliyotengwa'),bytes(data.databaseStorageBytes))}{row(t('Database indexes','Faharasa za hifadhidata'),bytes(data.indexBytes))}{row(t('Stored files (GridFS)','Faili zilizohifadhiwa (GridFS)'),bytes(data.fileBytes))}{row(t('External storage usage','Matumizi ya hifadhi ya nje'),bytes(data.externalStorageBytes))}{row(t('Storage quota','Kikomo cha hifadhi'),bytes(data.quotaBytes))}</>:<>{row(t('SMS credits remaining','SMS zilizobaki'),data.sms.remaining)}{row(t('SMS gateway','Huduma ya SMS'),!data.sms.configured?configured(false):data.sms.connected?t('Connected','Imeunganishwa'):t('Unavailable','Haipatikani'))}{row(t('Email','Barua pepe'),configured(data.email.configured))}{row('WhatsApp',configured(data.whatsapp.configured))}</>}
        <small style={{display:'block',marginTop:16}}>{t('Measured','Imepimwa')}: {new Date(data.measuredAt).toLocaleString(lang==='sw'?'sw-TZ':'en-GB')}</small></>}
      </article>;})}
    </div>
    <p style={{color:'var(--text-muted)',fontSize:12,marginTop:16}}>{t('Application memory describes this running instance. Provider quotas and external storage are shown only when available. File totals are part of database storage, not additional usage.','Kumbukumbu ni za programu hii inayofanya kazi. Vikomo vya mtoa huduma na hifadhi ya nje huonyeshwa vinapopatikana. Jumla ya faili ni sehemu ya hifadhi ya hifadhidata.')}</p>
  </section>;
}
