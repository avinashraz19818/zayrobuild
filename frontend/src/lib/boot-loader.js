// Keep the exact same DOM/animation across bootstrap -> React, outside React's root.
export function retainBootLoader(){
 const loader=document.querySelector('#root > .boot-screen');
 if(loader){loader.dataset.retained='true';document.body.appendChild(loader);setBootStage('Getting your panel ready…',88);}
}
export function setBootStage(message,progress){
 const loader=document.querySelector('.boot-screen');if(!loader)return;
 const status=loader.querySelector('#boot-status');if(status)status.textContent=message;
 loader.style.setProperty('--boot-progress',`${progress}%`);
}
export function finishBootLoader(){
 const loader=document.querySelector('.boot-screen');if(!loader||loader.dataset.finished)return;
 loader.dataset.finished='true';setBootStage('Your panel is ready',100);
 loader.classList.add('boot-complete');
 setTimeout(()=>loader.remove(),300);
}
export function removeBootLoader(){document.querySelector('.boot-screen')?.remove();}
export function updateBootBrand(config){
 const name=String(config?.site_name||'').trim();
 if(name){const title=document.querySelector('.boot-intro h1');if(title)title.textContent=name;}
}
