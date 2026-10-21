/* Public configuration only. Never put credentials or report data here. */
(()=>{"use strict";
const MEASUREMENT_ID=""; // Set the site's GA4 G-… ID after creating a free Standard property.
if(!/^G-[A-Z0-9]+$/.test(MEASUREMENT_ID))return;
if(navigator.globalPrivacyControl===true||navigator.doNotTrack==="1")return;
let consent;try{consent=localStorage.getItem("ttr-analytics-consent")}catch{return}
function enable(){window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};
gtag("js",new Date());gtag("config",MEASUREMENT_ID,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
const s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+MEASUREMENT_ID;document.head.append(s);
gtag("event","page_view",{page_location:location.origin+location.pathname,page_title:document.title,page_referrer:document.referrer?new URL(document.referrer).origin:""});
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a[href]");if(!a)return;const u=new URL(a.href,location.href);if(!/^https?:$/.test(u.protocol))return;
const hosts={"facebook.com":"Facebook","instagram.com":"Instagram","youtube.com":"YouTube","youtu.be":"YouTube","tiktok.com":"TikTok","reddit.com":"Reddit","substack.com":"Substack","linkedin.com":"LinkedIn","x.com":"X","albumoftheyear.org":"Album of the Year","boxd.it":"Letterboxd","letterboxd.com":"Letterboxd","discord.gg":"Discord","t.me":"Telegram"};const host=(u.hostname.startsWith("www.")?u.hostname.slice(4):u.hostname);const platform=Object.entries(hosts).find(([domain])=>host===domain||host.endsWith("."+domain));if(u.origin!==location.origin&&platform)gtag("event","social_outbound",{platform:platform[1],destination_host:u.hostname,source_page:location.pathname});
else if(/\.pdf$/i.test(u.pathname))gtag("event","business_plan_pdf_click",{file_path:u.pathname,source_page:location.pathname});});
}
if(consent==="granted"){enable();return}if(consent==="denied")return;
const box=document.createElement("aside");box.setAttribute("aria-label","Optional website analytics");box.style.cssText="position:fixed;bottom:16px;left:16px;right:16px;z-index:1000;background:#fff;color:#182c38;border:2px solid #183e50;border-radius:10px;padding:18px;box-shadow:0 4px 24px #0003;font:16px/1.5 system-ui";
box.innerHTML='<p style="margin:0 0 12px">Allow optional Google Analytics to help improve this website? This measures page visits, social-link clicks and PDF-link clicks. <a href="/privacy.html">Privacy details</a></p>';
for(const [label,value] of [["Allow analytics","granted"],["No thanks","denied"]]){const b=document.createElement("button");b.textContent=label;b.style.cssText="padding:10px 16px;margin:0 12px 4px 0;cursor:pointer";b.onclick=()=>{try{localStorage.setItem("ttr-analytics-consent",value)}catch{}box.remove();if(value==="granted")enable()};box.append(b)}document.body.append(box);
})();