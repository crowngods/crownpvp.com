/* CrownPVP Ascendant motion layer — progressive enhancement only. */
(()=>{'use strict';
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const progress=document.createElement('div');progress.className='asc-progress';document.body.appendChild(progress);
 const grain=document.createElement('div');grain.className='asc-grain';grain.setAttribute('aria-hidden','true');document.body.appendChild(grain);
 const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max>0?scrollY/max*100:0)+'%'};addEventListener('scroll',update,{passive:true});update();
 if(!reduce&&'IntersectionObserver'in window){
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('asc-visible');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -35px 0px'});
  document.querySelectorAll('main h1,main h2,main .hx-card,main .fold-side-plaque,main .hx-pagehead,main .hx-play,main .hx-side>*').forEach((el,i)=>{if(el.closest('header'))return;el.dataset.ascReveal='';el.style.transitionDelay=Math.min(i%5,4)*65+'ms';io.observe(el)});
 }
 // Gentle pointer spotlight, without hijacking cursor or clicks.
 if(!reduce&&matchMedia('(pointer:fine)').matches){
  let raf=0,x=-1000,y=-1000;document.addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;if(!raf)raf=requestAnimationFrame(()=>{document.body.style.setProperty('--asc-pointer-x',x+'px');document.body.style.setProperty('--asc-pointer-y',y+'px');raf=0})},{passive:true});
 }
})();