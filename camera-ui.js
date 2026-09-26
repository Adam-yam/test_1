'use strict';
function cameraCircle(c,x,y,r,fill,stroke,width=2){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function cameraIcon(c,name,x,y,s,color='#fff'){
 c.save();c.translate(x,y);c.scale(s/24,s/24);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.5;c.lineCap='round';c.lineJoin='round';
 const path=points=>{c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();};
 if(name==='flash'){path([[2,-10],[-6,1],[0,1],[-2,10],[7,-3],[1,-3],[2,-10]]);path([[-9,-10],[10,10]]);}
 if(name==='chevron')path([[-5,2],[0,-3],[5,2]]);
 if(name==='live'){[3,7,10].forEach(r=>cameraCircle(c,0,0,r,null,color,1.3));path([[-10,-10],[10,10]]);}
 if(name==='switch'){[-1,1].forEach(k=>{c.save();c.rotate(k<0?Math.PI:0);c.beginPath();c.arc(0,0,8,.25,2.7);c.stroke();path([[-8,0],[-7,5],[-2,4]]);c.restore();});}
 if(name==='sun'){cameraCircle(c,0,0,4,null,color,1.3);for(let i=0;i<8;i++){const a=i*Math.PI/4;path([[Math.cos(a)*7,Math.sin(a)*7],[Math.cos(a)*10,Math.sin(a)*10]]);}}
 if(name==='dots'){[-4,4].forEach(a=>[-4,4].forEach(b=>cameraCircle(c,a,b,1.6,color)));}
 if(name==='timer'){cameraCircle(c,0,1,8,null,color,1.5);path([[0,1],[0,-4]]);path([[-3,-10],[3,-10]]);}
 if(name==='movie'){c.strokeRect(-8,-6,12,12);path([[4,-3],[9,-6],[9,6],[4,3]]);}
 c.restore();
}
function cameraCaption(c,area,bottom,size){const cap=$('caption').value.trim();if(!cap)return;c.save();c.shadowColor='#000';c.shadowBlur=size*.24;wrapped(c,cap,area.x+area.w/2,bottom,size,area.w*.86,$('captionColor').value,$('italic').checked);c.restore();}
function deviceCamera(c,w,h,time){
 const kind=$('camera').value,t=clamp(time,0,DURATION),b=Math.min(w,h),portrait=h>w,phone=kind==='clean'||kind==='grid',galaxy=kind==='grid',camcorder=kind==='vhs';
 const seek=clamp((t-650)/1300,0,1),e=seek*seek*(3-2*seek),locked=t>=1950;
 const blur=(1-e)*b*.012,shake=Math.sin(t/91)*b*.002*(1-e),yellow='#ffd60a';
 c.save();c.fillStyle='#000';c.fillRect(0,0,w,h);
 let area;
 if(phone)area=portrait?{x:0,y:b*.12,w,h:h-b*.47}:{x:b*.12,y:0,w:w-b*.47,h};
 else area={x:0,y:0,w,h};
 const pr=photo(c,area.x,area.y,area.w,area.h,{blur,shake});
 if(phone){
  if(galaxy){c.save();c.strokeStyle='#ffffff42';for(let i=1;i<3;i++){line(c,area.x+area.w*i/3,area.y,area.x+area.w*i/3,area.y+area.h,b*.001);line(c,area.x,area.y+area.h*i/3,area.x+area.w,area.y+area.h*i/3,b*.001);}c.restore();}
  const topPoint=q=>portrait?[w*q,b*.06]:[b*.06,h*q];
  const iconAt=(name,q)=>{const[x,y]=topPoint(q);cameraIcon(c,name,x,y,b*.038);};
  iconAt('flash',.075);
  if(galaxy){const[x,y]=topPoint(.35);text(c,'12M',x,y+b*.009,b*.025,'#fff',500,'center');const[rx,ry]=topPoint(.65);text(c,portrait?'3:4':'4:3',rx,ry+b*.009,b*.025,'#fff',500,'center');iconAt('live',.925);}
  else{iconAt('chevron',.5);iconAt('live',.925);}
  const cx=area.x+area.w*.5+shake,cy=area.y+area.h*.45,sz=b*(.20-.035*e),focusColor=galaxy?(locked?'#ffe24c':'#fff'):yellow;
  if(galaxy){cameraCircle(c,cx,cy,sz*.43,null,focusColor,b*.002);cameraCircle(c,cx,cy,sz*.37,null,focusColor,b*.001);}
  else{c.strokeStyle=focusColor;c.lineWidth=b*.002;c.strokeRect(cx-sz/2,cy-sz/2,sz,sz);cameraIcon(c,'sun',cx+sz*.68,cy,b*.028,yellow);}
  if(locked&&!galaxy){const ly=area.y+b*.05;pillBadge(c,cx-b*.095,ly-b*.023,b*.19,b*.035,yellow);text(c,'AE/AF 잠금',cx,ly+b*.002,b*.02,'#1a1700',500,'center');}
  const zooms=galaxy?['.6','1×','2','3','5']:['.5','1×','2','5'];
  zooms.forEach((z,i)=>{const pos=(i-(zooms.length-1)/2)*b*.084,x=portrait?w/2+pos:area.x+area.w-b*.055,y=portrait?area.y+area.h-b*.066:h/2+pos;cameraCircle(c,x,y,b*(i===1?.031:.025),i===1&&galaxy?'#fff':'#0009');text(c,z,x,y+b*.009,b*.024,i===1?(galaxy?'#111':yellow):'#fff',i===1?600:400,'center');});
  const strip=portrait?area.y+area.h:area.x+area.w,shutterX=portrait?w/2:strip+b*.185,shutterY=portrait?strip+b*.20:h/2;
  const modes=galaxy?['인물 사진','사진','동영상','더보기']:['비디오','사진','인물 사진'];
  modes.forEach((label,i)=>{const offset=(i-1)*b*.19,x=portrait?w/2+offset:strip+b*.055,y=portrait?strip+b*.066:h/2+offset;c.save();if(!portrait){c.translate(x,y);c.rotate(-Math.PI/2);}if(galaxy&&i===1){c.fillStyle='#292929';rect(c,portrait?x-b*.062:-b*.062,portrait?y-b*.031:-b*.031,b*.124,b*.047,b*.023);}text(c,label,portrait?x:0,portrait?y:0,b*.026,i===1?(galaxy?'#fff':yellow):'#d0d0d0',i===1?600:400,'center');c.restore();});
  const press=t>SHUTTER-60&&t<SHUTTER+100?.94:1;
  cameraCircle(c,shutterX,shutterY,b*.087*press,null,'#fff',b*.007);cameraCircle(c,shutterX,shutterY,b*.073*press,'#fff');
  const tx=portrait?w*.12:shutterX,ty=portrait?shutterY:h*.16,fx=portrait?w*.88:shutterX,fy=portrait?shutterY:h*.84;
  c.save();c.beginPath();if(galaxy)c.arc(tx,ty,b*.052,0,Math.PI*2);else c.roundRect(tx-b*.05,ty-b*.05,b*.1,b*.1,b*.012);c.clip();const side=Math.min(state.image.width,state.image.height);c.drawImage(state.image,(state.image.width-side)/2,(state.image.height-side)/2,side,side,tx-b*.052,ty-b*.052,b*.104,b*.104);c.restore();
  if(!galaxy)cameraCircle(c,fx,fy,b*.052,'#222');cameraIcon(c,'switch',fx,fy,b*.059);
  if(galaxy){const dx=portrait?w*.935:strip+b*.055,dy=portrait?strip-b*.065:h*.925;cameraCircle(c,dx,dy,b*.03,'#000a');cameraIcon(c,'dots',dx,dy,b*.033);}
  cameraCaption(c,area,area.y+area.h-b*(portrait?.14:.065),b*.035);
 }else if(camcorder){
  c.save();c.shadowColor='#000';c.shadowBlur=b*.003;c.shadowOffsetX=b*.001;c.shadowOffsetY=b*.001;
  const pad=b*.045,fs=b*.032;
  text(c,'MENU',pad,pad+fs,fs,'#fff',600);batteryBadge(c,pad+b*.13,pad+b*.011,b*.05,b*.025,.75,'#fff');text(c,'75 min',pad+b*.20,pad+fs,fs*.84,'#fff');
  text(c,t<500?'STBY':'REC',w/2,pad+fs,fs,t<500?'#fff':'#ff3434',600,'center');if(t>=500)cameraCircle(c,w/2-b*.06,pad+fs*.68,b*.009,'#ff3434');
  const sec=String(Math.floor(t/1000)).padStart(2,'0');text(c,'0:00:'+sec,w-pad,pad+fs,fs,'#fff',500,'right');text(c,'HD  FX   50i',w-pad,pad+fs*2.45,fs*.84,'#fff',500,'right');text(c,'[80 min]',w-pad,pad+fs*3.75,fs*.84,'#fff',400,'right');
  text(c,'W',pad, h*.22,fs*.8,'#fff');text(c,'T',pad+b*.245,h*.22,fs*.8,'#fff');c.strokeStyle='#fff';c.lineWidth=b*.002;c.strokeRect(pad+b*.045,h*.22-b*.018,b*.18,b*.014);c.fillStyle='#fff';c.fillRect(pad+b*.077,h*.22-b*.021,b*.007,b*.02);
  bracket(c,w*.5-b*.10,h*.5-b*.08,b*.20,b*.16,b*.027,locked?'#8df57b':'#fff',b*.002);
  text(c,'MODE',pad,h-pad,fs*.88,'#fff',600);text(c,'AUTO',w-pad,h-pad,fs*.88,'#9dff9b',600,'right');
  cameraIcon(c,'movie',pad+b*.025,h-pad-b*.095,b*.044);text(c,'START/STOP',pad+b*.065,h-pad-b*.084,fs*.7,'#fff',500);
  c.restore();cameraCaption(c,area,h-b*.15,b*.035);
  c.save();c.globalAlpha=.07;c.fillStyle='#000';for(let y=0;y<h;y+=b*.006)c.fillRect(0,y,w,b*.001);c.restore();
 }else{
  const pad=b*.035,fs=b*.035;
  c.fillStyle='#000b';c.fillRect(0,0,w,b*.095);c.fillRect(0,h-b*.11,w,b*.11);
  text(c,'M',pad,b*.061,fs*1.25,'#fff',700);text(c,'1   932',pad+b*.09,b*.061,fs*.8,'#fff');text(c,'RAW   3:2   24M',w/2,b*.061,fs*.8,'#fff',500,'center');batteryBadge(c,w-pad-b*.07,b*.03,b*.06,b*.027,.83,'#fff');
  text(c,'AF-S',pad,b*.17,fs*.8,'#fff');text(c,'AWB',pad,b*.24,fs*.8,'#fff');text(c,'DRO AUTO',pad,b*.31,fs*.62,'#fff');
  bracket(c,w/2-b*.14,h/2-b*.11,b*.28,b*.22,b*.045,locked?'#57ec6c':'#fff',b*.003);
  if(locked)cameraCircle(c,pad,h-b*.05,b*.009,'#57ec6c');
  const stats=['1/125','F2.8','±0.0','ISO 200'];stats.forEach((s,i)=>text(c,s,w*(.16+i*.225),h-b*.04,fs,'#fff',500,'center'));
  histogram(c,w-pad-b*.21,h-b*.24,b*.21,b*.10,'#fff');cameraCaption(c,area,h-b*.30,b*.035);
 }
 if(!camcorder&&t>=SHUTTER&&t<SHUTTER+130){c.fillStyle=`rgba(255,255,255,${(1-(t-SHUTTER)/130)*.9})`;c.fillRect(area.x,area.y,area.w,area.h);}
 c.restore();return pr;
}
