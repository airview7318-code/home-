/* Google Analytics 4: only starts after the visitor opts in. Never pass inquiry fields or raw URLs. */
(()=> {
  const id=window.BUJA_CONFIG?.analyticsMeasurementId||'G-PGX741RJ8F';
  if(!/^G-[A-Z0-9]+$/.test(id||'')) return;
  const consentKey='buja_ga_consent_v1';
  const pageLocation=()=>location.origin+location.pathname+location.hash;
  const start=()=>{
    if(window.__bujaAnalyticsStarted) return;
    window.__bujaAnalyticsStarted=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config',id,{
      page_location:pageLocation(),
      allow_google_signals:false,
      allow_ad_personalization_signals:false
    });
    const script=document.createElement('script');
    script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);
    document.head.appendChild(script);
  };
  window.bujaTrack=(name,params={})=>{
    if(window.__bujaAnalyticsStarted&&typeof window.gtag==='function'){
      window.gtag('event',name,params);
    }
  };
  const previous=(()=>{try{return localStorage.getItem(consentKey)}catch(e){return null}})();
  if(previous==='granted') start();
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');
    if(!link) return;
    const href=link.getAttribute('href')||'';
    let method='';
    if(/^tel:/i.test(href)) method='phone';
    else if(/talk\.naver\.com/i.test(href)) method='naver_talktalk';
    else if(/open\.kakao\.com/i.test(href)) method='kakao';
    else if(/(?:map\.naver\.com\/p\/entry\/place|naver\.me\/|place\.map\.kakao\.com)/i.test(href)) method='place';
    if(method) window.bujaTrack('contact_click',{method});
  },true);
  if(previous==='granted') return;
  const style=document.createElement('style');
  style.textContent='.buja-analytics-consent{position:fixed;z-index:9999;left:20px;right:20px;bottom:20px;max-width:760px;margin:auto;padding:16px 18px;background:#12243a;color:#f7f4ee;border:1px solid rgba(210,180,119,.55);box-shadow:0 12px 40px rgba(10,25,42,.24);display:flex;align-items:center;gap:18px;font:14px/1.6 system-ui,-apple-system,"Noto Sans KR",sans-serif}.buja-analytics-consent p{margin:0;flex:1}.buja-analytics-consent a{color:#e4c27e;text-underline-offset:3px}.buja-analytics-consent-actions{display:flex;gap:8px;flex-shrink:0}.buja-analytics-consent button{border:1px solid rgba(255,255,255,.5);padding:9px 13px;background:transparent;color:#fff;font:inherit;cursor:pointer}.buja-analytics-consent button[data-choice="granted"]{background:#d2b477;border-color:#d2b477;color:#12243a;font-weight:700}@media(max-width:600px){.buja-analytics-consent{left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));padding:13px;display:block;font-size:13px}.buja-analytics-consent-actions{margin-top:10px}.buja-analytics-consent button{flex:1}}';
  document.head.appendChild(style);
  const box=document.createElement('aside');
  box.className='buja-analytics-consent';
  box.setAttribute('role','region');
  box.setAttribute('aria-label','웹사이트 이용 통계 선택 안내');
  box.innerHTML='<p>홈페이지 개선을 위해 Google Analytics 이용 통계를 사용할 수 있습니다. 동의한 경우에만 작동하며, 성함·연락처·문의 내용은 전송하지 않습니다. <a href="privacy.html" target="_blank" rel="noopener noreferrer">개인정보 처리방침</a></p><div class="buja-analytics-consent-actions"><button type="button" data-choice="denied">거부</button><button type="button" data-choice="granted">동의</button></div>';
  box.addEventListener('click',event=>{
    const button=event.target.closest('button[data-choice]');
    if(!button) return;
    const choice=button.dataset.choice;
    try{localStorage.setItem(consentKey,choice)}catch(e){}
    box.remove();
    if(choice==='granted') start();
  });
  document.body.appendChild(box);
})();
