'use strict';
// Independently implemented canvas editor. Photos never leave this browser.
const $ = id => document.getElementById(id);
const canvas = $('preview'), ctx = canvas.getContext('2d');
const state = {mode:'music',image:null,palette:['#dce1e6','#bdc6d0','#8997a5','#586978','#2c3b48'],start:0,raf:0,picking:false,busy:false,gif:null,url:null,loadToken:0};
const DURATION = 3600, SHUTTER = 2460;
let photoRect = null;
let previewTime = 0, previewPlaying = false, resumePreview = false;
const blurBuffer = document.createElement('canvas');
const chromaBuffer = document.createElement('canvas');
const number = id => Number($(id).value);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
const SIZE_SELECT={music:'size',ticket:'ticketSize',photocard:'cardSize',birthday:'bdaySize'};
function dimensions(){const sel=SIZE_SELECT[state.mode];if(sel)return $(sel).value.split(',').map(Number);return $('orientation').value==='portrait'?[1080,1920]:[1920,1080];}
function hex(r,g,b){return '#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');}
function contrast(color){const rgb=color.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#202326':'#fafbfc';}
function rect(c,x,y,w,h,r=0){c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function line(c,x1,y1,x2,y2,width=2){c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function text(c,t,x,y,size,color,weight=400,align='left',max=Infinity,italic=false){c.fillStyle=color;c.font=`${italic?'italic ':''}${weight} ${size}px Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;c.textAlign=align;c.textBaseline='alphabetic';let out=t;if(c.measureText(out).width>max){while(out.length && c.measureText(out+'…').width>max)out=out.slice(0,-1);out+='…';}c.fillText(out,x,y);}
function crop(w,h,extraZoom=1){const im=state.image,z=number('zoom')*extraZoom,scale=Math.max(w/im.width,h/im.height)*z;const sw=w/scale,sh=h/scale;return {sx:(im.width-sw)*(number('panX')+1)/2,sy:(im.height-sh)*(number('panY')+1)/2,sw,sh};}
function photo(c,x,y,w,h,{blur=0,shake=0,radius=0,extraZoom=1}={}){const p=crop(w,h,extraZoom);c.save();c.beginPath();c.roundRect(x,y,w,h,radius);c.clip();if(blur && typeof c.filter!=='string'){
 const low=Math.max(10,Math.round(Math.min(w,h)/Math.max(2,blur*1.8)));
 blurBuffer.width=Math.max(2,Math.round(w/Math.min(w,h)*low));blurBuffer.height=Math.max(2,Math.round(h/Math.min(w,h)*low));
 const bc=blurBuffer.getContext('2d');bc.drawImage(state.image,p.sx,p.sy,p.sw,p.sh,0,0,blurBuffer.width,blurBuffer.height);
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(blurBuffer,x+shake,y+shake*.4,w,h);
 }else{c.filter=blur?`blur(${blur}px)`:'none';c.drawImage(state.image,p.sx,p.sy,p.sw,p.sh,x+shake,y+shake*.4,w,h);}c.restore();return {x,y,w,h,...p};}
function triangle(c,x,y,size){c.beginPath();c.moveTo(x-size*.32,y-size*.5);c.lineTo(x+size*.5,y);c.lineTo(x-size*.32,y+size*.5);c.closePath();c.fill();}
function music(c,w,h){const bg=$('background').value,ink=contrast(bg),m=w*.1,inner=w-2*m;c.fillStyle=bg;c.fillRect(0,0,w,h);const top=h*.13,photoSize=inner;
 text(c,'ON REPEAT',m,top-w*.045,w*.022,ink,500);text(c,'01 /',w-m,top-w*.045,w*.022,ink,500,'right');
 const pr=photo(c,m,top,photoSize,photoSize,{radius:w*.004});
 let y=top+photoSize+w*.075;
 if($('showPalette').checked){const gap=w*.012,cell=(inner-gap*4)/5;state.palette.forEach((col,i)=>{c.fillStyle=col;rect(c,m+i*(cell+gap),y,cell,w*.058,0);text(c,col.toUpperCase(),m+i*(cell+gap),y+w*.09,w*.015,ink,400);});y+=w*.18;}else y+=w*.055;
 text(c,$('title').value.trim()||'Untitled track',m,y,w*.051,ink,600,'left',inner);y+=w*.056;text(c,$('artist').value.trim()||'Unknown artist',m,y,w*.027,ink,400,'left',inner);
 y+=w*.095;c.strokeStyle=ink;c.globalAlpha=.16;line(c,m,y,w-m,y,w*.003);c.globalAlpha=1;
 const time=s=>{const a=s.split(':').map(Number);return a.length===2&&a.every(Number.isFinite)?a[0]*60+a[1]:0;};const ratio=clamp(time($('elapsed').value)/Math.max(1,time($('duration').value)),0,1);
 line(c,m,y,m+inner*ratio,y,w*.003);c.fillStyle=ink;c.beginPath();c.arc(m+inner*ratio,y,w*.006,0,Math.PI*2);c.fill();text(c,$('elapsed').value,m,y+w*.035,w*.019,ink);text(c,$('duration').value,w-m,y+w*.035,w*.019,ink,400,'right');
 y+=w*.12;c.fillStyle=ink;triangle(c,w*.5,y,w*.045);triangle(c,w*.67,y,w*.024);line(c,w*.69,y-w*.013,w*.69,y+w*.013,w*.004);c.save();c.translate(w*.33,y);c.rotate(Math.PI);triangle(c,0,0,w*.024);line(c,w*.021,-w*.013,w*.021,w*.013,w*.004);c.restore();
 c.strokeStyle=ink;c.lineWidth=w*.002;c.beginPath();c.arc(w*.13,y,w*.011,0,Math.PI*2);c.stroke();line(c,w*.862,y-w*.011,w*.862,y+w*.011,w*.002);line(c,w*.851,y,w*.873,y,w*.002);
 text(c,'PHOTO / SOUND / MOMENT',m,h-w*.09,w*.016,ink,400);text(c,'SCENE',w-m,h-w*.09,w*.019,ink,600,'right');return pr;
}
function wrapped(c,raw,x,y,size,width,color,italic){c.font=`${italic?'italic ':''}500 ${size}px sans-serif`;const lines=[];for(const paragraph of raw.split('\n')){let row='';for(const ch of paragraph){if(c.measureText(row+ch).width>width&&row){lines.push(row);row='';}row+=ch;}lines.push(row);}const rows=lines.slice(0,5);rows.forEach((l,i)=>text(c,l,x,y-(rows.length-1-i)*size*1.35,size,color,500,'center',width,italic));}
function hashNum(str){let h=0;for(let i=0;i<str.length;i++)h=(h*31+str.charCodeAt(i))>>>0;return h;}
function mulberry32(seed){return function(){seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function barcode(c,x,y,w,h,seed,color){const rnd=mulberry32(seed);c.fillStyle=color;let cx=x;while(cx<x+w-2){const bw=w*(.006+rnd()*.014);c.fillRect(cx,y,bw,h);cx+=bw+w*(.005+rnd()*.01);}}
function ticket(c,w,h){
 const bg=$('ticketBg').value,ink=contrast(bg),m=w*.09,inner=w-2*m;
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 const title=$('ticketTitle').value.trim()||'RESCENE LIVE',artist=$('ticketArtist').value.trim()||'World Tour',date=$('ticketDate').value.trim()||'2026.11.14',venue=$('ticketVenue').value.trim()||'Seoul, KR',zone=$('ticketZone').value.trim()||'A',row=$('ticketRow').value.trim()||'12',seat=$('ticketSeat').value.trim()||'07',gate=$('ticketGate').value.trim()||'3';
 const seed=hashNum(title+artist+date+zone+row+seat),serial=String(seed%900000+100000);
 let y=w*.08;
 text(c,'ADMIT ONE',m,y,w*.02,ink,600);text(c,'GATE '+gate,w-m,y,w*.02,ink,500,'right');
 y+=w*.045;
 const photoH=inner*.82,pr=photo(c,m,y,inner,photoH,{radius:w*.02});
 y+=photoH+w*.075;
 text(c,title,m,y,w*.054,ink,700,'left',inner);y+=w*.058;
 text(c,artist,m,y,w*.027,ink,400,'left',inner);
 y+=w*.075;c.strokeStyle=ink;c.globalAlpha=.16;line(c,m,y,w-m,y,w*.003);c.globalAlpha=1;
 y+=w*.045;
 text(c,date,m,y,w*.023,ink,500);text(c,venue,w-m,y,w*.023,ink,500,'right');
 y+=w*.07;
 c.save();c.strokeStyle=ink;c.globalAlpha=.35;c.setLineDash([w*.014,w*.012]);c.lineWidth=w*.003;line(c,m,y,w-m,y,w*.003);c.restore();
 c.save();c.globalCompositeOperation='destination-out';c.beginPath();c.arc(0,y,w*.022,0,Math.PI*2);c.fill();c.beginPath();c.arc(w,y,w*.022,0,Math.PI*2);c.fill();c.restore();
 y+=w*.075;
 const colw=inner/3;
 [['ZONE',zone],['ROW',row],['SEAT',seat]].forEach(([label,val],i)=>{text(c,label,m+i*colw,y,w*.017,ink,500);text(c,val,m+i*colw,y+w*.05,w*.038,ink,700);});
 y+=w*.11;
 barcode(c,m,y,inner,w*.06,seed,ink);y+=w*.06+w*.04;
 text(c,'NO. '+serial,m,y,w*.019,ink,500);text(c,'SCENE',w-m,y,w*.02,ink,600,'right');
 return pr;
}
function photocard(c,w,h){
 const bg=$('cardBg').value,ink=contrast(bg),group=$('cardGroup').value.trim()||'RESCENE',member=$('cardMember').value.trim()||'MEMBER',bday=$('cardBday').value.trim()||'01.01',blood=$('cardBlood').value.trim()||'O',msg=$('cardMsg').value.trim()||'매일이 콘서트 같기를';
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 const m=w*.08,bw=w*.014,cardX=m,cardY=m,cardW=w-2*m,cardH=h-2*m,cardR=w*.05;
 const holo=c.createLinearGradient(cardX,cardY,cardX+cardW,cardY+cardH);
 ['#ff9ecf','#ffe27a','#9dffc0','#9fd4ff','#c9a6ff','#ff9ecf'].forEach((col,i,arr)=>holo.addColorStop(i/(arr.length-1),col));
 let pr=null;
 if($('cardBack').checked){
  c.save();c.beginPath();c.roundRect(cardX+bw,cardY+bw,cardW-bw*2,cardH-bw*2,cardR);c.clip();
  c.fillStyle=bg;c.fillRect(cardX,cardY,cardW,cardH);
  c.globalAlpha=.08;text(c,member[0]||'S',cardX+cardW/2,cardY+cardH*.42,cardW*.85,ink,800,'center');c.globalAlpha=1;
  let y=cardY+cardH*.5;
  [['NAME',member],['GROUP',group],['BIRTHDAY',bday],['BLOOD TYPE',blood]].forEach(([label,val])=>{text(c,label,cardX+cardW*.12,y,w*.02,ink,500);text(c,val,cardX+cardW*.42,y,w*.024,ink,700,'left',cardW*.5);y+=w*.06;});
  y+=w*.03;wrapped(c,msg,cardX+cardW/2,y,w*.024,cardW*.76,ink,true);
  text(c,'PHOTOCARD',cardX+cardW/2,cardY+cardH-w*.035,w*.017,ink,500,'center');
  c.restore();
 }else{
  pr=photo(c,cardX+bw,cardY+bw,cardW-bw*2,cardH-bw*2,{radius:cardR*.8});
  c.save();c.beginPath();c.roundRect(cardX+bw,cardY+bw,cardW-bw*2,cardH-bw*2,cardR*.8);c.clip();
  const scrim=c.createLinearGradient(0,cardY+cardH*.62,0,cardY+cardH);scrim.addColorStop(0,'rgba(0,0,0,0)');scrim.addColorStop(1,'rgba(0,0,0,.72)');c.fillStyle=scrim;c.fillRect(cardX,cardY+cardH*.62,cardW,cardH*.38);
  text(c,group.toUpperCase(),cardX+cardW*.09,cardY+cardH*.86,w*.02,'#f2f2f2',600,'left',cardW*.82);
  text(c,member,cardX+cardW*.09,cardY+cardH*.93,w*.046,'#ffffff',700,'left',cardW*.82);
  c.restore();
 }
 c.save();c.lineWidth=bw;c.strokeStyle=holo;c.beginPath();c.roundRect(cardX+bw/2,cardY+bw/2,cardW-bw,cardH-bw,cardR);c.stroke();c.restore();
 return pr;
}
function birthday(c,w,h){
 const bg=$('bdayBg').value,ink=contrast(bg),member=$('bdayMember').value.trim()||'MEMBER',dateStr=$('bdayDate').value.trim()||'01.01',msg=$('bdayMsg').value.trim()||'생일 축하해',m=w*.09,inner=w-2*m;
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 const parts=dateStr.split('.').map(Number),mon=clamp((parts[0]||1)-1,0,11),day=clamp(parts[1]||1,1,31);
 const now=new Date();now.setHours(0,0,0,0);
 let target=new Date(now.getFullYear(),mon,day);if(target<now)target=new Date(now.getFullYear()+1,mon,day);
 const dday=Math.round((target-now)/86400000);
 const rnd=mulberry32(hashNum(member+dateStr));
 for(let i=0;i<26;i++){const sx=rnd()*w,sy=rnd()*h*.9,sr=w*(.003+rnd()*.006);c.save();c.globalAlpha=.22+rnd()*.4;c.fillStyle=ink;c.beginPath();c.arc(sx,sy,sr,0,Math.PI*2);c.fill();c.restore();}
 let y=w*.1;
 text(c,'HAPPY BIRTHDAY',m,y,w*.024,ink,600);
 y+=w*.045;
 const photoSize=inner,pr=photo(c,m,y,photoSize,photoSize,{radius:w*.03});
 y+=photoSize+w*.09;
 text(c,dday===0?'D-DAY':dday>0?'D-'+dday:'D+'+(-dday),m,y,w*.09,ink,800);
 y+=w*.075;
 text(c,member,m,y,w*.05,ink,700,'left',inner);y+=w*.055;
 text(c,dateStr,m,y,w*.026,ink,400);
 y+=w*.09;
 wrapped(c,msg,w/2,y,w*.03,inner*.85,ink,false);
 text(c,'SCENE',w-m,h-w*.06,w*.02,ink,600,'right');
 return pr;
}
function ghost(w,h,sx,sy,sw,sh,color){chromaBuffer.width=w;chromaBuffer.height=h;const g=chromaBuffer.getContext('2d');g.clearRect(0,0,w,h);g.drawImage(state.image,sx,sy,sw,sh,0,0,w,h);g.globalCompositeOperation='multiply';g.fillStyle=color;g.fillRect(0,0,w,h);return chromaBuffer;}
function vhsFX(c,w,h,t,base,area,pr){
 c.save();c.beginPath();c.roundRect(area.x,area.y,area.w,area.h,0);c.clip();c.globalCompositeOperation='screen';c.globalAlpha=.5;
 c.drawImage(ghost(area.w,area.h,pr.sx,pr.sy,pr.sw,pr.sh,'#ff1636'),area.x+base*.005,area.y);c.drawImage(ghost(area.w,area.h,pr.sx,pr.sy,pr.sw,pr.sh,'#19f0ff'),area.x-base*.005,area.y);
 c.restore();
 c.save();c.globalAlpha=.16;c.fillStyle='#000';for(let y=0;y<h;y+=Math.max(2,Math.round(base*.006)))c.fillRect(0,y,w,1);c.restore();
 c.save();c.globalAlpha=.05+Math.random()*.05;for(let i=0;i<160;i++){c.fillStyle=Math.random()<.5?'#fff':'#000';c.fillRect(Math.random()*w,Math.random()*h,1.6,1.6);}c.restore();
 const grad=c.createRadialGradient(w/2,h/2,base*.3,w/2,h/2,base*.75);grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=grad;c.fillRect(0,0,w,h);
 if(t%620<26){c.save();const gy=(Math.sin(t*7)*.5+.5)*h;c.globalAlpha=.4;c.fillStyle='#fff';c.fillRect(0,gy,w,base*.012);c.restore();}
}
function parallaxBG(c,w,h,t){
 const zoom=1.34+Math.sin(t/900)*.015,p=crop(w,h,zoom),driftX=Math.sin(t/1400)*w*.02,driftY=Math.cos(t/1700)*h*.014;
 c.save();
 if(typeof c.filter==='string'){c.filter=`blur(${Math.round(w*.035)}px)`;c.drawImage(state.image,p.sx,p.sy,p.sw,p.sh,driftX,driftY,w,h);c.filter='none';}
 else{blurBuffer.width=140;blurBuffer.height=Math.round(140*h/w);const bc=blurBuffer.getContext('2d');bc.drawImage(state.image,p.sx,p.sy,p.sw,p.sh,0,0,blurBuffer.width,blurBuffer.height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(blurBuffer,driftX,driftY,w,h);}
 c.restore();
 c.fillStyle='rgba(8,10,14,.4)';c.fillRect(0,0,w,h);
}
function bokehFX(c,w,h,t,area){
 const cols=state.palette&&state.palette.length?state.palette:['#ff6ec7','#7c8cff','#ffd166'];
 c.save();c.globalCompositeOperation='screen';
 for(let i=0;i<7;i++){
  const seed=i*137.5,px=area.x+area.w*(.5+.42*Math.sin(t/1300+seed)),py=area.y+area.h*(.5+.42*Math.cos(t/1100+seed*1.3)),r=area.w*(.05+.03*Math.sin(t/700+seed)),col=cols[i%cols.length];
  const g=c.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,col+'cc');g.addColorStop(1,col+'00');
  c.fillStyle=g;c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fill();
 }
 c.restore();
}
function focus(c,w,h,time){const t=clamp(time,0,DURATION),kind=$('camera').value,isVHS=kind==='vhs',isParallax=kind==='parallax',base=Math.min(w,h),m=base*.055;const seek=clamp((t-650)/1300,0,1),e=seek*seek*(3-2*seek),locked=t>=1950;const blur=(1-e)*base*.012,shake=t<1950?Math.sin(t/91)*base*.002*(1-e):0;const accent=kind==='pro'?'#73dbab':isVHS?'#ff2d55':isParallax?'#c9a6ff':kind==='grid'?'#91c7ff':'#ffffff';const zProg=clamp(t/DURATION,0,1),zEase=zProg*zProg*(3-2*zProg);
 if(isParallax)parallaxBG(c,w,h,t);else{c.fillStyle=isVHS?'#070707':'#151719';c.fillRect(0,0,w,h);}const top=base*.115,bottom=base*.19,area={x:m,y:top,w:w-2*m,h:h-top-bottom};const jx=isVHS?Math.sin(t/45)*base*.0015+(t%171<8?base*.012:0):0;const pr=photo(c,area.x+jx,area.y,area.w,area.h,{blur,shake,radius:kind==='clean'?base*.025:0,extraZoom:isParallax?1+zEase*.08:1});
 if(kind==='grid'){c.save();c.strokeStyle='#ffffff45';for(let i=1;i<3;i++){line(c,area.x+area.w*i/3,area.y,area.x+area.w*i/3,area.y+area.h,1);line(c,area.x,area.y+area.h*i/3,area.x+area.w,area.y+area.h*i/3,1);}c.restore();}
 if(isVHS){const blink=Math.sin(t/140)>0;if(blink){c.fillStyle=accent;c.beginPath();c.arc(m+base*.012,base*.062,base*.011,0,Math.PI*2);c.fill();}text(c,'REC',m+base*.03,base*.068,base*.022,'#eef1f4',600);const secs=t/1000,tc=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(Math.floor(secs%60)).padStart(2,'0')}:${String(Math.floor((secs*30)%30)).padStart(2,'0')}`;text(c,tc,w-m,base*.068,base*.02,'#f5c94d',500,'right');}
 else if(isParallax){text(c,'PARALLAX / ZOOM',m,base*.068,base*.022,'#eef1f4',500);text(c,Math.round((1+zEase*.08)*100)+'%',w-m,base*.068,base*.02,accent,500,'right');}
 else{text(c,kind==='pro'?'MANUAL / 50 MM':kind==='grid'?'FRAME / 3 × 3':'FOCUS / AUTO',m,base*.068,base*.022,'#eef1f4',500);text(c,locked?'FOCUS LOCKED':'FINDING FOCUS',w-m,base*.068,base*.018,locked?accent:'#a8afb7',400,'right');}
 if(!isVHS&&!isParallax){const cx=w/2+shake,cy=area.y+area.h*.46,s=base*(.19-.05*e);c.strokeStyle=accent;c.globalAlpha=locked?1:.65+.3*Math.sin(t/100);c.lineWidth=base*.003;for(const [dx,dy]of[[-1,-1],[1,-1],[-1,1],[1,1]]){c.beginPath();c.moveTo(cx+dx*s/2,cy+dy*(s/2-s*.2));c.lineTo(cx+dx*s/2,cy+dy*s/2);c.lineTo(cx+dx*(s/2-s*.2),cy+dy*s/2);c.stroke();}c.globalAlpha=1;}
 if(kind==='pro'){text(c,'1/125   F2.8   ISO 200',m+base*.03,area.y+area.h-base*.035,base*.022,'#ffffff',500);}
 if(isVHS){text(c,'SP · STEREO',m+base*.03,area.y+area.h-base*.035,base*.02,'#e9edef',500);}
 const cap=$('caption').value.trim();if(cap){c.save();c.shadowColor='#000';c.shadowBlur=base*.01;wrapped(c,cap,w/2,area.y+area.h-base*(kind==='pro'||isVHS?.1:.06),base*.04,area.w*.87,$('captionColor').value,$('italic').checked);c.restore();}
 if(isVHS)vhsFX(c,w,h,t,base,area,pr);
 const y=h-base*.085;const press=t>SHUTTER-60&&t<SHUTTER+100?.9:1;c.strokeStyle='#e9edef';c.lineWidth=base*.002;c.beginPath();c.arc(w/2,y,base*.037*press,0,Math.PI*2);c.stroke();c.fillStyle='#e9edef';c.beginPath();c.arc(w/2,y,base*.029*press,0,Math.PI*2);c.fill();text(c,'SCENE',m,y+base*.006,base*.022,'#aeb6bf',500);text(c,t>SHUTTER?(isVHS?'SAVED':'CAPTURED'):(isVHS?'RECORDING':'PHOTO'),w-m,y+base*.006,base*.019,t>SHUTTER?accent:'#aeb6bf',500,'right');
 if(t>=SHUTTER&&t<SHUTTER+130){c.fillStyle=`rgba(255,255,255,${(1-(t-SHUTTER)/130)*.92})`;c.fillRect(0,0,w,h);}if(kind==='pro'&&t>=SHUTTER&&t<SHUTTER+200){const a=1-(t-SHUTTER)/200;c.fillStyle='#111';c.fillRect(area.x,area.y,area.w,area.h*.5*a);c.fillRect(area.x,area.y+area.h-area.h*.5*a,area.w,area.h*.5*a);}
}
function draw(c,w,h,time=3200){if(state.mode==='music')return music(c,w,h);if(state.mode==='ticket')return ticket(c,w,h);focus(c,w,h,time);}
function render(time=3200){if(!state.image)return;const[w,h]=dimensions(),scale=Math.min(1,900/Math.max(w,h));const pw=Math.round(w*scale),ph=Math.round(h*scale);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}ctx.setTransform(scale,0,0,scale,0,0);photoRect=draw(ctx,w,h,time);ctx.setTransform(1,0,0,1,0,0);}
function previewUI(){
 $('playPause').textContent=previewPlaying?'Ⅱ 일시정지':'▶ 재생';
 $('timeline').value=String(Math.round(previewTime));
 $('previewTime').textContent=(previewTime/1000).toFixed(1)+' / 3.6초';
}
function stop(){cancelAnimationFrame(state.raf);state.raf=0;previewPlaying=false;previewUI();}
function animate(now){
 state.raf=0;
 if(state.busy||!state.image||state.mode!=='focus'||document.hidden){stop();return;}
 const elapsed=now-state.start,loop=$('loop').checked;
 previewTime=loop?elapsed%DURATION:Math.min(elapsed,DURATION);
 render(Math.min(53,Math.floor(previewTime/(DURATION/54)))*DURATION/54);
 if(!loop&&elapsed>=DURATION)previewPlaying=false;
 previewUI();
 if(previewPlaying)state.raf=requestAnimationFrame(animate);
}
function play(){
 if(!state.image||state.busy||state.mode!=='focus')return;
 stop();if(previewTime>=DURATION)previewTime=0;
 state.start=performance.now()-previewTime;previewPlaying=true;previewUI();
 state.raf=requestAnimationFrame(animate);
}
function replay(manual=false){
 stop();previewTime=0;
 if(!state.image||state.mode!=='focus'){previewUI();return;}
 if(manual||!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
 else{render(0);previewUI();}
}
function refresh(restart=false){
 $('dimensions').textContent=dimensions().join(' × ');
 if(state.mode==='focus'){
  if(restart)replay();
  else render(Math.min(53,Math.floor(previewTime/(DURATION/54)))*DURATION/54);
 }else render();
}
function updateButtons(){for(const id of ['png','gif','replay','playPause','timeline','eyedropper','clear'])$(id).disabled=!state.image||state.busy;$('photo').disabled=state.busy;$('choose').disabled=state.busy;}
function setMode(mode){if(state.busy)return;state.mode=mode;stop();setPicking(false);document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mode===mode)));$('musicPanel').hidden=mode!=='music';$('focusPanel').hidden=mode!=='focus';$('ticketPanel').hidden=mode!=='ticket';$('gif').hidden=mode!=='focus';$('replay').hidden=mode!=='focus';$('motionControls').hidden=mode!=='focus';$('modeNote').textContent=mode==='music'?'사진과 음악을 한 장에':mode==='ticket'?'나만의 공연 티켓 만들기':'효과 미리보기 · 3.6초';refresh(true);}
function paletteUI(){const root=$('palette');root.replaceChildren();state.palette.forEach(color=>{const b=document.createElement('button');b.className='swatch';b.style.backgroundColor=color;b.title=color.toUpperCase();b.setAttribute('aria-label',color+' 배경색으로 사용');b.onclick=()=>{if(state.busy)return;$('background').value=color;render();};root.append(b);});}
function extractPalette(px=null,py=null){const im=state.image,c=document.createElement('canvas');c.width=c.height=80;const g=c.getContext('2d',{willReadFrequently:true});if(px===null)g.drawImage(im,0,0,80,80);else{const side=Math.min(im.width,im.height)*.32;g.drawImage(im,clamp(px-side/2,0,im.width-side),clamp(py-side/2,0,im.height-side),side,side,0,0,80,80);}const data=g.getImageData(0,0,80,80).data;const bins=new Map();for(let i=0;i<data.length;i+=4){if(data[i+3]<128)continue;const rgb=[data[i],data[i+1],data[i+2]],key=rgb.map(v=>Math.floor(v/32)).join(',');let bin=bins.get(key);if(!bin){bin={n:0,sum:[0,0,0]};bins.set(key,bin);}bin.n++;rgb.forEach((v,j)=>bin.sum[j]+=v);}const chosen=[];for(const b of [...bins.values()].sort((a,b)=>b.n-a.n)){const col=b.sum.map(v=>v/b.n);if(chosen.every(old=>Math.hypot(...col.map((v,i)=>v-old[i]))>48))chosen.push(col);if(chosen.length===5)break;}if(!chosen.length)chosen.push([220,220,220]);while(chosen.length<5){const col=chosen[0],k=chosen.length;chosen.push(col.map(v=>clamp(v+(k%2?1:-1)*k*22,0,255)));}chosen.sort((a,b)=>b.reduce((x,v)=>x+v,0)-a.reduce((x,v)=>x+v,0));state.palette=chosen.map(col=>hex(...col));paletteUI();$('pickHint').textContent='색상을 누르면 배경에 적용됩니다.';}
async function loadPhoto(file){if(!file||state.busy)return;if(!file.type.startsWith('image/')){status('이미지 파일을 선택해 주세요.',true);return;}if(file.size>25*1024*1024){status('25 MB 이하의 이미지를 선택해 주세요.',true);return;}const token=++state.loadToken;const url=URL.createObjectURL(file);status('사진을 불러오는 중…');try{const im=new Image();im.src=url;await im.decode();if(token!==state.loadToken)return;const limit=4096,scale=Math.min(1,limit/Math.max(im.naturalWidth,im.naturalHeight));const reduced=document.createElement('canvas');reduced.width=Math.max(1,Math.round(im.naturalWidth*scale));reduced.height=Math.max(1,Math.round(im.naturalHeight*scale));reduced.getContext('2d').drawImage(im,0,0,reduced.width,reduced.height);state.image=reduced;$('zoom').value='1';$('panX').value=$('panY').value='0';extractPalette();$('empty').hidden=true;canvas.hidden=false;$('fileLabel').textContent=file.name||'붙여넣은 사진';updateButtons();refresh(true);status('준비되었습니다. 원하는 모습으로 편집해 보세요.');}catch{status('이 이미지를 열 수 없습니다. JPG 또는 PNG로 변환해 주세요.',true);}finally{URL.revokeObjectURL(url);$('photo').value='';}}
function setPicking(on){state.picking=on;$('eyedropper').setAttribute('aria-pressed',String(on));$('eyedropper').textContent=on?'스포이트 끄기':'스포이트';$('previewArea').classList.toggle('picking',on);if(on)status('미리보기의 사진을 누르면 주변 색상을 추출합니다.');}
canvas.addEventListener('click',e=>{if(!state.picking||state.busy||!photoRect)return;const r=canvas.getBoundingClientRect(),[w,h]=dimensions(),x=(e.clientX-r.left)/r.width*w,y=(e.clientY-r.top)/r.height*h,p=photoRect;if(x<p.x||x>p.x+p.w||y<p.y||y>p.y+p.h)return;extractPalette(p.sx+(x-p.x)/p.w*p.sw,p.sy+(y-p.y)/p.h*p.sh);render();status('선택한 부분의 색상을 추출했습니다.');});
function deliver(blob,filename){if(state.url)URL.revokeObjectURL(state.url);state.url=URL.createObjectURL(blob);const a=$('download');a.href=state.url;a.download=filename;a.hidden=false;a.click();}
async function exportPNG(){if(!state.image||state.busy)return;setBusy(true);status('PNG 생성 중…');try{const[w,h]=dimensions(),off=document.createElement('canvas');off.width=w;off.height=h;draw(off.getContext('2d'),w,h);const blob=await new Promise(r=>off.toBlob(r,'image/png'));if(!blob)throw Error('PNG 생성 실패');deliver(blob,`scene-${state.mode}-${w}x${h}.png`);status('PNG 저장을 시작했습니다.');}catch{status('PNG 저장에 실패했습니다. 다시 시도해 주세요.',true);}finally{setBusy(false);}}
function setBusy(busy){state.busy=busy;document.querySelectorAll('.editor input,.editor select,.editor textarea,.tabs button,.editor .text-button,.swatch').forEach(el=>el.disabled=busy);updateButtons();if(busy){resumePreview=previewPlaying;stop();}else if(state.mode==='focus'){refresh();if(resumePreview)play();resumePreview=false;}}
function exportGIF(){if(!state.image||state.busy)return;if(typeof GIF==='undefined'){status('GIF 모듈을 불러오지 못했습니다. vendor 폴더가 함께 배포되었는지 확인해 주세요.',true);return;}setBusy(true);$('cancel').hidden=false;$('progress').hidden=false;$('progress').value=0;status('GIF 프레임을 만드는 중…');const[w,h]=dimensions(),scale=number('quality')/Math.max(w,h),off=document.createElement('canvas');off.width=Math.round(w*scale);off.height=Math.round(h*scale);const g=off.getContext('2d');const gif=new GIF({workers:2,quality:8,width:off.width,height:off.height,workerScript:'./vendor/gif.worker.js',repeat:$('loop').checked?0:-1,background:'#151719'});state.gif=gif;let frame=0,done=false;const total=54;let timer;
 const finish=()=>{if(done)return;done=true;clearTimeout(timer);for(const worker of [...(gif.activeWorkers||[]),...(gif.freeWorkers||[])])worker.terminate();state.gif=null;$('cancel').hidden=true;$('progress').hidden=true;setBusy(false);};
 gif.on('progress',p=>{$('progress').value=25+p*75;status(`GIF 인코딩 중… ${Math.round(p*100)}%`);});gif.on('finished',blob=>{deliver(blob,`scene-focus-${off.width}x${off.height}.gif`);finish();status('GIF 저장을 시작했습니다.');});gif.on('abort',()=>{finish();status('GIF 생성을 취소했습니다.');});
 timer=setTimeout(()=>{if(done)return;try{gif.abort();}catch{}finish();status('GIF 생성 시간이 초과되었습니다. 더 작은 크기로 다시 시도해 주세요.',true);},180000);
 function frameStep(){if(done)return;try{for(let k=0;k<3&&frame<total;k++,frame++){g.setTransform(scale,0,0,scale,0,0);draw(g,w,h,frame*DURATION/total);g.setTransform(1,0,0,1,0,0);gif.addFrame(g,{copy:true,delay:frame%3===0?60:70});}$('progress').value=frame/total*25;if(frame<total)setTimeout(frameStep,0);else gif.render();}catch{finish();status('GIF 생성에 실패했습니다. 작은 크기로 다시 시도해 주세요.',true);}}
 state.cancel=()=>{gif.abort();finish();status('GIF 생성을 취소했습니다.');};frameStep();
}
$('photo').onchange=e=>loadPhoto(e.target.files[0]);$('choose').onclick=()=>$('photo').click();for(const event of ['dragenter','dragover'])$('drop').addEventListener(event,e=>{e.preventDefault();$('drop').classList.add('dragover');});for(const event of ['dragleave','drop'])$('drop').addEventListener(event,e=>{e.preventDefault();$('drop').classList.remove('dragover');if(event==='drop')loadPhoto(e.dataTransfer.files[0]);});document.addEventListener('paste',e=>{const item=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));if(item){e.preventDefault();loadPhoto(item.getAsFile());}});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));document.querySelector('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const modes=[...document.querySelectorAll('[data-mode]')].map(b=>b.dataset.mode),i=modes.indexOf(state.mode);const mode=e.key==='Home'?modes[0]:e.key==='End'?modes[modes.length-1]:e.key==='ArrowRight'?modes[(i+1)%modes.length]:modes[(i-1+modes.length)%modes.length];setMode(mode);$(mode+'Tab').focus();});
for(const id of ['title','artist','elapsed','duration','background','showPalette','size','zoom','panX','panY','caption','captionColor','italic','camera','orientation','loop','ticketTitle','ticketArtist','ticketDate','ticketVenue','ticketZone','ticketRow','ticketSeat','ticketGate','ticketBg','ticketSize'])$(id).addEventListener('input',()=>refresh(['camera','orientation','loop'].includes(id)));
$('white').onclick=()=>{$('background').value='#ffffff';render();};$('ticketWhite').onclick=()=>{$('ticketBg').value='#ffffff';render();};$('eyedropper').onclick=()=>setPicking(!state.picking);$('replay').onclick=()=>replay(true);$('png').onclick=exportPNG;$('gif').onclick=exportGIF;$('cancel').onclick=()=>state.cancel?.();
$('clear').onclick=()=>{if(state.busy)return;state.loadToken++;stop();previewTime=0;previewUI();state.image=null;setPicking(false);canvas.hidden=true;$('empty').hidden=false;$('fileLabel').textContent='사진 선택';$('download').hidden=true;if(state.url){URL.revokeObjectURL(state.url);state.url=null;}updateButtons();status('사진을 선택하면 저장할 수 있습니다.');};
$('share').onclick=async()=>{const url=location.href.split('#')[0];try{if(navigator.share){await navigator.share({title:'SCENE Studio',text:'사진으로 만드는 포스터와 모션',url});}else{await navigator.clipboard.writeText(url);status('페이지 주소를 복사했습니다.');}}catch(e){if(e.name!=='AbortError')status('주소를 복사하지 못했습니다. 브라우저 주소창에서 복사해 주세요.',true);}};
let resumeVisible=false;
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){resumeVisible=previewPlaying;stop();}
 else if(resumeVisible){resumeVisible=false;play();}
});
$('playPause').onclick=()=>{if(previewPlaying)stop();else play();};
$('timeline').addEventListener('input',()=>{
 if(!state.image||state.busy)return;
 const time=number('timeline');stop();previewTime=time;refresh();previewUI();
});window.addEventListener('beforeunload',()=>{if(state.url)URL.revokeObjectURL(state.url);});paletteUI();

for(const id of ['elapsed','duration']) $(id).addEventListener('change',()=>{const v=$(id).value.trim();if(!/^\d{1,2}:[0-5]\d$/.test(v)){$(id).value=id==='elapsed'?'1:24':'3:48';status('시간은 분:초 형식으로 입력해 주세요. 예: 3:48',true);}render();});
