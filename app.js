(() => {
'use strict';

const PAGE_SIZE = 15;
const CATS = ['all','shaders','textures','mods','maps','clients','modpacks','bedwars'];
const STORAGE = { lang:'fpLang', dark:'fpDark', serverReviews:'fpServerReviews' };
const DEFAULT_STATS = (x) => ({
  rating: Math.min(5, 4.5 + (String(x.name).length % 5) / 10),
  ratings: Math.max(1, Math.floor(40 + String(x.name).length * 3)),
  downloads: Math.max(0, Math.floor(700 + String(x.name).length * 83)),
  views: Math.max(0, Math.floor(1800 + String(x.name).length * 137)),
  rated: false
});
const labels = {
  fa: {
    all:'همه', shaders:'شیدرها', textures:'تکسچر پک', mods:'مودها', maps:'مپ‌ها', clients:'کلاینت‌ها', modpacks:'مودپک‌ها', bedwars:'بدوارز',
    found:'نتیجه', items:'آیتم', empty:'چیزی پیدا نشد', emptySub:'نام دیگری را جستجو کنید یا فیلتر را بردارید',
    version:'نسخه', size:'اندازه', type:'نوع', official:'منبع اصلی ↗', rate:'★ امتیاز بده',
    downloads:'دانلود', views:'بازدید', details:'جزئیات', featured:'منتخب‌های First Pack', page:'صفحه',
    prev:'قبلی', next:'بعدی', allVersions:'همه نسخه‌ها', allSizes:'همه اندازه‌ها',
    selected:'منتخب', topRated:'بیشترین امتیاز', mostDownloaded:'بیشترین دانلود', newest:'جدیدترین',
    search:'جستجو بین منابع...', menuOpen:'باز کردن منو', menuClose:'بستن منو',
    theme:'تغییر پوسته', close:'بستن', rated:'★ امتیاز ثبت شد', loadError:'خطا در بارگذاری منابع. لطفاً صفحه را دوباره باز کنید.',
    heroTitle:'دنیای ماینکرفت خودتو بساز', heroText:'منابع منتخب Minecraft Java را با اطلاعات واضح، امتیاز کاربران و دسترسی سریع به منبع اصلی پیدا کن.',
    discover:'منبع مورد علاقه‌ات را پیدا کن', why:'چرا First Pack؟', home:'خانه', resources:'منابع', contact:'تماس', clear:'پاک‌کردن داده‌های محلی',
    clearDone:'داده‌های محلی پاک شد', noImage:'تصویر در دسترس نیست', loading:'در حال بارگذاری...'
  },
  en: {
    all:'All', shaders:'Shaders', textures:'Texture Packs', mods:'Mods', maps:'Maps', clients:'Clients', modpacks:'Modpacks', bedwars:'Bedwars',
    found:'results', items:'items', empty:'Nothing found', emptySub:'Try another search or remove a filter',
    version:'Version', size:'Size', type:'Type', official:'Official source ↗', rate:'★ Rate',
    downloads:'downloads', views:'views', details:'Details', featured:'First Pack picks', page:'Page',
    prev:'Previous', next:'Next', allVersions:'All versions', allSizes:'All sizes',
    selected:'Featured', topRated:'Top rated', mostDownloaded:'Most downloaded', newest:'Newest',
    search:'Search resources...', menuOpen:'Open menu', menuClose:'Close menu',
    theme:'Toggle theme', close:'Close', rated:'★ Rated', loadError:'Could not load resources. Please reload the page.',
    heroTitle:'Build your own Minecraft world.', heroText:'Discover selected Minecraft Java resources with clear details, ratings and quick access to the original source.',
    discover:'Find your next favorite resource', why:'Why First Pack?', home:'Home', resources:'Resources', contact:'Contact', clear:'Clear local data',
    clearDone:'Local data cleared', noImage:'Image unavailable', loading:'Loading...'
  }
};

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const safeStorage = {
  get(k, fallback=null) { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } },
  set(k,v) { try { localStorage.setItem(k,v); } catch {} },
  remove(k) { try { localStorage.removeItem(k); } catch {} },
  keys() { try { return Object.keys(localStorage); } catch { return []; } }
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = (s) => String(s ?? '').toLocaleLowerCase(state.lang === 'fa' ? 'fa-IR' : 'en-US');
const state = {
  lang: safeStorage.get(STORAGE.lang,'fa') === 'en' ? 'en' : 'fa',
  filter:'all', q:'', version:'all', size:'all', sort:'featured', menu:false,
  pages:{shaders:1,textures:1,mods:1,maps:1,clients:1,modpacks:1,bedwars:1}
};
let items = [];
let lastFocused = null;
let searchTimer = 0;

function statKey(x) { return `fp:${x.category}:${x.name}`; }
function getStats(x) {
  const base = DEFAULT_STATS(x);
  try {
    const raw = safeStorage.get(statKey(x));
    if (!raw) return base;
    const s = JSON.parse(raw);
    return {
      rating: Number.isFinite(Number(s.rating)) ? Math.min(5, Math.max(0, Number(s.rating))) : base.rating,
      ratings: Number.isFinite(Number(s.ratings)) ? Math.max(0, Math.floor(Number(s.ratings))) : base.ratings,
      downloads: Number.isFinite(Number(s.downloads)) ? Math.max(0, Math.floor(Number(s.downloads))) : base.downloads,
      views: Number.isFinite(Number(s.views)) ? Math.max(0, Math.floor(Number(s.views))) : base.views,
      rated: s.rated === true
    };
  } catch { return base; }
}
function saveStats(x,s) { safeStorage.set(statKey(x), JSON.stringify(s)); }
function sizeOf(x) {
  const matches = String(`${x.name} ${x.tags || ''}`).match(/(8x|16x|32x|64x|128x|256x)/ig);
  if (!matches) return '—';
  const v = Math.max(...matches.map(m => parseInt(m,10)));
  return v >= 64 ? '64x+' : `${v}x`;
}
function modrinthTypeFor(x){
  if(x.category==='mods') return 'mod';
  if(x.category==='textures') return 'resourcepack';
  if(x.category==='shaders') return 'shader';
  if(x.category==='modpacks') return 'modpack';
  return null;
}
function enrich(x,i,total) {
  return {...x,index:i,size:sizeOf(x),loader:x.category==='mods'?'Mod Loader dependent':'Minecraft Java',
    added:total-i, modrinthType:modrinthTypeFor(x)};
}
function directResourceUrl(x){
  if(x?.url && !x.url.includes('?query=')) return x.url;
  if(x?.modrinthType){
    const slug=String(x.name).toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return `https://modrinth.com/${x.modrinthType}/${slug}`;
  }
  return x?.url||'#';
}
function modrinthCacheKey(x){ return `fp:modrinth:${x.category}:${x.name}`; }
async function resolveModrinthProject(x){
  if(!x.modrinthType) return null;
  const cached=safeStorage.get(modrinthCacheKey(x));
  if(cached){ try { return JSON.parse(cached); } catch{} }
  try{
    const facets=encodeURIComponent(JSON.stringify([[`project_type:${x.modrinthType}`]]));
    const url=`https://api.modrinth.com/v2/search?query=${encodeURIComponent(x.name)}&limit=5&facets=${facets}`;
    const r=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const d=await r.json();
    const hits=Array.isArray(d.hits)?d.hits:[];
    const target=hits.sort((a,b)=>{
      const an=String(a.title||a.name||'').toLocaleLowerCase(), bn=String(b.title||b.name||'').toLocaleLowerCase();
      const q=String(x.name).toLocaleLowerCase();
      return (an===q? -2:an.includes(q)?-1:0)-(bn===q?-2:bn.includes(q)?-1:0);
    })[0];
    if(!target?.project_id) return null;
    let image=target.icon_url||x.image;
    let gallery=[];
    try{
      const pr=await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(target.project_id)}`,{headers:{'Accept':'application/json'}});
      if(pr.ok){
        const pd=await pr.json();
        gallery=Array.isArray(pd.gallery)?pd.gallery:[];
        image=gallery.find(g=>g.featured)?.url || gallery[0]?.url || pd.icon_url || image;
      }
    }catch{}
    const result={url:`https://modrinth.com/${x.modrinthType}/${target.slug}`,image};
    safeStorage.set(modrinthCacheKey(x),JSON.stringify(result));
    return result;
  }catch(err){ console.warn('Modrinth resolve failed',x.name,err); return null; }
}
async function hydrateModrinthResources(){
  const targets=items.filter(x=>x.modrinthType);
  let cursor=0;
  const workers=Array.from({length:4},async()=>{
    while(cursor<targets.length){
      const x=targets[cursor++];
      const resolved=await resolveModrinthProject(x);
      if(resolved){ x.url=resolved.url; x.image=resolved.image; }
      // Refresh only the visible cards after a resource resolves.
      const imgEls=$$('img',document).filter(img=>img.dataset.fpName===x.name);
      imgEls.forEach(img=>{img.src=x.image;});
      const links=$$(`.card[data-index="${x.index}"] .download`);
      links.forEach(a=>a.href=x.url);
    }
  });
  await Promise.all(workers);
}
function formatNum(n) { return new Intl.NumberFormat(state.lang==='fa'?'fa-IR':'en-US',{notation:'compact',maximumFractionDigits:1}).format(n); }
function filtered() {
  const q = normalize(state.q.trim());
  const a = items.filter(x =>
    (state.filter==='all'||x.category===state.filter) &&
    (state.version==='all'||x.version===state.version) &&
    (state.size==='all'||x.size===state.size) &&
    normalize(`${x.name} ${x.description} ${x.meta} ${x.tags||''}`).includes(q)
  );
  if (state.sort==='rating') a.sort((a,b)=>getStats(b).rating-getStats(a).rating || a.index-b.index);
  else if (state.sort==='downloads') a.sort((a,b)=>getStats(b).downloads-getStats(a).downloads || a.index-b.index);
  else if (state.sort==='newest') a.sort((a,b)=>b.added-a.added);
  else a.sort((a,b)=>(Number(b.featured===true)-Number(a.featured===true)) || a.index-b.index);
  return a;
}
function resetPages() { Object.keys(state.pages).forEach(k=>state.pages[k]=1); }

function isFavorite(x){
  const key=getSession(); if(!key)return false;
  try{return (JSON.parse(safeStorage.get(`fp:favorites:${key}`,'[]'))||[]).includes(`${x.category}:${x.name}`);}catch{return false;}
}
function toggleFavorite(x){
  const a=currentAccount(); if(!a){showToast(state.lang==='fa'?'ابتدا وارد حساب شو.':'Please log in first.'); return;}
  const key=getSession(), k=`${x.category}:${x.name}`;
  let arr=[]; try{arr=JSON.parse(safeStorage.get(`fp:favorites:${key}`,'[]'))||[];}catch{}
  arr=arr.includes(k)?arr.filter(v=>v!==k):[...arr,k]; safeStorage.set(`fp:favorites:${key}`,JSON.stringify(arr));
  showToast(arr.includes(k)?(state.lang==='fa'?'به علاقه‌مندی‌ها اضافه شد ❤️':'Added to favorites ❤️'):(state.lang==='fa'?'از علاقه‌مندی‌ها حذف شد':'Removed from favorites'));
  render(); window.__fpAccountRefresh?.();
}
function recordDownload(x){
  const a=currentAccount(); if(!a)return;
  const key=getSession(), k=`${x.category}:${x.name}`; let arr=[];
  try{arr=JSON.parse(safeStorage.get(`fp:downloads:${key}`,'[]'))||[];}catch{}
  if(!arr.includes(k)){arr.unshift(k);arr=arr.slice(0,100);safeStorage.set(`fp:downloads:${key}`,JSON.stringify(arr));}
}
function card(x) {
  if(x.category==='bedwars' && !x.image) return '';
  const L=labels[state.lang], s=getStats(x), fav=isFavorite(x);
  return `<article class="card" data-index="${x.index}">
    <button class="favorite-btn ${fav?'is-favorite':''}" type="button" data-favorite="${x.index}" aria-label="${fav?'حذف از علاقه‌مندی':'افزودن به علاقه‌مندی'}">${fav?'♥':'♡'}</button>
    <button class="card-open" type="button" aria-label="${esc(L.details)}: ${esc(x.name)}">
      <div class="pic ${x.category==='bedwars'?'bedwars-banner':''}"><img data-fp-name="${esc(x.name)}" src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy" decoding="async" width="640" height="360"><span class="image-fallback" aria-hidden="true">${esc(L.noImage)}</span><b class="badge">${esc(x.badge)}</b></div>
      <div class="body">
        <div class="meta"><span>${esc(x.meta)}</span><span>${esc(L.version)}: ${esc(x.version)}</span></div>
        <h3>${esc(x.name)}</h3><p>${esc(x.description)}</p>
        <div class="tags">${(x.tags||'').split('|').filter(Boolean).slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div>
        <div class="stats"><span>★ ${s.rating.toFixed(1)} (${s.ratings})</span><span>↓ ${formatNum(s.downloads)}</span></div>
      </div>
    </button>
    <div class="card-actions"><a class="download" data-download="${x.index}" href="${esc(directResourceUrl(x))}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${esc(L.official)}</a></div>
  </article>`;
}
function pageBlock(c,arr) {
  const L=labels[state.lang], total=Math.ceil(arr.length/PAGE_SIZE);
  const page=Math.min(state.pages[c]||1,Math.max(total,1)); state.pages[c]=page;
  const shown=arr.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE), buttons=[];
  if(total>1) {
    buttons.push(`<button class="page-btn" type="button" data-page-cat="${c}" data-page="${page-1}" ${page===1?'disabled':''}>‹ ${esc(L.prev)}</button>`);
    for(let i=1;i<=total;i++){
      if(total>7&&i>2&&i<total-1&&Math.abs(i-page)>1){if(i===3||i===total-2)buttons.push('<span class="page-dots" aria-hidden="true">…</span>');continue;}
      buttons.push(`<button class="page-btn ${i===page?'active':''}" type="button" data-page-cat="${c}" data-page="${i}" aria-current="${i===page?'page':'false'}">${i}</button>`);
    }
    buttons.push(`<button class="page-btn" type="button" data-page-cat="${c}" data-page="${page+1}" ${page===total?'disabled':''}>${esc(L.next)} ›</button>`);
  }
  return {shown,total,page,pager:total>1?`<nav class="pagination" aria-label="${esc(L.page)}"><span>${esc(L.page)} ${page} / ${total}</span>${buttons.join('')}</nav>`:''};
}
function applyStaticText() {
  const L=labels[state.lang];
  document.documentElement.lang=state.lang; document.documentElement.dir=state.lang==='fa'?'rtl':'ltr';
  $('#heroText').textContent=L.heroText; $('#heroTitle').innerHTML=L.heroTitle;
  $('#search').placeholder=L.search;
  $('#themeBtn').setAttribute('aria-label',L.theme); $('#themeBtn').title=L.theme;
  const langBtn=$('#lang');
  if(langBtn){
    langBtn.innerHTML=`<span class="lang-flag" aria-hidden="true">${state.lang==='fa'?'🇮🇷':'🇬🇧'}</span>`;
    langBtn.setAttribute('aria-label',state.lang==='fa'?'Switch language':'تغییر زبان');
    langBtn.setAttribute('title',state.lang==='fa'?'Switch to English':'تغییر به فارسی');
  }
  $('#menuBtn').setAttribute('aria-label',state.menu?L.menuClose:L.menuOpen); $('#menuBtn').setAttribute('aria-expanded',String(state.menu));
  $('#modalClose').setAttribute('aria-label',L.close);
  const navMap={shaders:L.shaders,textures:L.textures,mods:L.mods,maps:L.maps,clients:L.clients,modpacks:L.modpacks,bedwars:L.bedwars};
  $$('nav a').forEach(a=>{const key=a.getAttribute('href')?.slice(1);if(navMap[key])a.textContent=navMap[key];});
  $('#clearData').textContent=L.clear;
  const discoverTitle=$('.discover h2'); if(discoverTitle) discoverTitle.textContent=L.discover;
  const featuredTitle=$('#featured h2'); if(featuredTitle) featuredTitle.textContent='🔥 '+L.featured;
  const whyTitle=$('.why h2'); if(whyTitle) whyTitle.textContent=L.why;
  const footerHome=$('.footer-links a[href="#home"]'); if(footerHome) footerHome.textContent=L.home;
  const footerResources=$('.footer-links a[href="#catalog"]'); if(footerResources) footerResources.textContent=L.resources;
  const footerContact=$('.footer-links a[href^="mailto:"]'); if(footerContact) footerContact.textContent=L.contact;
}
function populateVersions() {
  const L=labels[state.lang], sel=$('#versionFilter'), current=state.version;
  const vals=[...new Set(items.map(x=>x.version).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
  sel.innerHTML=`<option value="all">${esc(L.allVersions)}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  sel.value=vals.includes(current)?current:'all'; state.version=sel.value;
  $('#sizeFilter').innerHTML=`<option value="all">${esc(L.allSizes)}</option><option value="16x">16x</option><option value="32x">32x</option><option value="64x+">64x+</option>`;
  $('#sizeFilter').value=state.size;
  $('#sortFilter').innerHTML=`<option value="featured">${esc(L.selected)}</option><option value="rating">${esc(L.topRated)}</option><option value="downloads">${esc(L.mostDownloaded)}</option><option value="newest">${esc(L.newest)}</option>`;
  $('#sortFilter').value=state.sort;
}
function render() {
  const L=labels[state.lang]; applyStaticText();
  $('#filters').className='filters';
  $('#filters').innerHTML=CATS.map(c=>`<button class="filter ${state.filter===c?'active':''}" type="button" data-c="${c}" aria-pressed="${state.filter===c}">${esc(L[c])}</button>`).join('');
  const a=filtered(); $('#count').textContent=`${a.length} ${L.found}`;
  const groups=CATS.slice(1).map(c=>[c,a.filter(x=>x.category===c)]).filter(([,arr])=>arr.length);
  $('#catalog').innerHTML=groups.length?groups.map(([c,arr],i)=>{
    const pg=pageBlock(c,arr);
    return `<section class="section" id="${c}" aria-labelledby="${c}-title"><div class="section-head"><div><small>0${i+1} / MINECRAFT</small><h2 id="${c}-title">${esc(L[c])}</h2></div><p>${arr.length} ${esc(L.items)}</p></div><div class="grid">${pg.shown.map(card).filter(Boolean).join('')}</div>${pg.pager}</section>`;
  }).join(''):`<div class="empty"><strong>${esc(L.empty)}</strong><span>${esc(L.emptySub)}</span></div>`;
  const picks=[...items].sort((a,b)=>(Number(b.featured===true)-Number(a.featured===true))||getStats(b).rating-getStats(a).rating||a.index-b.index).slice(0,4);
  $('#featuredGrid').innerHTML=picks.map(card).filter(Boolean).join('');
  populateVersions(); $('#mobileNav').classList.toggle('open',state.menu);
  bindCards(); bindImages(); renderExtraSections();
}
function bindCards() { $$('.card-open').forEach(b=>b.onclick=()=>openModal(items[Number(b.closest('.card').dataset.index)])); }
function bindImages() { $$('img', $('#catalog')).concat($$('img', $('#featuredGrid'))).forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.closest('.pic')?.classList.add('image-error');},{once:true})); }
function openModal(x) {
  if(!x)return;
  const L=labels[state.lang], s=getStats(x); s.views++; saveStats(x,s); lastFocused=document.activeElement;
  const image=$('#modalImage'); image.hidden=false; image.src=x.image; image.alt=x.name; image.onerror=()=>{image.hidden=true;};
  $('#modalBadge').textContent=x.badge; $('#modalTitle').textContent=x.name; $('#modalDescription').textContent=x.description;
  $('#modalFacts').innerHTML=`<span>${esc(L.version)}: <b>${esc(x.version)}</b></span><span>${esc(L.type)}: <b>${esc(x.meta)}</b></span><span>${esc(L.size)}: <b>${esc(x.size)}</b></span>`;
  $('#modalTags').innerHTML=(x.tags||'').split('|').filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('');
  $('#modalRating').textContent=`★ ${s.rating.toFixed(1)} / 5 (${s.ratings})`;
  $('#modalDownloads').textContent=`↓ ${formatNum(s.downloads)} ${L.downloads} · ${formatNum(s.views)} ${L.views}`;
  const rate=$('#rateBtn'); rate.textContent=s.rated?L.rated:L.rate; rate.disabled=s.rated;
  rate.onclick=()=>{if(s.rated)return;s.rating=Math.min(5,(s.rating*s.ratings+5)/(s.ratings+1));s.ratings++;s.rated=true;saveStats(x,s);openModal(x);};
  const source=$('#modalSource'); source.href=directResourceUrl(x); source.textContent=L.official;
  $('#modal').classList.add('open'); $('#modal').setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); $('#modalClose').focus();
}
function closeModal() { $('#modal').classList.remove('open'); $('#modal').setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); if(lastFocused?.focus)lastFocused.focus(); }
function toggleTheme() { const dark=document.body.classList.toggle('dark'); safeStorage.set(STORAGE.dark,dark?'1':'0'); updateThemeColor(dark); }
function updateThemeColor(dark=document.body.classList.contains('dark')) { const meta=$('meta[name="theme-color"]'); if(meta)meta.content=dark?'#1d1511':'#43291d'; }
function trapFocus(e) {
  if(e.key!=='Tab'||!$('#modal').classList.contains('open'))return;
  const els=$$('#modal button,#modal a,[tabindex]:not([tabindex="-1"])').filter(x=>!x.disabled&&x.offsetParent!==null);
  if(!els.length)return; const first=els[0],last=els[els.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();} else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
}
function showToast(text) { const toast=$('#toast'); if(!toast)return; toast.textContent=text; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200); }

$('#search').addEventListener('input',e=>{clearTimeout(searchTimer); const value=e.target.value; searchTimer=setTimeout(()=>{state.q=value;resetPages();render();},120);});
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){state.filter=b.dataset.c;resetPages();render();}});
document.addEventListener('click',e=>{
  const fav=e.target.closest('[data-favorite]');
  if(fav){e.preventDefault();e.stopPropagation();toggleFavorite(items[Number(fav.dataset.favorite)]);return;}
  const dl=e.target.closest('[data-download]');
  if(dl){recordDownload(items[Number(dl.dataset.download)]); const x=items[Number(dl.dataset.download)]; const s=getStats(x); s.downloads++; saveStats(x,s); return;}
  const page=e.target.closest('[data-page-cat]');
  if(page&&!page.disabled){state.pages[page.dataset.pageCat]=Number(page.dataset.page);render();document.getElementById(page.dataset.pageCat)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  const navLink=e.target.closest('#mobileNav a');
  if(navLink){state.menu=false;render();}
});
$('#versionFilter').addEventListener('change',e=>{state.version=e.target.value;resetPages();render();});
$('#sizeFilter').addEventListener('change',e=>{state.size=e.target.value;resetPages();render();});
$('#sortFilter').addEventListener('change',e=>{state.sort=e.target.value;resetPages();render();});
$('#lang').addEventListener('click',()=>{state.lang=state.lang==='fa'?'en':'fa';safeStorage.set(STORAGE.lang,state.lang);render();window.__fpAssistantRefresh?.(); window.__fpCommunityRatingRefresh?.(); window.__fpCommentsRefresh?.(); window.__fpAccountRefresh?.();});
$('#menuBtn').addEventListener('click',()=>{state.menu=!state.menu;render();});
$('#modalClose').addEventListener('click',closeModal); $('.modal-backdrop').addEventListener('click',closeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#modal').classList.contains('open'))closeModal();else if(state.menu){state.menu=false;render();}}trapFocus(e);});
$('#themeBtn').addEventListener('click',toggleTheme);
$('#clearData').addEventListener('click',e=>{e.preventDefault();safeStorage.keys().filter(k=>k.startsWith('fp:')).forEach(k=>safeStorage.remove(k));showToast(labels[state.lang].clearDone);render();});

// Local First Pack assistant: fast FAQ answers without an API key.
const assistantFAQ = [
  {keys:['ماینکرافت رو از کجا نصب کنم','ماینکرافت از کجا نصب کنم','دانلود ماینکرافت','minecraft download','install minecraft'], fa:'برای نسخه Java، بهترین کار این است که لانچر رسمی Minecraft را از سایت رسمی Minecraft دریافت کنی. بعد با حساب Microsoft وارد شو و نسخه Java را اجرا کن. برای امنیت، از لانچرها و فایل‌های ناشناس استفاده نکن.', en:'For Minecraft Java, the safest option is the official Minecraft Launcher. Download it from the official Minecraft website, sign in with your Microsoft account, and launch Java Edition. Avoid unknown launchers or installers.', link:'https://www.minecraft.net/download'},
  {keys:['فرق کلاینت ها با هم چیه','فرق کلاینت ها','کلاینت چیست','client difference','clients'], fa:'کلاینت‌های Minecraft معمولاً لانچر یا محیطی آماده برای بازی هستند که امکاناتی مثل بهینه‌سازی، HUD، تنظیمات و مودهای داخلی ارائه می‌کنند. تفاوتشان بیشتر در امکانات، مصرف منابع، سازگاری و رابط کاربری است؛ مثلاً Lunar و Badlion هرکدام مجموعه امکانات متفاوتی دارند.', en:'Minecraft clients are usually customized launchers or game environments that bundle features such as optimization, HUDs, settings, and built-in mods. They mainly differ in features, resource usage, compatibility, and interface.', link:null},
  {keys:['کیپ اوپتیفاین چیست','کیپ optifine چیست','optifine cape','cape optifine','اپتیفاین کیپ'], fa:'OptiFine Cape یک آیتم ظاهری مرتبط با OptiFine است که روی بازیکنانی که شرایط دریافت/نمایش آن را دارند دیده می‌شود. خودِ کیپ باعث افزایش FPS نمی‌شود؛ بیشتر یک ویژگی ظاهری است.', en:'An OptiFine Cape is a cosmetic feature associated with OptiFine. It is visual and does not itself increase FPS.'},
  {keys:['شیدر چیست','shader چیست','شیدر چیه','what is a shader'], fa:'شیدرها ظاهر نور، سایه، آب، آسمان و بعضی جلوه‌های تصویری Minecraft را تغییر می‌دهند. معمولاً به GPU بیشتری نیاز دارند؛ اگر FPS پایین آمد، کیفیت سایه و رندر را کاهش بده.', en:'Shaders change lighting, shadows, water, skies, and other visual effects in Minecraft. They usually use more GPU power, so lower shadow or render quality if FPS drops.'},
  {keys:['تکسچر پک چیست','texture pack چیست','resource pack چیست','تکسچر پک چیه'], fa:'Texture Pack یا Resource Pack مجموعه‌ای از فایل‌های ظاهری است که بافت بلوک‌ها، آیتم‌ها، رابط کاربری و گاهی صداها را تغییر می‌دهد. برخلاف مود، معمولاً منطق بازی را تغییر نمی‌دهد.', en:'A Texture/Resource Pack changes visual assets such as blocks, items, UI, and sometimes sounds. Unlike a mod, it usually does not change game logic.'},
  {keys:['مود چیست','mod چیست','مود چیه'], fa:'مود یک افزونه برای Minecraft است که می‌تواند امکانات، مکانیک‌ها، رابط کاربری یا عملکرد بازی را تغییر دهد. سازگاری مود با نسخه Minecraft و Loader مثل Fabric یا NeoForge را قبل از نصب بررسی کن.', en:'A mod is an add-on that can change Minecraft features, mechanics, UI, or performance. Check the Minecraft version and loader compatibility, such as Fabric or NeoForge, before installing.'},
  {keys:['fabric یا forge','fabric vs forge','فرق فابریک و فورج','فرق fabric و forge'], fa:'Fabric و Forge هر دو محیط اجرای مود هستند، اما اکوسیستم و سازگاری مودهایشان یکسان نیست. بهترین انتخاب به مودهایی که می‌خواهی استفاده کنی بستگی دارد؛ صفحه هر مود را برای Loader موردنیاز بررسی کن.', en:'Fabric and Forge are both mod loaders, but their ecosystems and mod compatibility differ. Choose based on the mods you want and check each project for its required loader.'},
  {keys:['چطور fps رو زیاد کنم','افزایش fps','fps بالا','increase fps'], fa:'اول Render Distance و Simulation Distance را کمی پایین بیاور، سپس گرافیک را روی Fast بگذار و برنامه‌های اضافی را ببند. برای بهینه‌سازی بیشتر، از مودهای شناخته‌شده و سازگار با نسخه‌ات استفاده کن.', en:'Lower Render Distance and Simulation Distance, use Fast graphics, and close unnecessary apps. For more optimization, use well-known performance mods compatible with your Minecraft version.'},
  {keys:['کدام شیدر بهتر است','بهترین شیدر','best shader'], fa:'یک شیدر «بهترین» برای همه وجود ندارد؛ انتخاب به قدرت سیستم و سلیقه بستگی دارد. اگر FPS مهم‌تر است، شیدرهای سبک‌تر را انتخاب کن؛ اگر کیفیت تصویر مهم‌تر است، سراغ پریست‌های سنگین‌تر برو.', en:'There is no single best shader for everyone. Choose based on your hardware and priorities: lighter shaders for FPS, heavier presets for visual quality.'},
  {keys:['چطور مود نصب کنم','نصب مود','install mod'], fa:'اول نسخه Minecraft و Loader موردنیاز مود را بررسی کن. سپس Loader سازگار را نصب کن و فایل مود را طبق دستور همان پروژه در پوشه mods قرار بده. از فایل‌های ناشناس استفاده نکن و قبل از نصب از دنیای مهمت نسخه پشتیبان بگیر.', en:'First check the mod’s required Minecraft version and loader. Install the compatible loader, then follow the project instructions for placing the mod in the mods folder. Avoid unknown files and back up important worlds first.'},
  {keys:['ریسورس پک چطور نصب کنم','نصب ریسورس پک','install resource pack','resource pack install'], fa:'ریسورس پک سازگار با نسخه Minecraft را دانلود کن، سپس از Options > Resource Packs وارد پوشه پک‌ها شو و فایل را در آن قرار بده. بعد از برگشتن به بازی، پک را از فهرست فعال کن.', en:'Download a resource pack compatible with your Minecraft version, open Options > Resource Packs and place the pack file in the resourcepacks folder. Return to the game and activate it from the list.'},
  {keys:['شیدر چطور نصب کنم','نصب شیدر','install shader','shader install'], fa:'برای اجرای شیدر معمولاً به یک روش سازگار مثل Iris یا OptiFine نیاز داری. نسخه Minecraft و سازگاری شیدر را بررسی کن، سپس فایل شیدر را طبق دستور همان ابزار در پوشه shaderpacks قرار بده.', en:'Shaders usually require a compatible solution such as Iris or OptiFine. Check the Minecraft version and shader compatibility, then place the shader file in the shaderpacks folder according to the tool instructions.'},
  {keys:['فابریک چیست','fabric چیست','what is fabric'], fa:'Fabric یک mod loader سبک برای Minecraft است که تعداد زیادی مود مدرن از آن استفاده می‌کنند. برای هر مود، نسخه Minecraft و نسخه Fabric موردنیاز را بررسی کن.', en:'Fabric is a lightweight Minecraft mod loader used by many modern mods. Check the required Minecraft and Fabric versions for each mod.'},
  {keys:['نئوفورج چیست','neoforge چیست','what is neoforge'], fa:'NeoForge یک mod loader و فورک مدرن از Forge است که برای اجرای مجموعه‌ای از مودهای Minecraft استفاده می‌شود. سازگاری هر مود با NeoForge را در صفحه پروژه بررسی کن.', en:'NeoForge is a modern Minecraft mod loader and a fork of Forge, used by many modded setups. Check each project for NeoForge compatibility.'},
  {keys:['بهترین مودهای ماینکرافت','مودهای پیشنهادی','best minecraft mods'], fa:'انتخاب مود به سبک بازی بستگی دارد. برای بهینه‌سازی، مودهای Performance را ببین؛ برای ساخت‌وساز Create و برای نقشه و رابط کاربری مودهای مربوط به World Map و HUD گزینه‌های خوبی هستند. نسخه و Loader را حتماً بررسی کن.', en:'The best mods depend on how you play. For performance, look for optimization mods; for building, Create is popular; for maps and UI, world-map and HUD mods can help. Always check the version and loader.'},
  {keys:['چطور مپ نصب کنم','نصب مپ','install map','minecraft map'], fa:'فایل مپ را متناسب با نسخه Minecraft دریافت کن و آن را در پوشه saves قرار بده. اگر مپ دستور نصب مخصوصی دارد، همان دستور پروژه را دنبال کن و قبل از جایگزینی دنیاهای مهم نسخه پشتیبان بگیر.', en:'Get a map compatible with your Minecraft version and place its world folder in the saves folder. If the map has special installation steps, follow the project instructions and back up important worlds first.'},
  {keys:['rlcraft چیست','آر ال کرافت چیست','what is rlcraft'], fa:'RLCraft یک مادپک بسیار چالش‌برانگیز برای Minecraft است که بقا، اکتشاف و سیستم‌های مختلف را سخت‌تر و عمیق‌تر می‌کند. قبل از نصب، نسخه Minecraft و Loader موردنیاز همان نسخه مادپک را بررسی کن.', en:'RLCraft is a challenging Minecraft modpack focused on survival, exploration, and deeper gameplay systems. Check the Minecraft version and required loader for the specific pack version before installing.'},
  {keys:['مودپک چیست','modpack چیست','what is a modpack'], fa:'مودپک مجموعه‌ای از مودهاست که برای کار کردن در کنار هم و ایجاد یک تجربه مشخص آماده شده‌اند. معمولاً تنظیمات و وابستگی‌های لازم هم همراه آن مدیریت می‌شود.', en:'A modpack is a curated collection of mods configured to work together around a particular gameplay experience. It usually also manages required dependencies and settings.'},
  {keys:['چرا ماینکرافت لگ میزند','چرا minecraft لگ دارد','رفع لگ ماینکرافت','minecraft lag'], fa:'اول Render Distance و Simulation Distance را کاهش بده، برنامه‌های اضافی را ببند و مطمئن شو Java و درایور گرافیک به‌روز و سازگار هستند. اگر با مودپک بازی می‌کنی، تعداد و سنگینی مودها هم روی عملکرد اثر دارد.', en:'Lower Render Distance and Simulation Distance, close unnecessary apps, and make sure Java and your graphics driver are compatible and up to date. Modpacks can also affect performance depending on their size and complexity.'},
  {keys:['چطور نسخه ماینکرافت را بفهمم','نسخه ماینکرافت چیست','minecraft version'], fa:'نسخه Minecraft را می‌توانی در صفحه اصلی لانچر یا گوشه منوی بازی ببینی. هنگام نصب مود، شیدر یا ریسورس پک، همین نسخه را با نسخه موردنیاز پروژه تطبیق بده.', en:'You can see your Minecraft version in the launcher or on the game menu. When installing mods, shaders, or resource packs, match that version with the project requirements.'},
  {keys:['جاوا ادیشن یا بدراک','java یا bedrock','java vs bedrock'], fa:'Java Edition بیشتر برای مودها، سرورهای سفارشی و آزادی عمل در کامپیوتر شناخته می‌شود؛ Bedrock روی پلتفرم‌های مختلف و بازی بین‌پلتفرمی مزیت‌های خودش را دارد. انتخاب مناسب به دستگاه و نوع بازی تو بستگی دارد.', en:'Java Edition is well known for modding and customization on PC, while Bedrock has broad platform support and strong cross-play features. The better choice depends on your platform and how you play.'}
];

function assistantNormalize(v){return String(v||'').toLocaleLowerCase('fa-IR').replace(/[؟?!.,،؛:()\[\]{}]/g,' ').replace(/\s+/g,' ').trim();}
function assistantScore(query, item){
  const q=assistantNormalize(query); if(!q) return 0;
  let score=0;
  for(const key of item.keys){
    const k=assistantNormalize(key);
    if(q.includes(k)) score=Math.max(score,100+k.length);
    else {
      const words=k.split(' ').filter(w=>w.length>2);
      const hits=words.filter(w=>q.includes(w)).length;
      score=Math.max(score,hits*10 + (hits===words.length&&words.length>1?25:0));
    }
  }
  return score;
}
function assistantAnswer(query){
  const ranked=assistantFAQ.map(x=>({x,score:assistantScore(query,x)})).sort((a,b)=>b.score-a.score);
  const best=ranked[0];
  const q=assistantNormalize(query);
  if(q.includes('بدوار')||q.includes('bedwars')) return {fa:'برای Bedwars، از بخش «بدوارز» می‌توانی پک‌های PvP و Bedwars را ببینی. روی قلب هر پک بزن تا به علاقه‌مندی‌ها اضافه شود.',en:'Open the Bedwars section to browse Bedwars/PvP packs. Use the heart button to save a pack to favorites.'};
  if(q.includes('سرور')||q.includes('server')) return {fa:'بخش «سرورها» برای سرورهایی مثل TrexMine، GameUP و Hypixel اضافه شده است.',en:'The Servers section includes networks such as TrexMine, GameUP and Hypixel.'};
  if(q.includes('علاقه')||q.includes('favorite')) return {fa:'برای ذخیره علاقه‌مندی، وارد حساب شو و روی قلب خالی زیر هر ریسورس بزن. موارد ذخیره‌شده در پنل حساب نمایش داده می‌شوند.',en:'Log in and press the heart on any resource. Saved items appear in your account panel.'};
  if(q.includes('کامنت')||q.includes('comment')) return {fa:'کامنت‌ها با ربات امنیتی First Pack بررسی می‌شوند و کلمات نامناسب قبل از نمایش فیلتر می‌شوند.',en:'Comments are checked by the First Pack security bot and inappropriate words are filtered before display.'};
  if(best && best.score>=20) return best.x;
  return {fa:'سؤال خوبی بود! درباره مود، شیدر، ریسورس پک، بدوارز، کلاینت یا سرور سؤال بپرس.',en:'Good question! Ask me about mods, shaders, resource packs, Bedwars, clients, or servers.'};
}
function initAssistant(){
  const root=$('#fpAssistant'); if(!root)return;
  const launcher=$('#fpAssistantLauncher'), panel=$('#fpAssistantPanel'), close=$('#fpAssistantClose'), form=$('#fpAssistantForm'), input=$('#fpAssistantInput'), messages=$('#fpAssistantMessages'), suggestions=$('#fpAssistantSuggestions');
  let open=false;
  const suggestionsFA=['ماینکرافت رو از کجا نصب کنم؟','فرق کلاینت‌ها چیه؟','کیپ اوپتیفاین چیست؟','شیدر چیست؟','ریسورس پک چطور نصب کنم؟','شیدر چطور نصب کنم؟','Fabric چیست؟','NeoForge چیست؟','بهترین مودهای ماینکرافت کدامند؟','چطور مپ نصب کنم؟','RLCraft چیست؟','مودپک چیست؟','چرا ماینکرافت لگ می‌زند؟','چطور نسخه ماینکرافت را بفهمم؟'];
  const suggestionsEN=['Where can I install Minecraft?','What is the difference between clients?','What is an OptiFine Cape?','What is a shader?','How do I install a resource pack?','How do I install a shader?','What is Fabric?','What is NeoForge?','What are the best Minecraft mods?','How do I install a map?','What is RLCraft?','What is a modpack?','Why is Minecraft lagging?','How do I check my Minecraft version?'];
  const welcome={fa:'سلام! 👋 من دستیار First Pack هستم. درباره Minecraft، مود، شیدر، تکسچر پک و کلاینت‌ها سؤال بپرس.',en:'Hi! 👋 I’m the First Pack assistant. Ask me about Minecraft, mods, shaders, resource packs, or clients.'};
  function currentText(){return state.lang==='fa';}
  function addMessage(text,who='bot',link=null){
    const bubble=document.createElement('div'); bubble.className=`fp-msg ${who}`; bubble.textContent=text;
    if(link){const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.textContent=state.lang==='fa'?'باز کردن سایت رسمی ↗':'Open official site ↗';bubble.appendChild(document.createElement('br'));bubble.appendChild(a);}
    messages.appendChild(bubble); messages.scrollTop=messages.scrollHeight;
  }
  function renderSuggestions(){suggestions.innerHTML=''; const arr=state.lang==='fa'?suggestionsFA:suggestionsEN; arr.forEach(text=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>ask(text));suggestions.appendChild(b);});}
  function ask(text){
    const q=String(text||'').trim(); if(!q)return;
    addMessage(q,'user');
    const answer=assistantAnswer(q); setTimeout(()=>addMessage(state.lang==='fa'?answer.fa:answer.en,'bot',answer.link),140);
    input.value='';
  }
  function setOpen(v){open=v;panel.hidden=!v;launcher.setAttribute('aria-expanded',String(v));root.classList.toggle('is-open',v);if(v){if(!messages.children.length)addMessage(currentText()?welcome.fa:welcome.en);renderSuggestions();setTimeout(()=>input.focus(),0);}else launcher.focus();}
  launcher.addEventListener('click',()=>setOpen(!open)); close.addEventListener('click',()=>setOpen(false));
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)setOpen(false);});
  const oldRender=render;
  // Keep assistant labels synchronized with the site's language without replacing the chat history.
  window.__fpAssistantRefresh=()=>{if(!root)return; $('#fpAssistantTitle').textContent=state.lang==='fa'?'دستیار First Pack':'First Pack Assistant'; $('#fpAssistantStatus').textContent=state.lang==='fa'?'پاسخ‌های سریع درباره Minecraft':'Quick answers about Minecraft'; input.placeholder=state.lang==='fa'?'مثلاً: فرق کلاینت‌ها چیه؟':'e.g. What is the difference between clients?'; if(open)renderSuggestions();};
  window.__fpAssistantSetOpen=setOpen;
  window.__fpAssistantRefresh();
}




// v16 local account system: username + password + optional avatar.
// This is intentionally local-only for static GitHub Pages. Passwords are hashed in-browser;
// a real multi-device/shared account system needs a server/auth backend.
const ACCOUNT_KEYS={accounts:'fp:accounts',session:'fp:session'};
async function accountHash(value){
  const text=String(value||'');
  if(window.crypto?.subtle){
    const data=new TextEncoder().encode(text), buf=await crypto.subtle.digest('SHA-256',data);
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  let h=2166136261; for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);} return String(h>>>0);
}
function getAccounts(){try{return JSON.parse(safeStorage.get(ACCOUNT_KEYS.accounts,'{}'))||{};}catch{return {};}}
function saveAccounts(v){safeStorage.set(ACCOUNT_KEYS.accounts,JSON.stringify(v));}
function getSession(){return safeStorage.get(ACCOUNT_KEYS.session,'');}
function currentAccount(){const u=getSession(), a=getAccounts(); return u&&a[u]?a[u]:null;}
function accountInitial(name){return String(name||'?').trim().slice(0,1).toUpperCase()||'♙';}
function setAvatar(el,src,name){if(!el)return; el.innerHTML=''; if(src){const img=document.createElement('img');img.src=src;img.alt=`پروفایل ${name||''}`;el.appendChild(img);}else el.textContent=accountInitial(name);}
function accountLabels(){return state.lang==='fa'?{
  login:'ورود',register:'ثبت‌نام',title:'حساب کاربری',subtitle:'ثبت‌نام کن تا نام و پروفایلت در سایت نمایش داده شود.',username:'نام کاربری',password:'رمز عبور',avatar:'تصویر پروفایل',avatarHint:'تصویر اختیاری است؛ حداکثر ۱.۵ مگابایت.',loginSubmit:'ورود',registerSubmit:'ساخت حساب',note:'حساب این نسخه روی همین مرورگر ذخیره می‌شود.',logged:'حساب شما فعال است.',edit:'تغییر تصویر پروفایل',logout:'خروج',exists:'یوزر نیم مورد نظر شما پر است',bad:'نام کاربری یا رمز عبور اشتباه است.',created:'حساب با موفقیت ساخته شد.',saved:'تصویر پروفایل ذخیره شد.',invalidAvatar:'لطفاً یک تصویر معتبر تا حداکثر ۱.۵ مگابایت انتخاب کن.',shortUser:'نام کاربری باید حداقل ۳ کاراکتر باشد.',shortPass:'رمز عبور باید حداقل ۶ کاراکتر باشد.'
}:{login:'Login',register:'Sign up',title:'Account',subtitle:'Create an account so your name and profile can appear on the site.',username:'Username',password:'Password',avatar:'Profile picture',avatarHint:'Optional image; maximum 1.5 MB.',loginSubmit:'Login',registerSubmit:'Create account',note:'This version stores the account on this browser.',logged:'Your account is active.',edit:'Change profile picture',logout:'Log out',exists:'That username is already registered.',bad:'Incorrect username or password.',created:'Account created successfully.',saved:'Profile picture saved.',invalidAvatar:'Please choose a valid image up to 1.5 MB.',shortUser:'Username must be at least 3 characters.',shortPass:'Password must be at least 6 characters.'};}
function initAccounts(){
  const modal=$('#accountModal'); if(!modal)return;
  const btn=$('#accountBtn'), btnText=$('#accountBtnText'), btnAvatar=$('.account-btn .account-avatar'), close=$('#accountClose'), backdrop=$('.account-backdrop'), form=$('#accountForm'), loginTab=$('#loginTab'), registerTab=$('#registerTab'), avatarField=$('#avatarField'), avatarInput=$('#avatarInput'), profile=$('#accountProfile'), profileAvatar=$('#profileAvatar'), profileName=$('#profileName'), profileStatus=$('#profileStatus'), edit=$('#editProfileBtn'), logout=$('#logoutBtn'), message=$('#accountMessage'), title=$('#accountTitle'), subtitle=$('#accountSubtitle'), userLabel=$('#accountUsernameLabel'), passLabel=$('#accountPasswordLabel'), avatarLabel=$('#avatarLabel'), avatarHint=$('#avatarHint'), submit=$('#accountSubmit'), note=$('#accountNote'), preview=$('#accountPreview');
  let mode='login';
  function setMessage(text){message.textContent=text||'';}
  function updateHeader(){
    const a=currentAccount(), L=accountLabels();
    btnText.innerHTML=a?(esc(a.username)+(a.username.toLowerCase()==='firstsmile'?'<span class="verified-badge" title="مالک First Pack">★</span>':'')):L.login; setAvatar(btnAvatar,a?.avatar,a?.username);
  }
  function renderDashboard(a){
    if(!a)return;
    const key=getSession();
    let fav=[],dl=[];
    try{fav=JSON.parse(safeStorage.get(`fp:favorites:${key}`,'[]'))||[];dl=JSON.parse(safeStorage.get(`fp:downloads:${key}`,'[]'))||[];}catch{}
    const find=k=>items.find(x=>`${x.category}:${x.name}`===k);
    const favItems=fav.map(find).filter(Boolean), dlItems=dl.map(find).filter(Boolean);
    $('#profileFavCount').textContent=favItems.length; $('#profileDownloadCount').textContent=dlItems.length;
    const rated=items.reduce((n,x)=>n+(getStats(x).rated?1:0),0); $('#profileRatingCount').textContent=rated;
    const list=(arr,empty)=>arr.length?arr.slice(0,8).map(x=>`<div class="mini-item"><img src="${esc(x.image)}" alt=""><span>${esc(x.name)}</span></div>`).join(''):`<div class="mini-item">${empty}</div>`;
    $('#profileFavorites').innerHTML=list(favItems,'هنوز موردی ذخیره نشده است.'); $('#profileDownloads').innerHTML=list(dlItems,'هنوز دانلودی ثبت نشده است.');
  }
  function render(){
    const a=currentAccount(), L=accountLabels();
    title.textContent=a?L.title:L.title; subtitle.textContent=a?L.logged:L.subtitle;
    loginTab.textContent=L.login; registerTab.textContent=L.register; userLabel.textContent=L.username; passLabel.textContent=L.password; avatarLabel.textContent=L.avatar; avatarHint.textContent=L.avatarHint; note.textContent=L.note;
    if(a){
      form.hidden=true; profile.hidden=false; loginTab.hidden=true; registerTab.hidden=true; profileName.innerHTML=esc(a.username)+(a.username.toLowerCase()==='firstsmile'?'<span class="verified-badge" title="مالک First Pack">★</span>':''); profileStatus.textContent=L.logged; edit.textContent=L.edit; logout.textContent=L.logout; setAvatar(profileAvatar,a.avatar,a.username); setAvatar(preview,a.avatar,a.username); renderDashboard(a);
    }else{
      form.hidden=false; profile.hidden=true; loginTab.hidden=false; registerTab.hidden=false; loginTab.classList.toggle('active',mode==='login'); registerTab.classList.toggle('active',mode==='register'); avatarField.hidden=mode!=='register'; submit.textContent=mode==='login'?L.loginSubmit:L.registerSubmit; document.querySelector('#accountPassword')?.setAttribute('autocomplete',mode==='login'?'current-password':'new-password'); setAvatar(preview,null,'First Pack');
    }
    updateHeader();
    window.__fpCommunityRefresh?.();
  }
  function open(){render();setMessage('');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');setTimeout(()=>{if(!currentAccount())$('#accountUsername')?.focus();else close.focus();},0);}
  function shut(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}
  btn.addEventListener('click',open); close.addEventListener('click',shut); backdrop.addEventListener('click',shut);
  loginTab.addEventListener('click',()=>{mode='login';form.reset();setMessage('');render();}); registerTab.addEventListener('click',()=>{mode='register';form.reset();setMessage('');render();});
  avatarInput.addEventListener('change',()=>{const f=avatarInput.files?.[0]; if(!f){setAvatar(preview,null,'First Pack');return;} if(!f.type.startsWith('image/')||f.size>1.5*1024*1024){avatarInput.value='';setAvatar(preview,null,'First Pack');setMessage(accountLabels().invalidAvatar);return;} const r=new FileReader();r.onload=()=>setAvatar(preview,r.result,'profile');r.readAsDataURL(f);});
  form.addEventListener('submit',async e=>{
    e.preventDefault(); const L=accountLabels(), username=$('#accountUsername').value.trim(), password=$('#accountPassword').value;
    if(username.length<3){setMessage(L.shortUser);return;} if(password.length<6){setMessage(L.shortPass);return;}
    const accounts=getAccounts();
    if(mode==='login'){
      const key=username.toLowerCase(), a=accounts[key], hash=await accountHash(password);
      if(!a||a.passwordHash!==hash){setMessage(L.bad);return;} safeStorage.set(ACCOUNT_KEYS.session,key);setMessage('');render();showToast(state.lang==='fa'?`خوش آمدی ${a.username} 👋`:`Welcome ${a.username} 👋`);
    }else{
      const key=username.toLowerCase(); if(accounts[key]){setMessage(L.exists);return;}
      let avatar=''; const f=avatarInput.files?.[0]; if(f){if(!f.type.startsWith('image/')||f.size>1.5*1024*1024){setMessage(L.invalidAvatar);return;} avatar=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(f);});}
      accounts[key]={username,passwordHash:await accountHash(password),avatar,createdAt:new Date().toISOString()};saveAccounts(accounts);safeStorage.set(ACCOUNT_KEYS.session,key);setMessage('');render();showToast(L.created);
    }
  });
  edit.addEventListener('click',()=>{const a=currentAccount();if(!a)return; const picker=document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp,image/gif';picker.onchange=()=>{const f=picker.files?.[0];if(!f)return;if(!f.type.startsWith('image/')||f.size>1.5*1024*1024){setMessage(accountLabels().invalidAvatar);return;}const r=new FileReader();r.onload=()=>{const key=getSession(),accounts=getAccounts();if(accounts[key]){accounts[key].avatar=String(r.result);saveAccounts(accounts);render();showToast(accountLabels().saved);}};r.readAsDataURL(f);};picker.click();});
  logout.addEventListener('click',()=>{safeStorage.remove(ACCOUNT_KEYS.session);mode='login';render();showToast(state.lang==='fa'?'از حساب خارج شدی.':'You have been logged out.');});
  window.__fpAccountRefresh=()=>{render();window.__fpCommentsRefresh?.();}; window.__fpCurrentAccount=()=>currentAccount(); updateHeader();
}

// v25 community comments + lightweight moderation bot.
// Static hosting note: comments are local to the browser; a shared database/API is required for cross-device comments.
function initComments(){
  const form=$('#commentForm'); if(!form)return;
  const input=$('#commentInput'), list=$('#commentsList'), hint=$('#commentLoginHint'), author=$('#commentAuthor'), avatar=$('#commentAvatar'), submit=$('#commentSubmit');
  const key='fp:comments';
  const banned=['fuck','shit','bitch','asshole','idiot','stupid','کیر','کونی','کس','کسکش','حرومزاده','مادرجنده','فحش'];
  const moderate=t=>{
    let out=String(t||'');
    for(const word of banned){const re=new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');out=out.replace(re,'█'.repeat(Math.max(2,word.length)));}
    return out.replace(/\s{3,}/g,'  ').trim();
  };
  const load=()=>{try{return JSON.parse(safeStorage.get(key,'[]'))||[];}catch{return[];}};
  const save=v=>safeStorage.set(key,JSON.stringify(v.slice(-100)));
  const refresh=()=>{
    const a=currentAccount();
    if(a){author.innerHTML=esc(a.username)+(a.username.toLowerCase()==='firstsmile'?'<span class="verified-badge" title="مالک First Pack">★</span>':'');setAvatar(avatar,a.avatar,a.username);hint.textContent='کامنت شما با ربات امنیتی بررسی می‌شود.';submit.disabled=false;}
    else{author.textContent='مهمان';setAvatar(avatar,null,'?');hint.textContent='برای ارسال کامنت باید وارد حساب شوی.';submit.disabled=true;}
    const arr=load().slice().reverse();
    list.innerHTML=arr.length?arr.map(c=>`<article class="comment-item"><div class="account-avatar profile">${c.avatar?`<img src="${esc(c.avatar)}" alt="">`:esc((c.username||'?').slice(0,1).toUpperCase())}</div><div style="flex:1"><div class="comment-head"><strong>${esc(c.username)}</strong>${c.verified?'<span class="verified-badge" title="مالک First Pack">★</span>':''}<span class="comment-date">${new Date(c.at).toLocaleDateString('fa-IR')}</span></div><p class="comment-text">${esc(c.text)}</p></div></article>`).join(''):'<div class="empty"><strong>هنوز نظری ثبت نشده است.</strong><span>اولین نفر باش و نظر بده.</span></div>';
  };
  form.addEventListener('submit',e=>{
    e.preventDefault(); const a=currentAccount(); if(!a){showToast('ابتدا وارد حساب شو.');return;}
    const raw=input.value.trim(); if(!raw)return;
    const text=moderate(raw); const changed=text!==raw;
    const arr=load(); arr.push({username:a.username,avatar:a.avatar||'',verified:a.username.toLowerCase()==='firstsmile',text,at:new Date().toISOString()}); save(arr); input.value='';
    showToast(changed?'بعضی کلمات توسط ربات امنیتی فیلتر شد.':'کامنت ثبت شد.'); refresh();
  });
  refresh(); window.__fpCommentsRefresh=refresh;
}

// Community rating: logged-in account + mandatory stars + mandatory reason.
function initCommunityRating(){
  const form=$('#communityRatingForm'); if(!form)return;
  const user=$('#ratingUser'), result=$('#communityRatingResult'), server=$('#ratingServer'), reason=$('#ratingReason');
  const key='fp:server-ratings';
  function load(){try{return JSON.parse(safeStorage.get(key,'[]'))||[];}catch{return [];}}
  function save(v){safeStorage.set(key,JSON.stringify(v.slice(-500)));}
  function labels(){return state.lang==='fa'?{title:'⭐ امتیاز بده',text:'با اکانت خودت به سرور امتیاز بده و دلیل را هم بنویس.',user:'اکانت شما',choose:'ابتدا وارد حساب شو...',legend:'امتیاز شما',hint:'انتخاب ستاره و نوشتن دلیل اجباری است.',submit:'ثبت امتیاز و نظر',login:'برای امتیاز دادن ابتدا وارد حساب کاربری شو.',done:'نظر و امتیاز با موفقیت ثبت شد.',duplicate:'برای این سرور قبلاً امتیاز داده‌ای.'}:{title:'⭐ Rate a server',text:'Use your own account, choose stars and explain your rating.',user:'Your account',choose:'Log in first...',legend:'Your rating',hint:'Stars and a reason are required.',submit:'Submit rating & review',login:'Log in before rating a server.',done:'Rating and review submitted.',duplicate:'You already rated this server.'};}
  function refresh(){
    const l=labels(), a=currentAccount();
    $('#communityRatingTitle').textContent=l.title; $('#communityRatingText').textContent=l.text;
    document.querySelector('.star-picker legend').innerHTML=`${l.legend} <span>*</span>`; $('#ratingRequiredHint').textContent=l.hint; $('#communityRatingSubmit').textContent=l.submit;
    user.value=a?.username||''; user.placeholder=l.choose; user.disabled=!a;
    server.innerHTML='<option value="" selected disabled>'+ (state.lang==='fa'?'یک سرور را انتخاب کن...':'Choose a server...') +'</option>' + serverNames().map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
    const prev=load(); if(a && server.value){const old=prev.find(r=>r.userKey===a.username.toLowerCase()&&r.server===server.value); if(old){result.textContent=`${old.server} • ★ ${old.stars}/5`;}}
  }
  form.addEventListener('submit',e=>{
    e.preventDefault(); const l=labels(), a=currentAccount();
    if(!a){result.textContent=l.login; return;}
    const checked=form.querySelector('input[name="communityStars"]:checked'); const srv=server.value; const txt=reason.value.trim();
    if(!srv||!checked||!txt){form.reportValidity();result.textContent=state.lang==='fa'?'سرور، ستاره و دلیل را کامل کن.':'Complete the server, stars and reason fields.';return;}
    const arr=load(), userKey=a.username.toLowerCase();
    if(arr.some(r=>r.userKey===userKey&&r.server===srv)){result.textContent=l.duplicate;return;}
    const rec={user:a.username,userKey,avatar:a.avatar||'',verified:userKey==='firstsmile',server:srv,stars:Number(checked.value),reason:txt,at:new Date().toISOString()};
    arr.push(rec); save(arr); reason.value=''; form.querySelectorAll('input[name="communityStars"]').forEach(x=>x.checked=false); result.textContent=`${l.done} ${a.username} • ★ ${rec.stars}/5`; renderServerReviews();
  });
  refresh(); window.__fpCommunityRatingRefresh=refresh;
}

// Extra discovery features: daily pick, trending, rankings, achievements and news.
function itemScore(x){const s=getStats(x);return s.downloads*0.03+s.views*0.006+s.rating*500+s.ratings*2;}
function renderExtraSections(){
  if(!items.length)return;
  const day=Math.floor(Date.now()/86400000), pick=items[day%items.length];
  const daily=$('#dailyPick'); if(daily){daily.innerHTML=card(pick); bindCards(); bindImages();}
  const trend=$('#trendingGrid'); if(trend){trend.innerHTML=[...items].sort((a,b)=>itemScore(b)-itemScore(a)).slice(0,6).map(card).filter(Boolean).join('');}
  const rank=$('#rankingList'); if(rank){const top=[...items].sort((a,b)=>getStats(b).rating-getStats(a).rating||getStats(b).ratings-getStats(a).ratings).slice(0,8);rank.innerHTML=top.map((x,i)=>`<article class="rank-item"><b>#${i+1}</b><img src="${esc(x.image)}" alt=""><div><strong>${esc(x.name)}</strong><span>${esc(labels[state.lang][x.category]||x.category)} · ★ ${getStats(x).rating.toFixed(1)}</span></div></article>`).join('');}
  const news=$('#newsList'); if(news){const newsFa=[['🧱','راهنمای انتخاب Resource Pack برای BedWars','بین FPS، وضوح، اندازه و سبک ظاهری انتخاب کن.'],['⚡','بهینه‌سازی Minecraft Java','مودهای سبک و تنظیمات درست می‌توانند تجربه روان‌تری بسازند.'],['🌟','پیشنهاد امروز First Pack','هر روز یک ریسورس منتخب را سریع‌تر پیدا کن.']]; const newsEn=[['🧱','How to choose a BedWars pack','Compare FPS, resolution, clarity and style.'],['⚡','Minecraft Java optimization','Lightweight mods and sensible settings can improve your experience.'],['🌟','First Pack daily pick','A new featured resource rotates every day.']]; const a=state.lang==='fa'?newsFa:newsEn; news.innerHTML=a.map(n=>`<article class="news-item"><b>${n[0]}</b><div><strong>${n[1]}</strong><p>${n[2]}</p></div></article>`).join('');}
  const ach=$('#achievementList'); if(ach){const a=currentAccount(); let fav=0,dl=0; if(a){try{fav=JSON.parse(safeStorage.get(`fp:favorites:${getSession()}`,'[]')).length;dl=JSON.parse(safeStorage.get(`fp:downloads:${getSession()}`,'[]')).length;}catch{}} const ratings=a?loadServerRatingsFor(a.username):[]; const vals=[['🌱','اولین ورود',!!a],['❤️','اولین علاقه‌مندی',fav>=1],['⬇️','اولین دانلود',dl>=1],['⭐','اولین امتیاز سرور',ratings.length>=1],['🔥','۵ علاقه‌مندی',fav>=5],['🏆','۳ امتیاز سرور',ratings.length>=3]]; ach.innerHTML=vals.map(v=>`<div class="achievement ${v[2]?'unlocked':''}"><b>${v[0]}</b><span>${v[1]}</span>${v[2]?'<small>باز شده ✓</small>':'<small>قفل</small>'}</div>`).join('');}
}
function loadServerRatingsFor(username){try{return loadServerReviews().filter(r=>String(r.userKey||r.user||'').toLowerCase()===String(username||'').toLowerCase());}catch{return [];}}



initAssistant(); initAccounts(); initCommunityRating(); initComments();
if(safeStorage.get(STORAGE.dark)==='1')document.body.classList.add('dark');
updateThemeColor(); applyStaticText();
fetch('data.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
.then(d=>{
  if(!Array.isArray(d))throw new Error('Invalid data');
  const valid=d.filter(x=>x&&x.name&&x.category&&x.url&&x.image);
  items=valid.map((x,i)=>enrich(x,i,valid.length));
  render(); window.__fpAccountRefresh?.(); window.__fpCommentsRefresh?.(); renderExtraSections();
  // Replace placeholder artwork with real Modrinth project/gallery images
  // and convert search links into the exact project page when available.
  hydrateModrinthResources();
})
.catch(err=>{
  console.error(err); const L=labels[state.lang]; $('#count').textContent=L.loadError;
  $('#catalog').innerHTML=`<div class="empty"><strong>${esc(L.loadError)}</strong><span>${esc(L.emptySub)}</span></div>`;
});
})();


function loadServerReviews(){try{return JSON.parse(safeStorage.get(STORAGE.serverReviews,'[]'))||[];}catch{return [];}}
function saveServerReviews(a){safeStorage.set(STORAGE.serverReviews,JSON.stringify(a));}
function serverNames(){return [...document.querySelectorAll('#serverCarousel .server-card h3')].map(x=>x.textContent.trim());}
function renderServerReviews(){
  const root=$('#serverReviewsList'); if(!root)return;
  const arr=loadServerReviews();
  if(!arr.length){root.innerHTML='<div class="comments-empty">هنوز نظری ثبت نشده است.</div>';return;}
  root.innerHTML=arr.map(r=>`<article class="review-card"><div class="comment-head"><strong>${esc(r.user)}${String(r.user).toLowerCase()==='firstsmile'?'<span class="verified-badge">★</span>':''}</strong><span class="review-server">${esc(r.server)}</span><span class="review-stars">★ ${r.stars}/5</span></div><p>${esc(r.reason)}</p></article>`).join('');
  initReviewCarousel();
}
function initReviewCarousel(){
  const root=$('#serverReviewsList'); if(!root||root.dataset.carousel==='1')return;
  root.dataset.carousel='1'; const cards=[...root.querySelectorAll('.review-card')]; if(cards.length<2)return;
  let i=0,timer; const step=()=>{i=(i+1)%cards.length;root.scrollTo({left:cards[i].offsetLeft,behavior:'smooth'});};
  timer=setInterval(step,4500); root.addEventListener('mouseenter',()=>clearInterval(timer)); root.addEventListener('mouseleave',()=>timer=setInterval(step,4500));
}
function initServerCarousel(){
  const root=$('#serverCarousel'); if(!root)return;
  const track=root.querySelector('.server-track'), cards=[...root.querySelectorAll('.server-card')];
  const prev=root.querySelector('[data-server-prev]'), next=root.querySelector('[data-server-next]'), dots=root.querySelector('.server-dots');
  if(!track||!cards.length)return;
  let index=0, timer=null, paused=false;
  const visible=()=>window.innerWidth<=700?1:window.innerWidth<=1050?2:3;
  function maxIndex(){return Math.max(0,cards.length-visible());}
  function renderDots(){
    const count=maxIndex()+1; dots.innerHTML='';
    for(let i=0;i<count;i++){const b=document.createElement('button');b.type='button';b.className='server-dot'+(i===index?' active':'');b.setAttribute('aria-label',`${state.lang==='fa'?'نمایش سرورهای '+(i+1):'Show server group '+(i+1)}`);b.addEventListener('click',()=>{index=i;update();restart();});dots.appendChild(b);}
  }
  function update(){
    index=Math.min(index,maxIndex());
    const gap=20, width=cards[0].getBoundingClientRect().width;
    track.style.transform=`translateX(-${(index*(width+gap))}px)`;
    [...dots.children].forEach((d,i)=>d.classList.toggle('active',i===index));
    if(prev)prev.disabled=index===0;
    if(next)next.disabled=index===maxIndex();
  }
  function move(dir){index=Math.max(0,Math.min(maxIndex(),index+dir));update();restart();}
  function restart(){clearInterval(timer);timer=setInterval(()=>{if(!paused){index=index>=maxIndex()?0:index+1;update();}},4500);}
  prev?.addEventListener('click',()=>move(-1)); next?.addEventListener('click',()=>move(1));
  root.addEventListener('mouseenter',()=>paused=true); root.addEventListener('mouseleave',()=>paused=false);
  root.addEventListener('focusin',()=>paused=true); root.addEventListener('focusout',()=>paused=false);
  window.addEventListener('resize',()=>{renderDots();update();});
  renderDots();update();restart();
}


document.addEventListener('click',e=>{
  const b=e.target.closest('[data-server-rate]'); if(!b)return;
  const a=currentAccount(); if(!a){showToast('ابتدا وارد حساب کاربری شو.'); document.querySelector('#accountBtn')?.click(); return;}
  document.querySelector('#communityRating')?.scrollIntoView({behavior:'smooth',block:'start'});
  const sel=document.querySelector('#ratingServer'); if(sel){sel.value=b.dataset.serverRate;}
});
document.addEventListener('DOMContentLoaded',()=>initServerCarousel());
