/* Static-hosted engagement: local likes, public GitHub comments, device sharing. */
(()=>{
'use strict';
const article=document.querySelector('main article.article');
if(!article)return;
const title=article.querySelector('h1')?.textContent.trim()||document.title;
const url=document.querySelector('link[rel="canonical"]')?.href||location.origin+location.pathname;
const slug=new URL(url).pathname;
const key='ttr-like:'+slug;
const box=document.createElement('section');
box.className='article-actions';box.setAttribute('aria-label','Article reactions and sharing');
box.innerHTML='<h2>Join the conversation</h2><div class="article-action-buttons"><button type="button" data-like aria-pressed="false">♡ Like</button><button type="button" data-comment aria-expanded="false" aria-controls="article-comments">Comment</button><button type="button" data-share>Share</button></div><p class="article-action-note">Likes are saved only in this browser, not counted publicly. Comments are public on GitHub; a GitHub account is required to post.</p><p role="status" aria-live="polite"></p><div id="article-comments" hidden><h3>Article comments on GitHub</h3><p>Read existing conversations or start one for this article. Please keep comments respectful and avoid sharing private information.</p><p><a data-read-comments>Read comments</a> · <a data-write-comment>Leave a comment on GitHub</a></p></div><div data-share-fallback hidden><label for="article-share-url">Article link</label><input id="article-share-url" type="url" readonly><button type="button" data-copy>Copy link</button><a data-email>Share by email</a></div>';
article.append(box);
const like=box.querySelector('[data-like]'),status=box.querySelector('[role="status"]');
function render(liked){like.setAttribute('aria-pressed',String(liked));like.textContent=liked?'♥ Liked on this device':'♡ Like';}
try{render(localStorage.getItem(key)==='1');}catch{/* A click explains unavailable storage. */}
like.addEventListener('click',()=>{
 const liked=like.getAttribute('aria-pressed')!=='true';
 try{localStorage.setItem(key,liked?'1':'0');render(liked);status.textContent=liked?'Liked in this browser.':'Like removed from this browser.';}
 catch{status.textContent='Your browser cannot save likes. Allow site storage to use this feature.';}
});
const comments=box.querySelector('#article-comments'),comment=box.querySelector('[data-comment]');
comment.addEventListener('click',()=>{comments.hidden=!comments.hidden;comment.setAttribute('aria-expanded',String(!comments.hidden));});
const repo='https://github.com/tracetherater/tracetherater.github.io/issues';
box.querySelector('[data-read-comments]').href=repo+'?q='+encodeURIComponent('is:issue "Article: '+slug+'" in:title');
box.querySelector('[data-write-comment]').href=repo+'/new?title='+encodeURIComponent('Article: '+slug)+'&body='+encodeURIComponent('Comment on ['+title+']('+url+')\n\nMy thoughts:\n');
const fallback=box.querySelector('[data-share-fallback]'),input=box.querySelector('#article-share-url');input.value=url;
box.querySelector('[data-email]').href='mailto:?subject='+encodeURIComponent(title)+'&body='+encodeURIComponent(url);
function showFallback(){fallback.hidden=false;input.focus();input.select();status.textContent='Copy the article link or share by email.';}
box.querySelector('[data-share]').addEventListener('click',async()=>{
 if(typeof navigator.share==='function'){
  try{await navigator.share({title,url});status.textContent='Share menu opened.';return;}
  catch(error){if(error.name==='AbortError'){status.textContent='Sharing canceled.';return;}}
 }
 showFallback();
});
box.querySelector('[data-copy]').addEventListener('click',async()=>{
 try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(url);status.textContent='Article link copied.';}
 catch{input.focus();input.select();status.textContent='Select and copy the link using your browser’s Copy command.';}
});
})();
