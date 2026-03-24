/**
 * WhatsApp Chat Widget — Master Storefront Script
 * Handles: Floating, Product Page, Inline, Order Confirmation, Announcement Bar
 */
(function(){
'use strict';
var S=document.currentScript?document.currentScript.src:'',H=S.replace(/\/widget\.js.*$/,''),
SH=window.Shopify&&window.Shopify.shop?window.Shopify.shop:'',
WP='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
R={};

function svg(w,c){return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+w+'" viewBox="0 0 24 24" fill="'+(c||'#fff')+'"><path d="'+WP+'"/></svg>';}
function cp(p){return(p||'').replace(/[^0-9]/g,'');}
function pn(){var m=document.querySelector('meta[property="og:title"]');if(m)return m.content;var h=document.querySelector('h1');return h?h.textContent.trim():document.title;}
function pp(){var m=document.querySelector('meta[property="product:price:amount"]');return m?m.content:'';}
function vn(){var s=document.querySelector('select[name="id"]');return s&&s.options[s.selectedIndex]?s.options[s.selectedIndex].text:'';}
function on(){if(window.Shopify&&window.Shopify.checkout)return window.Shopify.checkout.order_id||'';var e=document.querySelector('.os-order-number');return e?e.textContent.replace(/[^0-9]/g,''):'';}
function rv(t){return(t||'').replace(/\{\{product_name\}\}/g,pn()).replace(/\{\{product_url\}\}/g,location.href).replace(/\{\{variant_name\}\}/g,vn()).replace(/\{\{price\}\}/g,pp()).replace(/\{\{order_number\}\}/g,on()).replace(/\{\{shop_name\}\}/g,SH);}
function wu(ph,msg){return'https://wa.me/'+cp(ph)+'?text='+encodeURIComponent(rv(msg));}
function tc(id){try{navigator.sendBeacon(H+'/api/click',JSON.stringify({placementId:id,pageUrl:location.href,shop:SH}));}catch(e){}}
function ip(t){if(!t||t.showOn==='all'||!t.showOn)return true;var p=t.pages||{},l=location.pathname;if(p.homepage&&(l==='/'||l===''))return true;if(p.product&&/\/products\//.test(l))return true;if(p.collection&&/\/collections\//.test(l))return true;if(p.cart&&/\/cart/.test(l))return true;return false;}
function is(sc){if(!sc||!sc.enabled)return true;var d=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],n=new Date(),dc=sc.days&&sc.days[d[n.getDay()]];if(!dc||!dc.enabled)return false;var cm=n.getHours()*60+n.getMinutes(),ss=(dc.start||'09:00').split(':'),se=(dc.end||'17:00').split(':');return cm>=ss[0]*60+ +ss[1]&&cm<=se[0]*60+ +se[1];}

function addCSS(){var s=document.createElement('style');s.textContent='@keyframes wa-pulse{0%{box-shadow:0 0 0 0 rgba(37,211,102,.5)}70%{box-shadow:0 0 0 14px rgba(37,211,102,0)}to{box-shadow:0 0 0 0 rgba(37,211,102,0)}}@keyframes wa-bounce{0%,to{transform:translateY(0)}50%{transform:translateY(-6px)}}.wa-fb{position:fixed;z-index:99999;cursor:pointer;border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.3);transition:transform .2s}.wa-fb:hover{transform:scale(1.1)}.wa-tt{position:absolute;white-space:nowrap;background:#222;color:#fff;padding:6px 12px;border-radius:6px;font-size:13px;font-family:sans-serif;pointer-events:none;opacity:0;transition:opacity .2s;bottom:110%}.wa-fb:hover .wa-tt{opacity:1}.wa-pb{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:8px;font-family:sans-serif;font-size:15px;font-weight:600;text-decoration:none;transition:opacity .2s;cursor:pointer;border:none;margin:8px 0;width:100%;justify-content:center}.wa-pb:hover{opacity:.85}.wa-bar{position:fixed;top:0;left:0;right:0;z-index:99998;display:flex;align-items:center;justify-content:center;gap:10px;padding:10px 40px;font-family:sans-serif;font-size:14px;font-weight:500;transition:transform .3s}.wa-bar a{color:inherit;text-decoration:underline;font-weight:600}.wa-bx{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:inherit;font-size:20px;cursor:pointer;opacity:.7;padding:4px 8px}.wa-bx:hover{opacity:1}.wa-ob{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:8px;font-family:sans-serif;font-size:15px;font-weight:600;cursor:pointer;border:none;margin:16px 0;text-decoration:none}.wa-ob:hover{opacity:.85}.wa-bg{font-size:10px;color:#999;text-align:center;margin-top:4px;font-family:sans-serif}';document.head.appendChild(s);}

function rFloat(p,sc){
  if(R['f'+p.id])return;var s=p.styleConfig||{};
  if(!ip(p.pageTargeting)||!is(p.scheduleConfig))return;
  var sz={small:48,medium:60,large:72},si=sz[s.size]||60,ic=Math.round(si*.5),
  pos=s.position||'bottom-right',bo=(s.bottomOffset||20)+'px',so=(s.sideOffset||20)+'px',
  bg=s.bgColor||sc.brandColor||'#25D366',
  an=s.animation==='pulse'?'wa-pulse 2s infinite':(s.animation==='bounce'?'wa-bounce 2s infinite':'none');
  var b=document.createElement('button');b.className='wa-fb';
  b.style.cssText='width:'+si+'px;height:'+si+'px;background:'+bg+';bottom:'+bo+';'+(pos==='bottom-left'?'left':'right')+':'+so+';animation:'+an;
  b.innerHTML=svg(ic,'#fff')+(s.tooltipText?'<span class="wa-tt">'+s.tooltipText+'</span>':'');
  b.onclick=function(){tc(p.id);window.open(wu(p.phoneNumber||sc.defaultPhone,p.welcomeMessage),'_blank');};
  if(sc.plan==='free'){var w=document.createElement('div');w.style.cssText='position:fixed;z-index:99999;bottom:'+bo+';'+(pos==='bottom-left'?'left':'right')+':'+so+';text-align:center';b.style.position='relative';b.style.bottom='auto';b.style.right='auto';b.style.left='auto';w.appendChild(b);var bd=document.createElement('div');bd.className='wa-bg';bd.textContent='Powered by WA Widget';w.appendChild(bd);document.body.appendChild(w);}
  else document.body.appendChild(b);
  R['f'+p.id]=1;
}

function rProd(p,sc){
  if(R['p'+p.id]||!/\/products\//.test(location.pathname))return;
  var s=p.styleConfig||{},bg=s.bgColor||sc.brandColor||'#25D366',tc2=s.textColor||'#fff',
  msg=s.messageTemplate||p.welcomeMessage||'Hi, I want to ask about: {{product_name}} - {{product_url}}',
  ol=s.buttonStyle==='outlined',tl=s.buttonStyle==='text-only';
  var b=document.createElement('button');b.className='wa-pb';
  b.style.cssText='background:'+(ol||tl?'transparent':bg)+';color:'+(ol||tl?bg:tc2)+';border:'+(ol?'2px solid '+bg:'none');
  b.innerHTML=svg(20,ol||tl?bg:tc2)+' '+(p.buttonLabel||'Ask about this product');
  b.onclick=function(){tc(p.id);window.open(wu(p.phoneNumber||sc.defaultPhone,msg),'_blank');};
  var sels=['form[action="/cart/add"] button[type="submit"]','.product-form__submit','.add-to-cart','#AddToCart','[data-add-to-cart]','button[name="add"]'];
  function inj(){for(var i=0;i<sels.length;i++){var a=document.querySelector(sels[i]);if(a){var t=a.closest('.product-form__buttons')||a.closest('.product-form')||a.parentNode;if(t){if(s.position==='above_atc')t.insertBefore(b,a);else if(s.position==='below_desc'){var d=document.querySelector('.product-single__description,.product__description,[data-product-description]');d?d.parentNode.insertBefore(b,d.nextSibling):t.appendChild(b);}else t.appendChild(b);R['p'+p.id]=1;return true;}}}return false;}
  if(!inj()){var ob=new MutationObserver(function(m,o){if(inj())o.disconnect();});ob.observe(document.body,{childList:true,subtree:true});setTimeout(function(){ob.disconnect();},10000);}
}

function rOrder(p,sc){
  if(R['o'+p.id])return;
  var isO=!!(window.Shopify&&window.Shopify.checkout)||!!document.querySelector('.os-step__title,.thank-you,[data-step="thank_you"]')||/\/thank_you|\/orders\//.test(location.pathname);
  if(!isO)return;
  var s=p.styleConfig||{},bg=s.bgColor||sc.brandColor||'#25D366',tc2=s.textColor||'#fff',
  msg=s.messageTemplate||'Hi, I have a question about my order #{{order_number}}';
  var b=document.createElement('button');b.className='wa-ob';
  b.style.cssText='background:'+bg+';color:'+tc2;
  b.innerHTML=svg(20,tc2)+' '+(p.buttonLabel||'Chat about this order');
  b.onclick=function(){tc(p.id);window.open(wu(p.phoneNumber||sc.defaultPhone,msg),'_blank');};
  var c=document.querySelector('.os-step__special-description,.thank-you__additional-content,.content-box,main')||document.body;
  c.appendChild(b);R['o'+p.id]=1;
}

function rBar(p,sc){
  if(R['b'+p.id])return;if(!ip(p.pageTargeting))return;
  var s=p.styleConfig||{},bg=s.bgColor||sc.brandColor||'#25D366',tc2=s.textColor||'#fff',dk='wa_bd_'+p.id;
  if(s.dismissible){try{if(localStorage.getItem(dk))return;}catch(e){}}
  var bar=document.createElement('div');bar.className='wa-bar';bar.id='wa-bar-'+p.id;
  bar.style.cssText='background:'+bg+';color:'+tc2;
  bar.innerHTML=svg(16,tc2)+' <span>'+(p.buttonLabel||'Chat with us on WhatsApp')+'</span> <a href="'+wu(p.phoneNumber||sc.defaultPhone,p.welcomeMessage||'')+'" target="_blank" rel="noopener">Open WhatsApp</a>';
  if(s.dismissible){var x=document.createElement('button');x.className='wa-bx';x.innerHTML='×';x.onclick=function(){bar.style.transform='translateY(-100%)';document.body.style.marginTop='0';try{localStorage.setItem(dk,'1');}catch(e){}setTimeout(function(){bar.remove();},300);};bar.appendChild(x);}
  document.body.insertBefore(bar,document.body.firstChild);document.body.style.marginTop='40px';R['b'+p.id]=1;
}

function renderAll(cfg){
  if(!cfg||!cfg.placements||!cfg.placements.length)return;
  var sc=cfg.shop||{};
  if(sc.gdprConsent){try{if(!document.cookie.match(/wa_consent=1/))return;}catch(e){}}
  cfg.placements.forEach(function(p){try{
    if(p.type==='FLOATING')rFloat(p,sc);
    else if(p.type==='PRODUCT_PAGE')rProd(p,sc);
    else if(p.type==='ORDER_CONFIRM')rOrder(p,sc);
    else if(p.type==='ANNOUNCEMENT_BAR')rBar(p,sc);
  }catch(e){console.error('[WA]',e);}});
}

function init(){
  if(!SH)return;addCSS();
  var ck='wa_cfg',ct='wa_cfg_t',ttl=60000;
  try{var c=sessionStorage.getItem(ck),t=sessionStorage.getItem(ct);
    if(c&&t&&Date.now()-parseInt(t)<ttl){renderAll(JSON.parse(c));return;}}catch(e){}
  fetch(H+'/api/config?shop='+encodeURIComponent(SH)).then(function(r){return r.json();}).then(function(d){
    try{sessionStorage.setItem(ck,JSON.stringify(d));sessionStorage.setItem(ct,String(Date.now()));}catch(e){}
    renderAll(d);
    var op=history.pushState,or=history.replaceState;
    history.pushState=function(){op.apply(this,arguments);setTimeout(function(){R={};renderAll(d);},300);};
    history.replaceState=function(){or.apply(this,arguments);setTimeout(function(){R={};renderAll(d);},300);};
    window.addEventListener('popstate',function(){setTimeout(function(){R={};renderAll(d);},300);});
  }).catch(function(e){console.error('[WA]',e);});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
