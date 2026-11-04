import{F as le,G as ue,I as N,M as pe,N as de,S as ve,W as me,X as fe,Y as he,Z as ge,_ as we,a as ne,c as re,i as z,k as ie,n as K,r as se,t as ce,y as Y}from"./chunk-U6Z7KA3H.js";var Ae=matchMedia("(prefers-reduced-motion: reduce)").matches,Ee=new URL("../../images/",import.meta.url).href,Ue=[{img:"suite-desk-hd.webp",depth:"suite-desk-depth.png"},{img:"suite-pedicure-hd.webp",depth:"suite-pedicure-depth.png"}],V=4.6,j=V*.75,q=4,xe=1.25,B=Math.atan(j/2/q),m=[B,-B];function _e(i,U){let r;try{r=new ve({antialias:!0})}catch{return null}let R=Math.min(innerWidth,innerHeight)<600;r.setPixelRatio(Math.min(devicePixelRatio||1,R?2:1.6)),r.outputColorSpace=z,r.toneMapping=re,r.domElement.className="suite-canvas",i.prepend(r.domElement);let g=new ce;g.background=new se("#f9e6ec");let c=new de(70,1,.05,50),ye=new Y(new ue(20,32,16),new N({side:ne,depthWrite:!1,vertexShader:"varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:"varying vec3 vP; void main(){ float g = smoothstep(-0.6, 0.9, -vP.z); vec3 c = mix(vec3(0.93,0.78,0.83), vec3(1.0,0.96,0.95), g); gl_FragColor = vec4(c,1.0); }"}));g.add(ye);let b=new we({count:R?40:70,scale:[7,5,4],size:3,speed:.2,opacity:.85,color:"#fff3d6",noise:1});b.position.set(0,0,-2.2),b.setPixelRatio(r.getPixelRatio()),g.add(b);let G=new pe,X=[],O=Ue.map((e,t)=>{let a=G.load(Ee+e.img);a.colorSpace=z,a.anisotropy=8;let n=G.load(Ee+e.depth,D=>Me(D.image,t)),v=new le(j,V,R?180:260,R?240:346),y=new N({transparent:!0,uniforms:{uMap:{value:a},uDepth:{value:n},uRelief:{value:xe},uSide:{value:t===0?1:-1},uReveal:{value:0}},vertexShader:`
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
          float outer = uSide > 0.0 ? smoothstep(0.0, 0.08, vUv.x) : smoothstep(1.0, 0.92, vUv.x);
          float tb = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
          // depth fog: far wall a touch softer, near things pop
          c.rgb = mix(c.rgb * 0.94 + 0.06, c.rgb * 1.04, vD);
          gl_FragColor = vec4(c.rgb, outer * tb * uReveal);
        }`}),u=new Y(v,y),M=m[t];return u.position.set(-Math.sin(M)*q,0,-Math.cos(M)*q),u.lookAt(0,0,0),g.add(u),u});function Me(e,t){let a=document.createElement("canvas");a.width=e.width,a.height=e.height;let n=a.getContext("2d",{willReadFrequently:!0});n.drawImage(e,0,0),X[t]={w:a.width,h:a.height,px:n.getImageData(0,0,a.width,a.height).data}}function Re(e,t,a){let n=X[e];if(!n)return .5;let v=Math.min(n.w-1,Math.max(0,Math.round(t*(n.w-1)))),y=Math.min(n.h-1,Math.max(0,Math.round((1-a)*(n.h-1))));return n.px[(y*n.w+v)*4]/255}let w=new fe(r);w.addPass(new he(g,c));let E=new me({uniforms:{tDiffuse:{value:null},uK:{value:.32},uAspect:{value:1},uTime:{value:0}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
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
      }`});w.addPass(E),w.addPass(new ge);let o={yaw:m[0]*.9,pitch:0,ty:m[0]*.9,tp:0},l=m[0]*1.15,f=-l,d=.2,s=null,h=0,k=0,T=r.domElement;T.addEventListener("pointerdown",e=>{s={x:e.clientX,y:e.clientY,yaw:o.ty,pitch:o.tp},h=performance.now()}),addEventListener("pointermove",e=>{if(!s)return;let t=T.clientWidth;o.ty=p(s.yaw+(e.clientX-s.x)/t*1.6,f,l),e.pointerType==="mouse"&&(o.tp=p(s.pitch+(e.clientY-s.y)/t*1.2,-d,d)),h=performance.now()}),addEventListener("pointerup",()=>{s=null}),addEventListener("pointercancel",()=>{s=null}),T.addEventListener("mousemove",e=>{if(s)return;let t=T.getBoundingClientRect();o.tp=p(-((e.clientY-t.top)/t.height-.5)*d*1.4,-d,d)});let x=null;addEventListener("deviceorientation",e=>{if(!(e.gamma==null||!H)){if(x||(x={g:e.gamma,b:e.beta}),performance.now()-h<1500){x={g:e.gamma-(o.ty-m[0]*.9)*-40,b:e.beta};return}o.ty=p(m[0]*.9-(e.gamma-x.g)/40,f,l),o.tp=p((e.beta-x.b)/120,-d,d),h=performance.now()-1200}});function be(e){o.ty=p(m[e]*.9,f,l),o.tp=0,h=performance.now()+2500}let Te=U.map(e=>{let t=document.createElement("button");return t.type="button",t.className="hs hs3d",t.textContent="\u2726",t.dataset.title=e.title,t.dataset.text=e.text,t.setAttribute("aria-label",e.title),t.setAttribute("aria-expanded","false"),i.appendChild(t),{...e,el:t,world:new K}});function Se(){let e=i.clientWidth,t=i.clientHeight;Te.forEach(a=>{let n=O[a.view],v=Re(a.view,a.u,a.v),y=new K((a.u-.5)*j,(a.v-.5)*V,(v-.25)*xe*n.material.uniforms.uReveal.value+.02);a.world.copy(y).applyMatrix4(n.matrixWorld);let u=a.world.clone().project(c),M=u.x,D=u.y,ee=e/t,F=E.uniforms.uK.value,P=M,A=D;for(let ae=0;ae<6;ae++){let I=P*ee,_=A,He=I*I+_*_,oe=(1-F*.42)/(1-F*.42*He*.6)/(1+F*.35),De=I*oe/ee,Pe=_*oe;P+=M-De,A+=D-Pe}let te=u.z<1&&Math.abs(P)<.95&&Math.abs(A)<.92;a.el.style.opacity=te?1:0,a.el.style.pointerEvents=te?"auto":"none",a.el.style.transform=`translate(${((P+1)/2*e).toFixed(1)}px, ${((1-A)/2*t).toFixed(1)}px) translate(-50%, -50%)`})}let S=!1,H=!1,C=performance.now(),L=0,W=0;function $(e){if(!S)return;let t=Math.min(.05,(e-C)/1e3);C=e,L+=t,!Ae&&performance.now()-h>6e3&&!s&&(k+=t*.16,o.ty=l*.92*Math.cos(k),o.tp=Math.sin(k*1.7)*.05);let a=1-Math.pow(.002,t);o.yaw+=(o.ty-o.yaw)*a,o.pitch+=(o.tp-o.pitch)*a,c.position.set(-o.yaw*.55,o.pitch*.8,.35),c.rotation.set(o.pitch,o.yaw,0,"YXZ"),W=Math.min(1,W+t*.9);let n=1-Math.pow(1-W,3);O.forEach(v=>{v.material.uniforms.uReveal.value=n}),E.uniforms.uK.value=.32+(s?.04:0)*1,E.uniforms.uTime.value=L,b.update(L),w.render(t),Se(),i.dispatchEvent(new CustomEvent("suiteview",{detail:o.yaw>0?0:1})),requestAnimationFrame($)}function Z(){let e=i.clientWidth,t=i.clientHeight;r.setSize(e,t,!1),w.setSize(e,t),c.aspect=e/t,c.fov=e/t<.8?80:e/t>1.6?50:60,c.updateProjectionMatrix(),E.uniforms.uAspect.value=e/t;let a=2*Math.atan(Math.tan(ie.degToRad(c.fov)/2)*c.aspect);l=Math.max(.06,2*B-a/2*.86),f=-l,o.ty=p(o.ty,f,l),o.yaw=p(o.yaw,f,l)}function J(){S||!H||document.hidden||(S=!0,C=performance.now(),requestAnimationFrame($))}function Q(){S=!1}return new IntersectionObserver(([e])=>{H=e.isIntersecting,H?J():Q()}).observe(i),document.addEventListener("visibilitychange",()=>document.hidden?Q():J()),new ResizeObserver(Z).observe(i),Z(),{goTo:be}}var p=(i,U,r)=>Math.max(U,Math.min(r,i));export{_e as createSuite};
