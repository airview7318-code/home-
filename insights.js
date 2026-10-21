(()=>{
  const cfg=window.BUJA_CONFIG||{};
  const box=document.querySelector('#insight-grid');
  if(!box)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const featured=[
    {
      category:'검단 단독주택 토지',
      title:'E1·E2블록 단독주택용지, 현장에서 살펴본 내용',
      excerpt:'검단신도시 E1·E2블록을 직접 확인한 네이버 블로그 글입니다. 필지별 이용 조건과 가격, 매각 여부는 상담 시점에 다시 확인해 주세요.',
      image:'assets/detached-home-land-thumbnail.jpg',
      href:'https://blog.naver.com/property98/224428452138',
      alt:'검단신도시 단독주택용지 참고 이미지'
    },
    {
      category:'검단 선임대 상가 사례',
      title:'임차인이 맞춰진 상가 매매, 투자 전 확인할 점',
      excerpt:'선임대 상가 매매 사례를 네이버 블로그에서 확인하세요. 현재 매도 여부와 임대차·금융 조건은 변경될 수 있으니 최신 내용을 확인해 드립니다.',
      image:'assets/commercial-thumbnail.jpg',
      href:'https://blog.naver.com/property98/224435453340',
      alt:'검단신도시 상가 참고 이미지'
    }
  ];
  const renderFeatured=()=>{
    box.innerHTML=featured.map(item=>`<a class="insight-card insight-link" href="${item.href}" target="_blank" rel="noopener noreferrer"><img src="${item.image}" alt="${item.alt}" loading="lazy"><div><span>${item.category}</span><h3>${item.title}</h3><p>${item.excerpt}</p><span class="insight-cta">네이버 블로그에서 원문 보기 ↗</span></div></a>`).join('');
  };
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){renderFeatured();return;}
  fetch(`${cfg.supabaseUrl.replace(/\/$/,'')}/rest/v1/blog_posts_public?select=id,title,slug,category,excerpt,body,cover_url,published_at,author&order=published_at.desc&limit=6`,{headers:{apikey:cfg.supabaseAnonKey,Authorization:`Bearer ${cfg.supabaseAnonKey}`}})
    .then(r=>{if(!r.ok)throw Error();return r.json();})
    .then(posts=>{
      if(!posts.length){renderFeatured();return;}
      box.innerHTML=posts.map(p=>`<article class="insight-card" data-post="${esc(p.id)}"><img src="${esc(p.cover_url||'assets/detached-home-land-thumbnail.jpg')}" alt="${esc(p.title)}" loading="lazy"><div><span>${esc(p.category)}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt||'')}</p><time>${esc((p.published_at||'').slice(0,10))} · ${esc(p.author||'검단 윤소장')}</time></div></article>`).join('');
      box.querySelectorAll('.insight-card').forEach(el=>el.addEventListener('click',()=>{
        const p=posts.find(x=>x.id===el.dataset.post);if(!p)return;
        const d=document.createElement('dialog');d.className='post-dialog';d.innerHTML=`<img src="${esc(p.cover_url||'')}" alt=""><article><button aria-label="닫기">×</button><span class="eyebrow">${esc(p.category)} · ${esc((p.published_at||'').slice(0,10))}</span><h2>${esc(p.title)}</h2><div class="post-body">${esc(p.body||p.excerpt||'')}</div><p>${esc(p.author||'검단 윤소장')}</p></article>`;document.body.append(d);d.showModal();d.querySelector('button').onclick=()=>{d.close();d.remove();};d.onclick=e=>{if(e.target===d){d.close();d.remove();}};
      }));
    })
    .catch(renderFeatured);
})();
