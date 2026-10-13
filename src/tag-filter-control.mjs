import {customLabelOptions} from './holder-model.mjs';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Both address views share selection, manual-label options and keyboard behavior.
export function createTagFilter({getManual,onChange},root=document){
 const $=id=>root.getElementById(id),inputs=()=>[...$('filter').querySelectorAll('input[type=checkbox]')];
 const selected=()=>{const all=inputs(),checked=all.filter(input=>input.checked);return checked.length===all.length&&checked.length?['all']:checked.map(input=>input.value);};
 function label(){
  const all=inputs(),checked=all.filter(input=>input.checked);
  $('filter-label').textContent=checked.length===all.length&&checked.length?'全部标签（已全选）':checked.length?checked.length===1?checked[0].dataset.label||checked[0].parentElement.textContent.trim():`已选 ${checked.length} 项`:'不限标签';
 }
 function refresh(){
  const all=inputs(),checked=new Set(all.filter(input=>input.checked).map(input=>input.value)),selectAll=all.length>0&&checked.size===all.length;
  const options=customLabelOptions(getManual());
  $('custom-label-filters').innerHTML=options.length?`<p class="custom-label-heading">已添加标签</p>${options.map(option=>`<label><input type="checkbox" value="${escape(option.value)}" data-label="${escape(option.text)}"${selectAll||checked.has(option.value)?' checked':''}><span>${escape(option.text)}</span><small>${option.count} 个地址</small></label>`).join('')}`:'';
  label();
 }
 function update(){label();onChange(selected());}
 function close(){$('tag-filter').open=false;$('filter-summary').focus();}
 function clear(){for(const input of inputs())input.checked=false;update();}
 $('filter').addEventListener('change',update);
 $('close-filters').addEventListener('click',close);
 $('select-all-filters').addEventListener('click',()=>{for(const input of inputs())input.checked=true;update();});
 $('clear-filters').addEventListener('click',clear);
 root.addEventListener('click',e=>{if(!$('tag-filter').contains(e.target))$('tag-filter').open=false;});
 $('tag-filter').addEventListener('keydown',e=>{if(e.key==='Escape'){close();e.preventDefault();}});
 return {selected,refresh,update,clear};
}
