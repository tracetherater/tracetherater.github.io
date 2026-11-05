/* Render a safe public snapshot; API tokens never reach the visitor's browser. */
(()=>{
'use strict';
const root=document.querySelector('[data-instagram-feed]');
if(!root)return;
const grid=root.querySelector('.ttr-instagram-grid');
const status=root.querySelector('.ttr-instagram-status');
const urlOrNull=value=>{
  if(typeof value!=='string')return null;
  try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}
};
function render(post){
  if(!post || typeof post!=='object')return null;
  const href=urlOrNull(post.permalink);
  if(!href || !/^https:\/\/(?:www\.)?instagram\.com\//i.test(href))return null;
  const card=document.createElement('article');card.className='ttr-instagram-card';
  const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener noreferrer';
  link.setAttribute('aria-label','Open Trace The Rater Instagram post');
  const media=document.createElement('div');media.className='ttr-instagram-media';
  const url=urlOrNull(post.thumbnailUrl)||urlOrNull(post.mediaUrl);
  if(url){
    const img=document.createElement('img');img.src=url;img.loading='lazy';img.decoding='async';
    img.alt=(typeof post.caption==='string'&&post.caption.trim()?post.caption.slice(0,120):'Instagram post by Trace The Rater');
    img.addEventListener('error',()=>{img.remove();const fallback=document.createElement('span');fallback.textContent='View post on Instagram';media.prepend(fallback);},{once:true});
    media.append(img);
  }else{
    const fallback=document.createElement('span');fallback.textContent='View post on Instagram';media.append(fallback);
  }
  if(post.mediaType==='VIDEO'||post.mediaType==='CAROUSEL_ALBUM'){
    const tag=document.createElement('div');tag.className='ttr-instagram-type';
    tag.textContent=post.mediaType==='VIDEO'?'Reel / video':'Multiple photos';
    media.append(tag);
  }
  const info=document.createElement('div');info.className='ttr-instagram-copy';
  const caption=document.createElement('p');caption.textContent=typeof post.caption==='string'&&post.caption.trim()?post.caption.trim().slice(0,180):'See this post on Instagram';
  info.append(caption);
  if(typeof post.timestamp==='string'&&!Number.isNaN(Date.parse(post.timestamp))){
    const time=document.createElement('time');time.dateTime=post.timestamp;
    time.textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(post.timestamp));
    info.append(time);
  }
  link.append(media,info);card.append(link);
  return card;
}
fetch('/data/instagram-posts.json',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw Error('Instagram data unavailable');return r.json();})
  .then(data=>{
    if(!data||!Array.isArray(data.posts))throw Error('Invalid Instagram data');
    const cards=data.posts.slice(0,6).map(render).filter(Boolean);
    grid.replaceChildren(...cards);
    status.textContent=cards.length?'':'Instagram posts will appear here once the account is connected.';
    status.hidden=cards.length>0;
  })
  .catch(()=>{status.textContent='Instagram previews are temporarily unavailable. Open @tracetherater on Instagram to see the latest.';});
})();
