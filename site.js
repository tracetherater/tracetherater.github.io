/* Keep Favorites reachable from pages with the shared navigation. */
document.querySelectorAll('.ttr-nav, .ttr-footer nav').forEach(nav=>{
  if(nav.querySelector('a[href="favorites.html"]'))return;
  const link=document.createElement('a');
  link.href='favorites.html';link.textContent='Favorites';
  if(location.pathname.endsWith('/favorites.html'))link.setAttribute('aria-current','page');
  const about=nav.querySelector('a[href="about.html"]');
  if(about)about.after(link);else nav.append(link);
});
(()=>{'use strict';const bar=document.getElementById('site-bar');if(!bar)return;const button=bar.querySelector('button');const menu=document.getElementById('site-menu');const close=()=>{menu.hidden=true;button.setAttribute('aria-expanded','false');};close();bar.classList.add('enhanced');button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));menu.hidden=!open;});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){close();button.focus();}});document.addEventListener('click',e=>{if(!bar.contains(e.target))close();});bar.addEventListener('focusout',()=>{setTimeout(()=>{if(!bar.contains(document.activeElement))close();},0);});menu.addEventListener('click',e=>{if(e.target.closest('a'))close();});})();

/* Site-wide search: discover published pages and search their main content. */
(()=>{
'use strict';
const bar=document.getElementById('site-bar');
if(!bar || document.getElementById('ttr-search'))return;
const style=document.createElement('style');
style.textContent=`
.ttr-search{max-width:1100px;margin:0 auto;padding:12px 24px;color:#172332;border-top:1px solid #eef2f6}
.ttr-search form{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.ttr-search label{font-weight:750}.ttr-search input{flex:1 1 220px;min-width:0;min-height:44px;padding:10px 14px;border:1px solid #8896a6;border-radius:10px;background:#fff;color:#172332;font:inherit}
.ttr-search button{min-height:44px;padding:10px 18px;border:0;border-radius:10px;background:#075a97;color:white;font:700 16px system-ui;cursor:pointer}
.ttr-search input:focus-visible{outline:3px solid #075a97;outline-offset:3px}
.ttr-search-results{margin-top:14px;padding:20px;background:#fff;border:1px solid #dce2e9;border-radius:16px}
.ttr-search-results ul{padding-left:22px;margin:0}.ttr-search-results li{margin:16px 0}.ttr-search-results a{font-weight:750}
.ttr-search-results p{margin:6px 0 0}.ttr-search-status{margin:10px 0;font-size:.95rem}
@media(max-width:600px){.ttr-search{padding:12px 18px}.ttr-search label{flex-basis:100%}}
`;
document.head.append(style);
const region=document.createElement('section');
region.className='ttr-search';region.id='ttr-search';region.setAttribute('aria-label','Website search');
region.innerHTML='<form role="search"><label for="ttr-search-query">Search the website</label><input id="ttr-search-query" type="search" maxlength="150" placeholder="Shows, music, articles…" autocomplete="off" aria-controls="ttr-search-results"><button type="submit">Search</button></form><p class="ttr-search-status" role="status" aria-live="polite"></p><div class="ttr-search-results" id="ttr-search-results" hidden></div>';
bar.append(region);
const form=region.querySelector('form'),input=region.querySelector('input'),status=region.querySelector('[role="status"]'),results=region.querySelector('.ttr-search-results');
const normalize=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const pageURL=value=>{
try{const u=new URL(value,location.origin);if(u.origin!==location.origin || !(u.pathname==='/' || /\.html$/i.test(u.pathname)))return null;u.search='';u.hash='';if(u.pathname==='/index.html')u.pathname='/';return u.href;}catch{return null;}
};
let indexPromise,serial=0;
async function buildIndex(){
const urls=new Set(['/', '/articles.html','/favorites.html','/ranking-music-genres.html'].map(pageURL));
let failed=0;const pages=[];
try{
const response=await fetch('/sitemap.xml');if(!response.ok)throw Error();
const xml=new DOMParser().parseFromString(await response.text(),'application/xml');
for(const loc of xml.getElementsByTagName('loc')){const url=pageURL(loc.textContent);if(url)urls.add(url);}
}catch{/* The home and article links also provide discovery. */}
const queue=[...urls];const visited=new Set();
async function worker(){
while(queue.length && visited.size<100){
const url=queue.shift();if(visited.has(url))continue;visited.add(url);
try{
const response=await fetch(url);if(!response.ok)throw Error();
const doc=new DOMParser().parseFromString(await response.text(),'text/html');
const main=doc.querySelector('main') || doc.querySelector('article');if(!main)continue;
for(const a of main.querySelectorAll('a[href]')){
const linked=pageURL(new URL(a.getAttribute('href'),url).href);
if(linked&&!urls.has(linked)&&urls.size<100){urls.add(linked);queue.push(linked);}
}
main.querySelectorAll('script,style,nav,form,button,[hidden]').forEach(node=>node.remove());
const text=main.textContent.replace(/\s+/g,' ').trim();
const title=(doc.querySelector('h1')?.textContent || doc.title).trim();
const description=doc.querySelector('meta[name="description"]')?.content || text.slice(0,180);
pages.push({url,title,description,text:normalize(title+' '+description+' '+text),titleKey:normalize(title)});
}catch{failed++;}
}
}
await Promise.all([worker(),worker(),worker(),worker()]);
if(!pages.length)throw Error('No pages available');
return {pages,failed};
}
async function search(){
const current=++serial;const query=input.value.trim();results.replaceChildren();results.hidden=true;
if(query.length<2){status.textContent=query?'Enter at least two characters to search.':'';return;}
const terms=normalize(query).split(' ').filter(Boolean);
if(!terms.length){status.textContent='Try a word, title, or topic.';return;}
status.textContent='Searching…';
try{
if(!indexPromise)indexPromise=buildIndex().catch(error=>{indexPromise=null;throw error;});
const {pages,failed}=await indexPromise;if(current!==serial)return;
const matches=pages.filter(p=>terms.every(t=>p.text.includes(t))).sort((a,b)=>terms.filter(t=>b.titleKey.includes(t)).length-terms.filter(t=>a.titleKey.includes(t)).length || a.title.localeCompare(b.title));
status.textContent=(matches.length ? matches.length+' matching '+(matches.length===1?'page':'pages')+(matches.length>12?' — showing the first 12':'')+'.':'No results. Try another title or topic.')+(failed?' Some pages could not be searched.':'');
if(matches.length){
const ul=document.createElement('ul');
for(const page of matches.slice(0,12)){const li=document.createElement('li'),a=document.createElement('a'),p=document.createElement('p');a.href=page.url;a.textContent=page.title;p.textContent=page.description;li.append(a,p);ul.append(li);}
results.append(ul);results.hidden=false;
}
}catch{if(current===serial)status.textContent='Search is temporarily unavailable. Please try again or browse Articles from the menu.';}
}
let timer;
input.addEventListener('input',()=>{clearTimeout(timer);serial++;timer=setTimeout(search,250);});
form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);search();});
})();

/* Render the posts refreshed by the scheduled GitHub Actions workflow. */
(()=>{
'use strict';
const list=document.querySelector('.ttr-latest-posts-list');
const status=document.querySelector('.ttr-latest-posts-status');
if(!list||!status)return;

function safeUrl(value){
try{
const url=new URL(value,location.origin);
return url.protocol==='https:'||url.protocol==='http:'?url:null;
}catch{return null;}
}

function renderPost(post){
if(!post||typeof post.title!=='string'||typeof post.source!=='string')return null;
const url=safeUrl(post.url);
if(!url)return null;

const item=document.createElement('li');
const card=document.createElement('article');
const link=document.createElement('a');
const source=document.createElement('p');
const title=document.createElement('strong');
card.className='card';
link.href=url.href;
link.target='_blank';
link.rel='noopener noreferrer';
title.textContent=post.title;
link.append(title);
source.className='ttr-latest-post-source';
source.textContent=post.source;
card.append(source,link);

if(typeof post.summary==='string'&&post.summary){
const summary=document.createElement('p');
summary.textContent=post.summary;
card.append(summary);
}
if(typeof post.publishedAt==='string'&&post.publishedAt){
const timestamp=Date.parse(post.publishedAt);
if(!Number.isNaN(timestamp)){
const time=document.createElement('time');
time.className='ttr-latest-post-date';
time.dateTime=post.publishedAt;
const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(post.publishedAt);
const displayDate=dateOnly?new Date(...post.publishedAt.split('-').map(Number).map((value,index)=>index===1?value-1:value)):new Date(timestamp);
time.textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(displayDate);
card.append(time);
}
}
item.append(card);
return item;
}

fetch('/data/latest-posts.json',{cache:'no-store'})
.then(response=>{
if(!response.ok)throw new Error(`HTTP ${response.status}`);
return response.json();
})
.then(data=>{
if(!data||!Array.isArray(data.posts))throw new Error('Invalid recent-posts data');
const items=data.posts.map(renderPost).filter(Boolean);
list.replaceChildren(...items);
status.textContent=items.length?'Recent posts from Trace The Rater’s channels.':'No recent posts are available right now.';
})
.catch(error=>{
console.error('Could not load recent posts:',error);
status.textContent='Recent posts could not be loaded. Please use the social links below.';
});
})();

/* Accessible manual carousel for the homepage highlights. */
(()=>{
'use strict';
const carousel=document.querySelector('.ttr-highlights');
if(!carousel)return;
const slides=[...carousel.querySelectorAll('.ttr-highlight-slide')];
const controls=carousel.querySelector('.ttr-highlight-controls');
const pagination=carousel.querySelector('.ttr-highlight-pagination');
const previous=carousel.querySelector('.ttr-highlight-previous');
const next=carousel.querySelector('.ttr-highlight-next');
const status=carousel.querySelector('.ttr-highlight-status');
if(slides.length<2||!controls||!pagination||!previous||!next||!status)return;
let current=0;
const buttons=slides.map((slide,index)=>{
const button=document.createElement('button');
button.type='button';
button.setAttribute('aria-label',`Show highlight ${index+1}: ${slide.querySelector('h3').textContent.trim()}`);
button.setAttribute('aria-current',String(index===current));
button.addEventListener('click',()=>show(index));
pagination.append(button);
return button;
});
function show(index,announce=true){
current=(index+slides.length)%slides.length;
slides.forEach((slide,slideIndex)=>{
const active=slideIndex===current;
slide.hidden=!active;
buttons[slideIndex].setAttribute('aria-current',String(active));
});
if(announce)status.textContent=`Highlight ${current+1} of ${slides.length}: ${slides[current].querySelector('h3').textContent.trim()}`;
}
previous.addEventListener('click',()=>show(current-1));
next.addEventListener('click',()=>show(current+1));
carousel.classList.add('is-ready');
controls.hidden=false;
show(current,false);
})();
