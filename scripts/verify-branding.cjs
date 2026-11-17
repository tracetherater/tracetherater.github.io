const fs=require('fs');
const path=require('path');
const http=require('http');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{const p=path.join(root,new URL(req.url,'http://localhost').pathname==='/'?'index.html':new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root)||!fs.existsSync(p)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 // Exclude third-party embeds and analytics from this branding-only preview.
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
 const results=[];
 const contrast=(a,b)=>{const luminance=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for(const theme of ['blue','yellow','white','black']){
   await page.selectOption('#ttr-theme',theme);
   await page.locator('.ttr-banner img').evaluate(i=>i.decode());
   await page.locator('.ttr-home img').evaluate(i=>i.decode());
   const state=await page.evaluate(()=>({theme:document.documentElement.dataset.ttrTheme,overflow:document.documentElement.scrollWidth>innerWidth,description:{color:getComputedStyle(document.querySelector('.ttr-banner p')).color,background:getComputedStyle(document.querySelector('.ttr-banner'),'::before').backgroundColor},logos:[...document.querySelectorAll('.ttr-banner img,.ttr-home img')].map(i=>({src:i.currentSrc,loaded:i.complete&&i.naturalWidth>0,width:i.width,height:i.height,backing:getComputedStyle(i.closest('a')).backgroundColor}))}));
   if(state.overflow||state.logos.some(i=>!i.loaded))throw Error(JSON.stringify(state));
   if(!state.logos[0].src.endsWith(width<=600?'trace-logo-vertical.png':'trace-logo-horizontal.png'))throw Error('Incorrect responsive logo');
   if(state.logos.some(i=>i.backing!=='rgb(255, 255, 255)'))throw Error('Logo needs a white backing');
   if(contrast(state.description.color,state.description.background)<4.5)throw Error('Banner description contrast');
   results.push({width,...state});
   if([390,1440].includes(width)&&['blue','black'].includes(theme))await page.screenshot({path:path.join(__dirname,`preview-${width}-${theme}.png`)});
  }
  await page.reload();
  if(await page.locator('html').getAttribute('data-ttr-theme')!=='black')throw Error('Theme did not persist');
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  if(!await page.locator('#site-menu').isVisible())throw Error('Menu did not open');
  await page.keyboard.press('Escape');
  if(await page.locator('#site-menu').isVisible())throw Error('Menu did not close');
 }
 // Every edited public page must load its branding from HTML with JavaScript off.
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
 const fallback=await nojs.newPage();
 await fallback.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
  await fallback.goto(`http://127.0.0.1:${server.address().port}/${file}`);
  if(await fallback.locator('.ttr-banner img').count()){
   await fallback.locator('.ttr-banner img').evaluate(i=>i.decode());
   if(!(await fallback.locator('.ttr-banner img').getAttribute('alt')).includes('Lifestyle Journalism'))throw Error(file);
  }
 }
 fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(results,null,2));
 console.log(`Passed ${results.length} viewport/theme combinations, persistent themes, menu keyboard interaction, and ${fs.readdirSync(root).filter(f=>f.endsWith('.html')).length} no-JavaScript page branding checks.`);
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
