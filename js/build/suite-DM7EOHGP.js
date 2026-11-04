import{F as le,G as ce,I as X,M as ue,N as pe,S as de,W as ve,X as me,Y as fe,Z as he,_ as ge,a as oe,c as ne,i as W,k as ie,n as _,r as re,t as se,y as F}from"./chunk-U6Z7KA3H.js";var Ue=matchMedia("(prefers-reduced-motion: reduce)").matches,we=new URL("../../images/",import.meta.url).href,ke=[{img:"suite-desk-hd.webp",depth:"suite-desk-depth.png"},{img:"suite-pedicure-hd.webp",depth:"suite-pedicure-depth.png"}],z=4.6,K=z*.75,Y=4,Ee=1.55,N=Math.atan(K/2/Y),xe=[N,-N];function Xe(n,P){let s;try{s=new de({antialias:!0})}catch{return null}let x=Math.min(innerWidth,innerHeight)<600;s.setPixelRatio(Math.min(devicePixelRatio||1,x?2:1.6)),s.outputColorSpace=W,s.toneMapping=ne,s.domElement.className="suite-canvas",n.prepend(s.domElement);let v=new se;v.background=new re("#f9e6ec");let l=new pe(70,1,.05,50),Me=new F(new ce(20,32,16),new X({side:oe,depthWrite:!1,vertexShader:"varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:"varying vec3 vP; void main(){ float g = smoothstep(-0.6, 0.9, -vP.z); vec3 c = mix(vec3(0.93,0.78,0.83), vec3(1.0,0.96,0.95), g); gl_FragColor = vec4(c,1.0); }"}));v.add(Me);let M=new ge({count:x?40:70,scale:[7,5,4],size:3,speed:.2,opacity:.85,color:"#fff3d6",noise:1});M.position.set(0,0,-2.2),M.setPixelRatio(s.getPixelRatio()),v.add(M);let V=new ue,j=[],q=ke.map((e,t)=>{let a=V.load(we+e.img);a.colorSpace=W,a.anisotropy=8;let i=V.load(we+e.depth,b=>Re(b.image,t)),u=new le(K,z,x?180:260,x?240:346),p=new X({transparent:!0,uniforms:{uMap:{value:a},uDepth:{value:i},uRelief:{value:Ee},uSide:{value:t===0?1:-1},uReveal:{value:0}},vertexShader:`
        uniform sampler2D uDepth; uniform float uRelief; uniform float uReveal;
        varying vec2 vUv; varying float vD;
        void main(){
          vUv = uv;
          float d = texture2D(uDepth, uv).r;
          vD = d;
          vec3 p = position;
          p.z += (d - 0.25) * uRelief * uReveal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,fragmentShader:`
        uniform sampler2D uMap; uniform float uSide; uniform float uReveal;
        varying vec2 vUv; varying float vD;
        void main(){
          vec4 c = texture2D(uMap, vUv);
          // feather the outer edges into the glow; keep the corner seam crisp
          float outer = uSide > 0.0 ? smoothstep(0.0, 0.04, vUv.x) : smoothstep(1.0, 0.96, vUv.x);
          float tb = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
          // depth fog: far wall a touch softer, near things pop
          c.rgb = mix(c.rgb * 0.94 + 0.06, c.rgb * 1.04, vD);
          gl_FragColor = vec4(c.rgb, outer * tb * uReveal);
        }`}),c=new F(u,p),E=xe[t];return c.position.set(-Math.sin(E)*Y,0,-Math.cos(E)*Y),c.lookAt(0,0,0),v.add(c),c});function Re(e,t){let a=document.createElement("canvas");a.width=e.width,a.height=e.height;let i=a.getContext("2d",{willReadFrequently:!0});i.drawImage(e,0,0),j[t]={w:a.width,h:a.height,px:i.getImageData(0,0,a.width,a.height).data}}function ye(e,t,a){let i=j[e];if(!i)return .5;let u=Math.min(i.w-1,Math.max(0,Math.round(t*(i.w-1)))),p=Math.min(i.h-1,Math.max(0,Math.round((1-a)*(i.h-1))));return i.px[(p*i.w+u)*4]/255}let m=new me(s);m.addPass(new fe(v,l));let f=new ve({uniforms:{tDiffuse:{value:null},uK:{value:.32},uAspect:{value:1},uTime:{value:0}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
      uniform sampler2D tDiffuse; uniform float uK; uniform float uAspect; uniform float uTime;
      varying vec2 vUv;
      vec2 barrel(vec2 uv, float k){
        vec2 p = uv * 2.0 - 1.0; p.x *= uAspect;
        float r2 = dot(p, p);
        p *= (1.0 - k * 0.42) / (1.0 - k * 0.42 * r2 * 0.6) ;
        p *= 1.0 / (1.0 + k * 0.35);
        p.x /= uAspect;
        return p * 0.5 + 0.5;
      }
      void main(){
        vec2 c = vUv * 2.0 - 1.0;
        float r = length(c);
        // tiny chromatic split toward the edges, like real glass
        float ca = 0.0022 * r * r;
        vec3 col;
        col.r = texture2D(tDiffuse, barrel(vUv, uK + ca * 8.0)).r;
        col.g = texture2D(tDiffuse, barrel(vUv, uK)).g;
        col.b = texture2D(tDiffuse, barrel(vUv, uK - ca * 8.0)).b;
        // soft pink vignette
        vec2 cv = c; cv.x *= min(uAspect, 1.25) / max(uAspect, 1.0) * 1.0; float vig = smoothstep(1.5, 0.75, length(cv));
        col = mix(vec3(0.96, 0.83, 0.88), col, vig);
        gl_FragColor = vec4(col, 1.0);
      }`});m.addPass(f),m.addPass(new he);let R=xe[0]*1.15,Te=-R,h=.16,o={slide:-.6,target:-.6,vel:0,pitch:0,tp:0,tilt:0},r=null,g=performance.now(),B=0,G=!1;n.addEventListener("pointerdown",e=>{if(!e.target.closest(".hs, .suite-views")){r={id:e.pointerId,x:e.clientX,y:e.clientY,start:o.target,lastX:e.clientX,lastT:performance.now()};try{n.setPointerCapture(e.pointerId)}catch{}o.vel=0,g=performance.now(),G||(G=!0,n.classList.add("touched"))}}),n.addEventListener("pointermove",e=>{if(r&&e.pointerId===r.id){let t=n.clientWidth;o.target=d(r.start-(e.clientX-r.x)/(t*.42),-1,1);let a=performance.now(),i=Math.max(1,a-r.lastT);o.vel=-(e.clientX-r.lastX)/(t*.42)/i*16,r.lastX=e.clientX,r.lastT=a,e.pointerType==="mouse"&&(o.tp=d(-(e.clientY-r.y)/t*.6,-h,h)),g=a}else if(e.pointerType==="mouse"){let t=n.getBoundingClientRect();o.tp=d(-((e.clientY-t.top)/t.height-.5)*h*1.2,-h,h)}});let D=e=>{r&&(!e||e.pointerId===r.id)&&(r=null,g=performance.now())};n.addEventListener("pointerup",D),n.addEventListener("pointercancel",D),n.addEventListener("lostpointercapture",D);let w=null;addEventListener("deviceorientation",e=>{e.gamma==null||!T||(w||(w=e.gamma),w+=(e.gamma-w)*.01,o.tilt=d((e.gamma-w)/25,-1,1)*.22)});function be(e){o.target=e===0?-.75:.75,o.vel=0,g=performance.now()+4e3}let Se=P.map(e=>{let t=document.createElement("button");return t.type="button",t.className="hs hs3d",t.textContent="\u2726",t.dataset.title=e.title,t.dataset.text=e.text,t.setAttribute("aria-label",e.title),t.setAttribute("aria-expanded","false"),n.appendChild(t),{...e,el:t,world:new _}});function He(){let e=n.clientWidth,t=n.clientHeight;Se.forEach(a=>{let i=q[a.view],u=ye(a.view,a.u,a.v),p=new _((a.u-.5)*K,(a.v-.5)*z,(u-.25)*Ee*i.material.uniforms.uReveal.value+.02);a.world.copy(p).applyMatrix4(i.matrixWorld);let c=a.world.clone().project(l),E=c.x,b=c.y,Q=e/t,C=f.uniforms.uK.value,S=E,H=b;for(let te=0;te<6;te++){let L=S*Q,I=H,Pe=L*L+I*I,ae=(1-C*.42)/(1-C*.42*Pe*.6)/(1+C*.35),De=L*ae/Q,Ae=I*ae;S+=E-De,H+=b-Ae}let ee=c.z<1&&Math.abs(S)<.95&&Math.abs(H)<.92;a.el.style.opacity=ee?1:0,a.el.style.pointerEvents=ee?"auto":"none",a.el.style.transform=`translate(${((S+1)/2*e).toFixed(1)}px, ${((1-H)/2*t).toFixed(1)}px) translate(-50%, -50%)`})}let y=!1,T=!1,A=performance.now(),U=0,k=0;function O(e){if(!y)return;let t=Math.min(.05,(e-A)/1e3);A=e,U+=t,r||(Math.abs(o.vel)>5e-4&&(o.target=d(o.target+o.vel*t*60*.06,-1,1),o.vel*=Math.pow(.04,t)),!Ue&&performance.now()-g>8e3&&(B+=t*.22,o.target+=(Math.sin(B)*.7-o.target)*t*.4));let a=1-Math.pow(r?1e-5:.004,t);o.slide+=(d(o.target+o.tilt,-1,1)-o.slide)*a,o.pitch+=(o.tp-o.pitch)*a;let i=-o.slide*R*.78;l.position.set(o.slide*.7,o.pitch*.8,.45),l.rotation.set(o.pitch,i,0,"YXZ"),k=Math.min(1,k+t*.9);let u=1-Math.pow(1-k,3);q.forEach(p=>{p.material.uniforms.uReveal.value=u}),f.uniforms.uK.value=.32+(r?.04:0)*1,f.uniforms.uTime.value=U,M.update(U),m.render(t),He(),n.dispatchEvent(new CustomEvent("suiteview",{detail:o.slide<0?0:1})),requestAnimationFrame(O)}function $(){let e=n.clientWidth,t=n.clientHeight;s.setSize(e,t,!1),m.setSize(e,t),l.aspect=e/t,l.fov=e/t<.8?80:e/t>1.6?50:60,l.updateProjectionMatrix(),f.uniforms.uAspect.value=e/t;let a=2*Math.atan(Math.tan(ie.degToRad(l.fov)/2)*l.aspect);R=Math.max(.06,2*N-a/2*.86),Te=-R}function Z(){y||!T||document.hidden||(y=!0,A=performance.now(),requestAnimationFrame(O))}function J(){y=!1}return new IntersectionObserver(([e])=>{T=e.isIntersecting,T?Z():J()}).observe(n),document.addEventListener("visibilitychange",()=>document.hidden?J():Z()),new ResizeObserver($).observe(n),$(),{goTo:be}}var d=(n,P,s)=>Math.max(P,Math.min(s,n));export{Xe as createSuite};
