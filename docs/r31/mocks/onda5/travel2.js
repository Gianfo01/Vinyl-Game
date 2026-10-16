// Botões de viagem em pixel art (16x16 desenhados em canvas, escala 3)
(function(){
const K='#1a1214';
function cv(draw){const c=document.createElement('canvas');c.width=16;c.height=16;const g=c.getContext('2d');
 const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};draw(R,g);return c;}
const ICONS={
 sede:cv((R)=>{R(3,4,11,11,K);R(4,5,9,9,'#b0503a');R(4,5,9,1,'#c86a50');
   R(2,1,13,4,K);R(3,2,11,2,'#f0c040');R(7,2,3,2,K);R(8,2,1,1,'#f0c040');
   for(const[x,y]of[[5,7],[10,7],[5,10],[10,10]])R(x,y,2,2,'#ffe08a');
   R(7,11,3,4,K);R(8,12,1,3,'#6b3a1e');R(1,15,15,1,'#3c8a3c')}),
 casa:cv((R)=>{R(11,2,3,5,K);R(12,3,1,3,'#9a6034');
   for(let i=0;i<7;i++){R(8-i-1,1+i,2*i+3,1,K);if(i>0)R(8-i,1+i,2*i+1,1,i<2?'#e06048':'#c84a38')}
   R(2,8,13,7,K);R(3,8,11,6,'#f0e2c0');R(3,8,11,1,'#d8c8a0');
   R(4,10,3,3,K);R(5,10,1,2,'#7ac0f0');R(10,10,3,3,K);R(11,10,1,2,'#7ac0f0');
   R(7,10,3,5,K);R(8,11,1,4,'#8a5030');R(1,15,15,1,'#3c8a3c')}),
 cidade:cv((R)=>{const b=(x,y,w,c)=>{R(x,y,w,15-y,K);R(x+1,y+1,w-2,14-y-1,c);for(let yy=y+2;yy<14;yy+=2)for(let xx=x+1;xx<x+w-1;xx+=2)R(xx,yy,1,1,'#ffe08a')};
   b(0,6,5,'#5a6a8a');b(10,3,6,'#4a5a7a');b(4,1,7,'#6a7aa0');R(7,0,1,1,K);R(0,15,16,1,'#3c3c4c')}),
 mundo:cv((R,g)=>{for(let y=0;y<16;y++)for(let x=0;x<16;x++){const d=Math.hypot(x-7.5,y-7.5);
   if(d<7.6){let c='#3a7ad0';const land=(x>2&&x<7&&y>3&&y<9)||(x>8&&x<12&&y>5&&y<13)||(x>4&&x<7&&y>10&&y<13)||(x>9&&x<13&&y>2&&y<5);
     if(land)c='#48b85c';if(d>6.6)c='#1a1214';else if(x+y<9&&!land)c='#6aa0e8';R(x,y,1,1,c)}}})
};
const css=`.travel{display:flex;gap:6px;padding-right:12px;margin-right:6px;border-right:2px solid #2b4260}
.tb{position:relative;width:88px;height:70px;background:#1c3048;border:2px solid #0a121a;border-bottom-width:4px;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:inset 0 0 0 2px #3f5f84}
.tb canvas{width:40px;height:40px;image-rendering:pixelated}
.tb span.t{font-family:"Press Start 2P",monospace;font-size:8px;color:#cfd8e2;letter-spacing:.02em}
.tb.on{background:#4a3a10;box-shadow:inset 0 0 0 2px #f0c060}.tb.on span.t{color:#f0c060}
.tb .bang{position:absolute;right:-7px;top:-9px;background:#e04848;color:#fff;font-family:'Press Start 2P';font-size:8px;padding:3px 5px;border:2px solid #1a1214;border-radius:3px}
.tb .key{position:absolute;left:3px;top:2px;font-family:'Press Start 2P';font-size:6px;color:#7f93aa}
.bottom,.bolso{height:84px!important}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
window.TRAVEL_ICONS=ICONS;window.buildTravel=function(on){const wrap=document.createElement('div');wrap.className='travel';
 [['sede','SEDE','⇧1',''],['casa','CASA','⇧2',''],['cidade','CIDADE','⇧3','!'],['mundo','MUNDO','⇧4','2']].forEach(([id,t,k,b])=>{
  const d=document.createElement('div');d.className='tb'+(id===on?' on':'');
  const c=ICONS[id];const cc=document.createElement('canvas');cc.width=16;cc.height=16;cc.getContext('2d').drawImage(c,0,0);
  d.appendChild(cc);const s=document.createElement('span');s.className='t';s.textContent=t;d.appendChild(s);
  const kk=document.createElement('span');kk.className='key';kk.textContent=k;d.appendChild(kk);
  if(b&&id!==on){const bb=document.createElement('span');bb.className='bang';bb.textContent=b;d.appendChild(bb)}
  wrap.appendChild(d)});return wrap};
})();
