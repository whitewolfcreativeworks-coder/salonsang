import{a as u,d as T,f as g,g as f,h as y,i as A,j as w,k as x,n as v}from"./chunk-WNWGJ45D.js";import{b as k}from"./chunk-B4DMZ2LY.js";var r=(a,s=document)=>s.querySelector(a),i=a=>String(a??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[s]),D=21,I=["Manicure","Pedicure","Full set","Fill","Overlay","Extras"],o,b,e;function V(){document.addEventListener("click",a=>{let s=a.target.closest("[data-book]");s&&(a.preventDefault(),R(s.dataset.book||null))})}function L(){o=document.createElement("div"),o.className="bk",o.hidden=!0,o.setAttribute("role","dialog"),o.setAttribute("aria-modal","true"),o.setAttribute("aria-labelledby","bkTitle"),o.innerHTML=`
    <div class="bk-back" data-close></div>
    <div class="bk-card">
      <header class="bk-head">
        <button class="bk-x" type="button" data-close aria-label="Close">\xD7</button>
        <p class="bk-kicker">Salon Sang \xB7 Online booking</p>
        <h2 class="bk-title" id="bkTitle"><span class="script">Book</span> your time</h2>
        <ol class="bk-steps" aria-hidden="true"><li data-s="1">Service</li><li data-s="2">Time</li><li data-s="3">You</li></ol>
        <p class="bk-demo" hidden>Preview mode: nothing is saved or sent</p>
      </header>
      <div class="bk-body" data-lenis-prevent></div>
    </div>`,document.body.appendChild(o),o.addEventListener("click",a=>{a.target.closest("[data-close]")&&O()}),document.addEventListener("keydown",a=>{a.key==="Escape"&&!o.hidden&&O()})}async function R(a){o||L(),e={step:1,cat:"Manicure",service:null,addons:[],slots:null,day:null,time:null},o.hidden=!1,document.documentElement.classList.add("no-scroll"),requestAnimationFrame(()=>o.classList.add("in")),r(".bk-demo",o).hidden=!v().demo,m('<div class="bk-loading"><i></i><i></i><i></i></div>');try{if(b=await v().info(),!b.open)return m(`<div class="bk-msg"><p>Online booking is resting for a moment \u{1F4A4}</p><a class="btn btn-pink" href="sms:${k}">Text Sang to book</a></div>`);if(a){let s=b.services.find(c=>String(c.id)===a||c.name===a);s&&(e.service=s,e.cat=s.category)}p()}catch(s){m(`<div class="bk-msg"><p>Hmm, booking couldn't load right now.</p><p>${i(s.message)}</p><a class="btn btn-pink" href="sms:${k}">Text Sang to book</a></div>`)}}function O(){o.classList.remove("in"),document.documentElement.classList.remove("no-scroll"),setTimeout(()=>{o.hidden=!0},300)}var m=a=>{r(".bk-body",o).innerHTML=a,r(".bk-body",o).scrollTop=0};function S(a){o.querySelectorAll(".bk-steps li").forEach(s=>{s.classList.toggle("on",+s.dataset.s===a),s.classList.toggle("done",+s.dataset.s<a)})}function p(){S(1);let a=b.services.filter(t=>!t.addon),s=b.services.filter(t=>t.addon),c=I.filter(t=>a.some(n=>n.category===t));m(`
    <div class="bk-cats" role="tablist">${c.map(t=>`<button type="button" role="tab" data-cat="${i(t)}" aria-selected="${t===e.cat}">${i(t)}</button>`).join("")}</div>
    <div class="bk-list">${a.filter(t=>t.category===e.cat).map(t=>`
      <button type="button" class="bk-svc${e.service?.id===t.id?" on":""}" data-svc="${t.id}">
        <span class="n">${i(t.name)}</span><span class="m">${A(t.minutes)}</span><span class="p">${i(t.price)}</span>
      </button>`).join("")}</div>
    ${e.service&&s.length?`<div class="bk-adds"><p class="bk-label">Add a little extra? <span>optional</span></p>
      <div class="bk-chips">${s.map(t=>`<button type="button" class="bk-chip${e.addons.includes(t.id)?" on":""}" data-add="${t.id}" aria-pressed="${e.addons.includes(t.id)}">${i(t.name)} <b>${i(t.price)}</b></button>`).join("")}</div></div>`:""}
    <div class="bk-foot"><button type="button" class="btn btn-pink bk-next" ${e.service?"":"disabled"}>Pick a time \u2192</button></div>`);let l=r(".bk-body",o);l.querySelectorAll("[data-cat]").forEach(t=>t.onclick=()=>{e.cat=t.dataset.cat,p()}),l.querySelectorAll("[data-svc]").forEach(t=>t.onclick=()=>{e.service=b.services.find(n=>n.id===+t.dataset.svc),e.slots=null,p()}),l.querySelectorAll("[data-add]").forEach(t=>t.onclick=()=>{let n=+t.dataset.add;e.addons=e.addons.includes(n)?e.addons.filter(d=>d!==n):[...e.addons,n],e.slots=null,p()}),r(".bk-next",l).onclick=()=>{e.step=2,h()}}async function h(){if(S(2),!e.slots){m('<div class="bk-loading"><i></i><i></i><i></i></div><p class="bk-sub">Finding Sang\u2019s open times\u2026</p>');try{e.slots=await v().slots(e.service.id,e.addons,u(),D)}catch(n){return m(`<div class="bk-msg"><p>${i(n.message)}</p><button type="button" class="btn btn-pink bk-back-btn">\u2190 Back</button></div>`),r(".bk-back-btn",o).onclick=p}}let a={};e.slots.forEach(n=>{var d;(a[d=u(n)]||(a[d]=[])).push(n)});let s=Array.from({length:D},(n,d)=>T(u(),d));(!e.day||!a[e.day])&&(e.day=s.find(n=>a[n])||null);let c=A(e.service.minutes+b.services.filter(n=>e.addons.includes(n.id)).reduce((n,d)=>n+d.minutes,0));m(`
    <p class="bk-pick"><b>${i(e.service.name)}</b>${e.addons.length?" + "+e.addons.map(n=>i(b.services.find(d=>d.id===n).name)).join(", "):""} \xB7 ${c}</p>
    ${e.day?`
    <div class="bk-days" data-lenis-prevent>${s.map(n=>`
      <button type="button" class="bk-day${n===e.day?" on":""}" data-day="${n}" ${a[n]?"":"disabled"}>
        <span>${n===u()?"Today":f(n,{weekday:"short"})}</span><b>${f(n,{day:"numeric"})}</b><i>${f(n,{month:"short"})}</i>
      </button>`).join("")}</div>
    <p class="bk-label">${i(y(e.day))}</p>
    <div class="bk-times">${a[e.day].map(n=>`<button type="button" class="bk-time${e.time?.getTime()===n.getTime()?" on":""}" data-t="${n.toISOString()}">${g(n)}</button>`).join("")}</div>`:`<div class="bk-msg"><p>No open times online in the next few weeks for this one, but Sang can often squeeze you in \u{1F496}</p><a class="btn btn-pink" href="sms:${k}">Text Sang</a></div>`}
    <div class="bk-foot"><button type="button" class="btn btn-ghost bk-prev">\u2190 Service</button><button type="button" class="btn btn-pink bk-next" ${e.time?"":"disabled"}>Almost done \u2192</button></div>`);let l=r(".bk-body",o);l.querySelectorAll("[data-day]").forEach(n=>n.onclick=()=>{e.day=n.dataset.day,e.time=null,h()}),l.querySelectorAll("[data-t]").forEach(n=>n.onclick=()=>{e.time=new Date(n.dataset.t),h()}),r(".bk-prev",l).onclick=p,r(".bk-next",l).onclick=$;let t=r(".bk-day.on",l);t&&t.scrollIntoView({inline:"center",block:"nearest"})}function $(a){S(3);let s=e.form||{name:"",phone:"",note:"",textsOk:!0};m(`
    <div class="bk-summary"><b>${i(e.service.name)}</b>${e.addons.length?" + "+e.addons.map(l=>i(b.services.find(t=>t.id===l).name)).join(", "):""}
      <span>${i(y(u(e.time)))} at ${g(e.time)}</span></div>
    <form class="bk-form" novalidate>
      <label>Your name<input name="name" autocomplete="name" required maxlength="60" value="${i(s.name)}"></label>
      <label>Mobile number<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="(541) 555-0123" value="${i(s.phone)}"></label>
      <label><span class="t">Anything Sang should know? <i>optional</i></span><textarea name="note" rows="2" maxlength="300" placeholder="Inspo, length, colors, allergies\u2026">${i(s.note)}</textarea></label>
      <label class="bk-check"><input type="checkbox" name="textsOk" ${s.textsOk?"checked":""}><span>Text me a confirmation and a little reminder on the day \u2728</span></label>
      ${a?`<p class="bk-err" role="alert">${i(a)}</p>`:""}
      <div class="bk-foot"><button type="button" class="btn btn-ghost bk-prev">\u2190 Time</button><button type="submit" class="btn btn-pink bk-go">Book it \u{1F496}</button></div>
      <p class="bk-fine">Texts come from Sang's own phone. Reply anytime to change or cancel.</p>
    </form>`);let c=r(".bk-form",o);r(".bk-prev",c).onclick=()=>{e.form=N(c),h()},c.onsubmit=async l=>{l.preventDefault();let t=e.form=N(c);if(t.name.trim().length<2)return $("Please enter your name.");if(!x(t.phone))return $("Please enter a valid 10-digit mobile number.");let n=r(".bk-go",c);n.disabled=!0,n.textContent="Booking\u2026";try{let d=await v().book({service:e.service.id,addons:e.addons,start:e.time,name:t.name.trim(),phone:t.phone,note:t.note.trim(),textsOk:t.textsOk});C(d,t)}catch(d){if(/taken/.test(d.message)){e.slots=null,e.time=null,await h();let E=document.createElement("p");E.className="bk-err",E.textContent=d.message,r(".bk-body",o).prepend(E)}else $(d.message)}}}var N=a=>({name:a.name.value,phone:a.phone.value,note:a.note.value,textsOk:a.textsOk.checked});function C(a,s){S(4);let c=new Date(a.starts_at),l=new Date(a.ends_at),t=s.name.trim().split(" ")[0],n=a.service+(a.addons?.length?" + "+a.addons.join(", "):"");m(`
    <div class="bk-done">
      <div class="bk-heart" aria-hidden="true">\u{1F485}</div>
      <h3>You're booked, ${i(t)}!</h3>
      <p class="bk-when"><b>${i(n)}</b><br>${i(y(u(c)))} at ${g(c)}</p>
      <p class="bk-where">Salon Sang \xB7 Sola Salon Studios, Suite 12<br>440 W 6th Ave, Eugene</p>
      ${s.textsOk?`<p class="bk-sub">A confirmation text is on its way to ${i(w(s.phone))}, and a sweet reminder will come on the day \u2728</p>`:""}
      <div class="bk-actions">
        <a class="btn btn-pink" download="salon-sang.ics" href="${P(n,c,l)}">Add to my calendar</a>
        <a class="btn btn-ghost" href="sms:${k}">Text Sang</a>
      </div>
      <button type="button" class="bk-close-link" data-close>Back to the salon</button>
    </div>`);let d=r(".bk-heart",o).getBoundingClientRect();window.sparkleBurst&&window.sparkleBurst(d.left+d.width/2,d.top+d.height/2,60)}function P(a,s,c){let l=n=>n.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""),t=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Salon Sang//Booking//EN","BEGIN:VEVENT",`UID:${l(s)}-${Math.random().toString(36).slice(2)}@salonsang.com`,`DTSTAMP:${l(new Date)}`,`DTSTART:${l(s)}`,`DTEND:${l(c)}`,`SUMMARY:${a} at Salon Sang \u{1F485}`,"LOCATION:Salon Sang\\, Sola Salon Studios Suite 12\\, 440 W 6th Ave\\, Eugene\\, OR 97401","DESCRIPTION:Need to change it? Call or text 530-648-4977","BEGIN:VALARM","TRIGGER:-PT2H","ACTION:DISPLAY","DESCRIPTION:Salon Sang today \u{1F485}","END:VALARM","END:VEVENT","END:VCALENDAR"].join(`\r
`);return"data:text/calendar;charset=utf-8,"+encodeURIComponent(t)}export{V as initBooking};
