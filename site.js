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