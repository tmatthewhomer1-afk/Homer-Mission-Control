(()=>{
function loadScript(src,onload){
  const s=document.createElement('script');
  s.src=src;
  s.async=false;
  if(onload)s.onload=onload;
  document.head.appendChild(s);
}
loadScript('v38-core.js?v=20260820-1',()=>loadScript('v39.js?v=20260820-1'));
})();
