import{d as Ie,e as Fe,f as ke,g as Le,h as We}from"./chunk-RT5W57VC.js";import{D as Ee,Fa as De,G as O,O as Me,Q as xe,T as $,V as Te,X as Re,Y as ye,_ as Z,b as ge,ba as be,ca as Se,e as N,g as we,la as He,ma as Pe,qa as L,va as Ce,wa as Ae,z as k}from"./chunk-NTALV72E.js";var Ue=matchMedia("(prefers-reduced-motion: reduce)").matches,ze=new URL("../../images/",import.meta.url).href,Je=[{img:"suite-desk-hd.webp",depth:"suite-desk-depth.png"},{img:"suite-pedicure-hd.webp",depth:"suite-pedicure-depth.png"}],W=4.6,Q=W*.75,ee=4,J=1.55,w=Math.atan(Q/2/ee),Qe=[[[.262,.128],[.078,.323],[.352,.25],[.279,.256],[.772,.119],[.675,.132],[.527,.141],[.745,.234],[.854,.23],[.554,.243],[.614,.241],[.835,.343],[.147,.322],[.613,.135],[.132,.602],[.296,.602],[.448,.606],[.819,.437],[.674,.237],[.397,.144],[.925,.227],[.16,.644],[.381,.604],[.201,.601],[.876,.675],[.466,.145]],[[.144,.58],[.334,.346],[.181,.637],[.128,.522],[.238,.526],[.204,.579],[.057,.637],[.486,.556],[.078,.49],[.073,.579],[.446,.694],[.238,.356],[.631,.385],[.171,.17],[.743,.215],[.161,.041],[.154,.475],[.246,.466],[.371,.417],[.91,.211],[.833,.235],[.3,.403],[.078,.716],[.188,.424],[.152,.097],[.141,.325]]],M=[Q,Q*.94],Ge=[1,.94],et=Qe.map((r,v)=>r.map(([l,m])=>[l/Ge[v],m]).filter(([l])=>l<.98)),_e=[-w,w];function st(r,v){let l;try{l=new De({antialias:!0})}catch{return null}let m=Math.min(innerWidth,innerHeight)<600;l.setPixelRatio(Math.min(devicePixelRatio||1,m?2:1.6)),l.outputColorSpace=k,l.toneMapping=we,l.domElement.className="suite-canvas",r.prepend(l.domElement);let h=new xe;h.background=new Me("#f9e6ec");let u=new Ae(70,1,.05,50),Be=new Z(new Pe(20,32,16),new L({side:ge,depthWrite:!1,vertexShader:"varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:"varying vec3 vP; void main(){ float g = smoothstep(-0.6, 0.9, -vP.z); vec3 c = mix(vec3(0.93,0.78,0.83), vec3(1.0,0.96,0.95), g); gl_FragColor = vec4(c,1.0); }"}));h.add(Be);let C=new We({count:m?40:70,scale:[7,5,4],size:3,speed:.2,opacity:.85,color:"#fff3d6",noise:1});C.position.set(0,0,-2.2),C.setPixelRatio(l.getPixelRatio()),h.add(C);let te=new Ce,ae=[],U=Je.map((e,t)=>{let a=te.load(ze+e.img);a.colorSpace=k,a.anisotropy=8;let i=te.load(ze+e.depth,E=>Xe(E.image,t)),d=new He(M[t],W,m?180:260,m?240:346),n=new L({transparent:!0,uniforms:{uMap:{value:a},uDepth:{value:i},uRelief:{value:J},uSide:{value:Math.sign(_e[t])},uReveal:{value:0}},vertexShader:`
        uniform sampler2D uDepth; uniform float uRelief; uniform float uReveal; uniform float uSide;
        varying vec2 vUv; varying float vD;
        void main(){
          vUv = uv;
          float d = texture2D(uDepth, uv).r;
          vD = d;
          vec3 p = position;
          // ease the relief to flat at the corner seam so the two photos meet without a gap
          float seam = uSide > 0.0 ? 1.0 - uv.x : uv.x;
          float keep = smoothstep(0.0, 0.08, seam);
          p.z += (d - 0.25) * uRelief * uReveal * keep;
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
        }`}),s=new Z(d,n),p=_e[t],f=Math.sign(p),H=Math.cos(w),P=Math.sin(w),g=M[t]/2;return s.position.set(-f*H*g,0,-ee/H+P*g),s.rotation.y=p,h.add(s),s});function Xe(e,t){let a=document.createElement("canvas");a.width=e.width,a.height=e.height;let i=a.getContext("2d",{willReadFrequently:!0});i.drawImage(e,0,0),ae[t]={w:a.width,h:a.height,px:i.getImageData(0,0,a.width,a.height).data}}function oe(e,t,a){let i=ae[e];if(!i)return .5;let d=Math.min(i.w-1,Math.max(0,Math.round(t*(i.w-1)))),n=Math.min(i.h-1,Math.max(0,Math.round((1-a)*(i.h-1))));return i.px[(n*i.w+d)*4]/255}let T=new Fe(l);T.addPass(new ke(h,u));let R=new Ie({uniforms:{tDiffuse:{value:null},uK:{value:.32},uAspect:{value:1},uTime:{value:0}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
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
      }`});T.addPass(R),T.addPass(new Le);let z=w*1.15,ne=z,y=.16,o={slide:.6,target:.6,vel:0,pitch:0,tp:0,tilt:0},c=null,b=performance.now(),ie=0,re=!1;r.addEventListener("pointerdown",e=>{if(!e.target.closest(".hs, .suite-views")){c={id:e.pointerId,x:e.clientX,y:e.clientY,start:o.target,lastX:e.clientX,lastT:performance.now()};try{r.setPointerCapture(e.pointerId)}catch{}o.vel=0,b=performance.now(),re||(re=!0,r.classList.add("touched"))}}),r.addEventListener("pointermove",e=>{if(c&&e.pointerId===c.id){let t=r.clientWidth;o.target=x(c.start-(e.clientX-c.x)/(t*.42),-1,1);let a=performance.now(),i=Math.max(1,a-c.lastT);o.vel=-(e.clientX-c.lastX)/(t*.42)/i*16,c.lastX=e.clientX,c.lastT=a,e.pointerType==="mouse"&&(o.tp=x(-(e.clientY-c.y)/t*.6,-y,y)),b=a}else if(e.pointerType==="mouse"){let t=r.getBoundingClientRect();o.tp=x(-((e.clientY-t.top)/t.height-.5)*y*1.2,-y,y)}});let _=e=>{c&&(!e||e.pointerId===c.id)&&(c=null,b=performance.now())};r.addEventListener("pointerup",_),r.addEventListener("pointercancel",_),r.addEventListener("lostpointercapture",_);let S=null;addEventListener("deviceorientation",e=>{e.gamma==null||!D||(S||(S=e.gamma),S+=(e.gamma-S)*.01,o.tilt=x((e.gamma-S)/25,-1,1)*.22)});function qe(e){o.target=e===0?.75:-.75,o.vel=0,b=performance.now()+4e3}let Ke=(()=>{let e=document.createElement("canvas");e.width=e.height=128;let t=e.getContext("2d");t.translate(64,64);let a=(n,s,p)=>{t.save(),t.rotate(p);let f=t.createLinearGradient(-n,0,n,0);f.addColorStop(0,"rgba(255,255,255,0)"),f.addColorStop(.5,"rgba(255,255,255,1)"),f.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=f,t.beginPath(),t.moveTo(-n,0),t.lineTo(0,-s),t.lineTo(n,0),t.lineTo(0,s),t.fill(),t.restore()};a(62,2.4,0),a(62,2.4,Math.PI/2),a(24,1.3,Math.PI/4),a(24,1.3,-Math.PI/4);let i=t.createRadialGradient(0,0,0,0,0,20);i.addColorStop(0,"rgba(255,255,255,1)"),i.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=i,t.beginPath(),t.arc(0,0,20,0,7),t.fill();let d=new Se(e);return d.colorSpace=k,d})(),Ve=["#ffffff","#fff4dc","#ffffff","#ffd9ea","#ffffff","#e6f2ff"],G=[];for(let e=0;e<6;e++){let t=new ye(new Re({map:Ke,color:Ve[e],transparent:!0,depthTest:!1,depthWrite:!1,blending:N}));t.visible=!1,t.renderOrder=5,h.add(t),G.push({sp:t,t:1,life:1,size:.2})}let B=1.2;function Ye(){let e=G.find(p=>p.t>=1);if(!e)return;let t=Math.random()<.8?o.slide<0?1:0:o.slide<0?0:1,a=et[t],[i,d]=a[Math.random()*a.length|0],n=U[t],s=oe(t,i,d);e.sp.position.set((i-.5)*M[t],(d-.5)*W,(s-.25)*J*n.material.uniforms.uReveal.value+.05).applyMatrix4(n.matrixWorld),e.t=0,e.life=.7+Math.random()*.6,e.size=.16+Math.random()*.14,e.rot=Math.random()*.5,e.sp.visible=!0}let X=m?36:60,q=new Te,se=new Float32Array(X*3),le=new Float32Array(X*4);for(let e=0;e<X;e++)se.set([(Math.random()-.5)*6,Math.random()*4.6-2.3,-.8-Math.random()*2.6],e*3),le.set([Math.random(),Math.random(),Math.random(),Math.random()],e*4);q.setAttribute("position",new $(se,3)),q.setAttribute("seed",new $(le,4));let ce=new L({uniforms:{uTime:{value:0},uPx:{value:l.getPixelRatio()}},vertexShader:`
      uniform float uTime; uniform float uPx; attribute vec4 seed;
      varying float vFlash; varying vec3 vCol;
      void main(){
        vec3 p = position;
        float fall = 0.10 + seed.x * 0.08;                         // slow drift down
        p.y = mod(p.y + 2.3 - uTime * fall, 4.6) - 2.3;
        p.x += sin(uTime * (0.3 + seed.y * 0.4) + seed.z * 6.28) * 0.18;
        float spin = uTime * (1.2 + seed.w * 2.2) + seed.z * 6.28;
        vFlash = pow(abs(sin(spin)), 14.0);                        // the flat flake catches the light briefly
        vCol = seed.y < 0.45 ? vec3(1.0, 0.86, 0.55) : seed.y < 0.75 ? vec3(1.0, 0.75, 0.86) : vec3(1.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.0 + 5.0 * vFlash) * uPx * (2.2 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      varying float vFlash; varying vec3 vCol;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float core = smoothstep(0.5, 0.0, d);
        float cross = max(smoothstep(0.08, 0.0, abs(q.x)), smoothstep(0.08, 0.0, abs(q.y))) * smoothstep(0.5, 0.1, d) * vFlash;
        float a = (core * (0.18 + 0.82 * vFlash) + cross) * 0.9;
        gl_FragColor = vec4(vCol * a, a);
      }`,transparent:!0,depthWrite:!1,depthTest:!1,blending:N}),K=new be(q,ce);K.renderOrder=4,K.frustumCulled=!1,h.add(K),v=v.map(e=>({...e,u:e.u/Ge[e.view]})).filter(e=>e.u<.98);let je=v.map(e=>{let t=document.createElement("button");return t.type="button",t.className="hs hs3d",t.textContent="\u2726",t.dataset.title=e.title,t.dataset.text=e.text,t.setAttribute("aria-label",e.title),t.setAttribute("aria-expanded","false"),r.appendChild(t),{...e,el:t,world:new O}});function Ne(){let e=r.clientWidth,t=r.clientHeight;je.forEach(a=>{let i=U[a.view],d=oe(a.view,a.u,a.v),n=new O((a.u-.5)*M[a.view],(a.v-.5)*W,(d-.25)*J*i.material.uniforms.uReveal.value+.02);a.world.copy(n).applyMatrix4(i.matrixWorld);let s=a.world.clone().project(u),p=s.x,f=s.y,H=e/t,P=R.uniforms.uK.value,g=p,E=f;for(let me=0;me<6;me++){let Y=g*H,j=E,Oe=Y*Y+j*j,he=(1-P*.42)/(1-P*.42*Oe*.6)/(1+P*.35),$e=Y*he/H,Ze=j*he;g+=p-$e,E+=f-Ze}let ve=s.z<1&&Math.abs(g)<.95&&Math.abs(E)<.92;a.el.style.opacity=ve?1:0,a.el.style.pointerEvents=ve?"auto":"none",a.el.style.transform=`translate(${((g+1)/2*e).toFixed(1)}px, ${((1-E)/2*t).toFixed(1)}px) translate(-50%, -50%)`})}let A=!1,D=!1,V=performance.now(),I=0,F=0;function de(e){if(!A)return;let t=Math.min(.05,(e-V)/1e3);V=e,I+=t,c||(Math.abs(o.vel)>5e-4&&(o.target=x(o.target+o.vel*t*60*.06,-1,1),o.vel*=Math.pow(.04,t)),!Ue&&performance.now()-b>8e3&&(ie+=t*.22,o.target+=(Math.sin(ie)*.7-o.target)*t*.4));let a=1-Math.pow(c?1e-5:.004,t);o.slide+=(x(o.target+o.tilt,-1,1)-o.slide)*a,o.pitch+=(o.tp-o.pitch)*a;let i=-o.slide*(o.slide<0?ne:z)*.78;u.position.set(o.slide*.7,o.pitch*.8,.45),u.rotation.set(o.pitch,i,0,"YXZ"),F=Math.min(1,F+t*.9);let d=1-Math.pow(1-F,3);U.forEach(n=>{n.material.uniforms.uReveal.value=d}),R.uniforms.uK.value=.32+(c?.04:0)*1,R.uniforms.uTime.value=I,C.update(I),Ue||(ce.uniforms.uTime.value=I,B-=t,B<=0&&F>.6&&(Ye(),B=.35+Math.random()*.9),G.forEach(n=>{if(n.t>=1){n.sp.visible=!1;return}n.t+=t/n.life;let s=Math.sin(Math.PI*Math.min(1,n.t))**2;n.sp.material.opacity=s,n.sp.scale.setScalar(n.size*(.3+.7*s)),n.sp.material.rotation=n.rot+n.t*.6})),T.render(t),Ne(),r.dispatchEvent(new CustomEvent("suiteview",{detail:o.slide<0?1:0})),requestAnimationFrame(de)}function ue(){let e=r.clientWidth,t=r.clientHeight;l.setSize(e,t,!1),T.setSize(e,t),u.aspect=e/t,u.fov=e/t<.8?80:e/t>1.6?50:60,u.updateProjectionMatrix(),R.uniforms.uAspect.value=e/t;let a=2*Math.atan(Math.tan(Ee.degToRad(u.fov)/2)*u.aspect),i=d=>{let n=Math.cos(w),s=Math.sin(w);return Math.atan2(n*d,ee/n-s*d)};z=Math.max(.06,i(M[0])-a/2*.86),ne=Math.max(.06,i(M[1])-a/2*.86)}function pe(){A||!D||document.hidden||(A=!0,V=performance.now(),requestAnimationFrame(de))}function fe(){A=!1}return new IntersectionObserver(([e])=>{D=e.isIntersecting,D?pe():fe()}).observe(r),document.addEventListener("visibilitychange",()=>document.hidden?fe():pe()),new ResizeObserver(ue).observe(r),ue(),{goTo:qe}}var x=(r,v,l)=>Math.max(v,Math.min(l,r));export{st as createSuite};
