import{d as Ae,e as De,f as ke,g as Fe,h as Ie}from"./chunk-RT5W57VC.js";import{D as ge,Fa as Ce,G as N,O as Ee,Q as we,T as O,V as xe,X as Me,Y as Te,_ as $,b as me,ba as ye,ca as Re,e as j,g as he,la as be,ma as Se,qa as D,va as Pe,wa as He,z as A}from"./chunk-NTALV72E.js";var Le=matchMedia("(prefers-reduced-motion: reduce)").matches,Ue=new URL("../../images/",import.meta.url).href,$e=[{img:"suite-desk-hd.webp",depth:"suite-desk-depth.png"},{img:"suite-pedicure-hd.webp",depth:"suite-pedicure-depth.png"}],k=4.6,F=k*.75,J=4,Z=1.55,I=Math.atan(F/2/J),Ze=[[[.262,.128],[.078,.323],[.352,.25],[.279,.256],[.772,.119],[.675,.132],[.527,.141],[.745,.234],[.854,.23],[.554,.243],[.614,.241],[.835,.343],[.147,.322],[.613,.135],[.132,.602],[.296,.602],[.448,.606],[.819,.437],[.674,.237],[.397,.144],[.925,.227],[.16,.644],[.381,.604],[.201,.601],[.876,.675],[.466,.145]],[[.144,.58],[.334,.346],[.181,.637],[.128,.522],[.238,.526],[.204,.579],[.057,.637],[.486,.556],[.078,.49],[.073,.579],[.446,.694],[.238,.356],[.631,.385],[.171,.17],[.743,.215],[.161,.041],[.154,.475],[.246,.466],[.371,.417],[.91,.211],[.833,.235],[.3,.403],[.078,.716],[.188,.424],[.152,.097],[.141,.325]]],ze=[-I,I];function it(n,L){let d;try{d=new Ce({antialias:!0})}catch{return null}let h=Math.min(innerWidth,innerHeight)<600;d.setPixelRatio(Math.min(devicePixelRatio||1,h?2:1.6)),d.outputColorSpace=A,d.toneMapping=he,d.domElement.className="suite-canvas",n.prepend(d.domElement);let v=new we;v.background=new Ee("#f9e6ec");let u=new He(70,1,.05,50),We=new $(new Se(20,32,16),new D({side:me,depthWrite:!1,vertexShader:"varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:"varying vec3 vP; void main(){ float g = smoothstep(-0.6, 0.9, -vP.z); vec3 c = mix(vec3(0.93,0.78,0.83), vec3(1.0,0.96,0.95), g); gl_FragColor = vec4(c,1.0); }"}));v.add(We);let T=new Ie({count:h?40:70,scale:[7,5,4],size:3,speed:.2,opacity:.85,color:"#fff3d6",noise:1});T.position.set(0,0,-2.2),T.setPixelRatio(d.getPixelRatio()),v.add(T);let Q=new Pe,ee=[],U=$e.map((e,t)=>{let a=Q.load(Ue+e.img);a.colorSpace=A,a.anisotropy=8;let r=Q.load(Ue+e.depth,f=>_e(f.image,t)),c=new be(F,k,h?180:260,h?240:346),i=new D({transparent:!0,uniforms:{uMap:{value:a},uDepth:{value:r},uRelief:{value:Z},uSide:{value:Math.sign(ze[t])},uReveal:{value:0}},vertexShader:`
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
        }`}),l=new $(c,i),p=ze[t];return l.position.set(-Math.sin(p)*J,0,-Math.cos(p)*J),l.lookAt(0,0,0),v.add(l),l});function _e(e,t){let a=document.createElement("canvas");a.width=e.width,a.height=e.height;let r=a.getContext("2d",{willReadFrequently:!0});r.drawImage(e,0,0),ee[t]={w:a.width,h:a.height,px:r.getImageData(0,0,a.width,a.height).data}}function te(e,t,a){let r=ee[e];if(!r)return .5;let c=Math.min(r.w-1,Math.max(0,Math.round(t*(r.w-1)))),i=Math.min(r.h-1,Math.max(0,Math.round((1-a)*(r.h-1))));return r.px[(i*r.w+c)*4]/255}let g=new De(d);g.addPass(new ke(v,u));let E=new Ae({uniforms:{tDiffuse:{value:null},uK:{value:.32},uAspect:{value:1},uTime:{value:0}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
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
      }`});g.addPass(E),g.addPass(new Fe);let y=I*1.15,Ge=-y,w=.16,o={slide:.6,target:.6,vel:0,pitch:0,tp:0,tilt:0},s=null,x=performance.now(),ae=0,oe=!1;n.addEventListener("pointerdown",e=>{if(!e.target.closest(".hs, .suite-views")){s={id:e.pointerId,x:e.clientX,y:e.clientY,start:o.target,lastX:e.clientX,lastT:performance.now()};try{n.setPointerCapture(e.pointerId)}catch{}o.vel=0,x=performance.now(),oe||(oe=!0,n.classList.add("touched"))}}),n.addEventListener("pointermove",e=>{if(s&&e.pointerId===s.id){let t=n.clientWidth;o.target=m(s.start-(e.clientX-s.x)/(t*.42),-1,1);let a=performance.now(),r=Math.max(1,a-s.lastT);o.vel=-(e.clientX-s.lastX)/(t*.42)/r*16,s.lastX=e.clientX,s.lastT=a,e.pointerType==="mouse"&&(o.tp=m(-(e.clientY-s.y)/t*.6,-w,w)),x=a}else if(e.pointerType==="mouse"){let t=n.getBoundingClientRect();o.tp=m(-((e.clientY-t.top)/t.height-.5)*w*1.2,-w,w)}});let z=e=>{s&&(!e||e.pointerId===s.id)&&(s=null,x=performance.now())};n.addEventListener("pointerup",z),n.addEventListener("pointercancel",z),n.addEventListener("lostpointercapture",z);let M=null;addEventListener("deviceorientation",e=>{e.gamma==null||!b||(M||(M=e.gamma),M+=(e.gamma-M)*.01,o.tilt=m((e.gamma-M)/25,-1,1)*.22)});function Be(e){o.target=e===0?.75:-.75,o.vel=0,x=performance.now()+4e3}let Xe=(()=>{let e=document.createElement("canvas");e.width=e.height=128;let t=e.getContext("2d");t.translate(64,64);let a=(i,l,p)=>{t.save(),t.rotate(p);let f=t.createLinearGradient(-i,0,i,0);f.addColorStop(0,"rgba(255,255,255,0)"),f.addColorStop(.5,"rgba(255,255,255,1)"),f.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=f,t.beginPath(),t.moveTo(-i,0),t.lineTo(0,-l),t.lineTo(i,0),t.lineTo(0,l),t.fill(),t.restore()};a(62,2.4,0),a(62,2.4,Math.PI/2),a(24,1.3,Math.PI/4),a(24,1.3,-Math.PI/4);let r=t.createRadialGradient(0,0,0,0,0,20);r.addColorStop(0,"rgba(255,255,255,1)"),r.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=r,t.beginPath(),t.arc(0,0,20,0,7),t.fill();let c=new Re(e);return c.colorSpace=A,c})(),qe=["#ffffff","#fff4dc","#ffffff","#ffd9ea","#ffffff","#e6f2ff"],W=[];for(let e=0;e<6;e++){let t=new Te(new Me({map:Xe,color:qe[e],transparent:!0,depthTest:!1,depthWrite:!1,blending:j}));t.visible=!1,t.renderOrder=5,v.add(t),W.push({sp:t,t:1,life:1,size:.2})}let _=1.2;function Ke(){let e=W.find(p=>p.t>=1);if(!e)return;let t=Math.random()<.8?o.slide<0?1:0:o.slide<0?0:1,a=Ze[t],[r,c]=a[Math.random()*a.length|0],i=U[t],l=te(t,r,c);e.sp.position.set((r-.5)*F,(c-.5)*k,(l-.25)*Z*i.material.uniforms.uReveal.value+.05).applyMatrix4(i.matrixWorld),e.t=0,e.life=.7+Math.random()*.6,e.size=.16+Math.random()*.14,e.rot=Math.random()*.5,e.sp.visible=!0}let G=h?36:60,B=new xe,ie=new Float32Array(G*3),re=new Float32Array(G*4);for(let e=0;e<G;e++)ie.set([(Math.random()-.5)*6,Math.random()*4.6-2.3,-.8-Math.random()*2.6],e*3),re.set([Math.random(),Math.random(),Math.random(),Math.random()],e*4);B.setAttribute("position",new O(ie,3)),B.setAttribute("seed",new O(re,4));let ne=new D({uniforms:{uTime:{value:0},uPx:{value:d.getPixelRatio()}},vertexShader:`
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
      }`,transparent:!0,depthWrite:!1,depthTest:!1,blending:j}),X=new ye(B,ne);X.renderOrder=4,X.frustumCulled=!1,v.add(X);let Ve=L.map(e=>{let t=document.createElement("button");return t.type="button",t.className="hs hs3d",t.textContent="\u2726",t.dataset.title=e.title,t.dataset.text=e.text,t.setAttribute("aria-label",e.title),t.setAttribute("aria-expanded","false"),n.appendChild(t),{...e,el:t,world:new N}});function Ye(){let e=n.clientWidth,t=n.clientHeight;Ve.forEach(a=>{let r=U[a.view],c=te(a.view,a.u,a.v),i=new N((a.u-.5)*F,(a.v-.5)*k,(c-.25)*Z*r.material.uniforms.uReveal.value+.02);a.world.copy(i).applyMatrix4(r.matrixWorld);let l=a.world.clone().project(u),p=l.x,f=l.y,ue=e/t,K=E.uniforms.uK.value,H=p,C=f;for(let fe=0;fe<6;fe++){let V=H*ue,Y=C,je=V*V+Y*Y,ve=(1-K*.42)/(1-K*.42*je*.6)/(1+K*.35),Ne=V*ve/ue,Oe=Y*ve;H+=p-Ne,C+=f-Oe}let pe=l.z<1&&Math.abs(H)<.95&&Math.abs(C)<.92;a.el.style.opacity=pe?1:0,a.el.style.pointerEvents=pe?"auto":"none",a.el.style.transform=`translate(${((H+1)/2*e).toFixed(1)}px, ${((1-C)/2*t).toFixed(1)}px) translate(-50%, -50%)`})}let R=!1,b=!1,q=performance.now(),S=0,P=0;function se(e){if(!R)return;let t=Math.min(.05,(e-q)/1e3);q=e,S+=t,s||(Math.abs(o.vel)>5e-4&&(o.target=m(o.target+o.vel*t*60*.06,-1,1),o.vel*=Math.pow(.04,t)),!Le&&performance.now()-x>8e3&&(ae+=t*.22,o.target+=(Math.sin(ae)*.7-o.target)*t*.4));let a=1-Math.pow(s?1e-5:.004,t);o.slide+=(m(o.target+o.tilt,-1,1)-o.slide)*a,o.pitch+=(o.tp-o.pitch)*a;let r=-o.slide*y*.78;u.position.set(o.slide*.7,o.pitch*.8,.45),u.rotation.set(o.pitch,r,0,"YXZ"),P=Math.min(1,P+t*.9);let c=1-Math.pow(1-P,3);U.forEach(i=>{i.material.uniforms.uReveal.value=c}),E.uniforms.uK.value=.32+(s?.04:0)*1,E.uniforms.uTime.value=S,T.update(S),Le||(ne.uniforms.uTime.value=S,_-=t,_<=0&&P>.6&&(Ke(),_=.35+Math.random()*.9),W.forEach(i=>{if(i.t>=1){i.sp.visible=!1;return}i.t+=t/i.life;let l=Math.sin(Math.PI*Math.min(1,i.t))**2;i.sp.material.opacity=l,i.sp.scale.setScalar(i.size*(.3+.7*l)),i.sp.material.rotation=i.rot+i.t*.6})),g.render(t),Ye(),n.dispatchEvent(new CustomEvent("suiteview",{detail:o.slide<0?1:0})),requestAnimationFrame(se)}function le(){let e=n.clientWidth,t=n.clientHeight;d.setSize(e,t,!1),g.setSize(e,t),u.aspect=e/t,u.fov=e/t<.8?80:e/t>1.6?50:60,u.updateProjectionMatrix(),E.uniforms.uAspect.value=e/t;let a=2*Math.atan(Math.tan(ge.degToRad(u.fov)/2)*u.aspect);y=Math.max(.06,2*I-a/2*.86),Ge=-y}function ce(){R||!b||document.hidden||(R=!0,q=performance.now(),requestAnimationFrame(se))}function de(){R=!1}return new IntersectionObserver(([e])=>{b=e.isIntersecting,b?ce():de()}).observe(n),document.addEventListener("visibilitychange",()=>document.hidden?de():ce()),new ResizeObserver(le).observe(n),le(),{goTo:Be}}var m=(n,L,d)=>Math.max(L,Math.min(d,n));export{it as createSuite};
