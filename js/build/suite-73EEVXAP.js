import{A as Ye,C as J,D as U,E as G,F as $e,H as Ze,I as Je,L as b,M as et,O as x,P as Me,Q as P,S as tt,T as it,V as k,X as ee,Y as st,b as ze,d as Ue,e as xe,ea as at,fa as rt,g as Ge,h as ke,i as We,ia as te,j as Ve,ja as _,k as Xe,ka as ot,l as je,m as Qe,n as Ke,na as nt,oa as lt,qa as ft,sa as ct,t as qe,va as ht,y as Z}from"./chunk-ILZAD2EF.js";var ut={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var v=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},yt=new ft(-1,1,1,-1,0,1),Te=class extends P{constructor(){super(),this.setAttribute("position",new Me([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Me([0,2,0,0,2,0],2))}},Ht=new Te,y=class{constructor(e){this._mesh=new k(Ht,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,yt)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var H=class extends v{constructor(e,s="tDiffuse"){super(),this.textureID=s,this.uniforms=null,this.material=null,e instanceof _?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=te.clone(e.uniforms),this.material=new _({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new y(this.material)}render(e,s,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(s),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var W=class extends v{constructor(e,s){super(),this.scene=e,this.camera=s,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,s,n){let l=e.getContext(),o=e.state;o.buffers.color.setMask(!1),o.buffers.depth.setMask(!1),o.buffers.color.setLocked(!0),o.buffers.depth.setLocked(!0);let u,p;this.inverse?(u=0,p=1):(u=1,p=0),o.buffers.stencil.setTest(!0),o.buffers.stencil.setOp(l.REPLACE,l.REPLACE,l.REPLACE),o.buffers.stencil.setFunc(l.ALWAYS,u,4294967295),o.buffers.stencil.setClear(p),o.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(s),this.clear&&e.clear(),e.render(this.scene,this.camera),o.buffers.color.setLocked(!1),o.buffers.depth.setLocked(!1),o.buffers.color.setMask(!0),o.buffers.depth.setMask(!0),o.buffers.stencil.setLocked(!1),o.buffers.stencil.setFunc(l.EQUAL,1,4294967295),o.buffers.stencil.setOp(l.KEEP,l.KEEP,l.KEEP),o.buffers.stencil.setLocked(!0)}},ie=class extends v{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}};var se=class{constructor(e,s){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),s===void 0){let n=e.getSize(new U);this._width=n.width,this._height=n.height,s=new Je(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:qe}),s.texture.name="EffectComposer.rt1"}else this._width=s.width,this._height=s.height;this.renderTarget1=s,this.renderTarget2=s.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new H(ut),this.copyPass.material.blending=Ue,this.timer=new ct}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,s){this.passes.splice(s,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let s=this.passes.indexOf(e);s!==-1&&this.passes.splice(s,1)}isLastEnabledPass(e){for(let s=e+1;s<this.passes.length;s++)if(this.passes[s].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let s=this.renderer.getRenderTarget(),n=!1;for(let l=0,o=this.passes.length;l<o;l++){let u=this.passes[l];if(u.enabled!==!1){if(u.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(l),u.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),u.needsSwap){if(n){let p=this.renderer.getContext(),E=this.renderer.state.buffers.stencil;E.setFunc(p.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),E.setFunc(p.EQUAL,1,4294967295)}this.swapBuffers()}W!==void 0&&(u instanceof W?n=!0:u instanceof ie&&(n=!1))}}this.renderer.setRenderTarget(s)}reset(e){if(e===void 0){let s=this.renderer.getSize(new U);this._pixelRatio=this.renderer.getPixelRatio(),this._width=s.width,this._height=s.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,s){this._width=e,this._height=s;let n=this._width*this._pixelRatio,l=this._height*this._pixelRatio;this.renderTarget1.setSize(n,l),this.renderTarget2.setSize(n,l);for(let o=0;o<this.passes.length;o++)this.passes[o].setSize(n,l)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var ae=class extends v{constructor(e,s,n=null,l=null,o=null){super(),this.scene=e,this.camera=s,this.overrideMaterial=n,this.clearColor=l,this.clearAlpha=o,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new b}render(e,s,n){let l=e.autoClear;e.autoClear=!1;let o,u;this.overrideMaterial!==null&&(u=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(o=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(o),this.overrideMaterial!==null&&(this.scene.overrideMaterial=u),e.autoClear=l}};var V={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var re=class extends v{constructor(){super(),this.isOutputPass=!0,this.uniforms=te.clone(V.uniforms),this.material=new ot({name:V.name,uniforms:this.uniforms,vertexShader:V.vertexShader,fragmentShader:V.fragmentShader}),this._fsQuad=new y(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,s,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},$e.getTransfer(this._outputColorSpace)===Ye&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===ke?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===We?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Ve?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Xe?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Qe?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Ke?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===je&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(s),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Ft=()=>parseInt("187".replace(/\D+/g,"")),pt=Ft();var _e=class extends _{constructor(){super({uniforms:{time:{value:0},pixelRatio:{value:1}},vertexShader:`
        uniform float pixelRatio;
        uniform float time;
        attribute float size;  
        attribute float speed;  
        attribute float opacity;
        attribute vec3 noise;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          modelPosition.y += sin(time * speed + modelPosition.x * noise.x * 100.0) * 0.2;
          modelPosition.z += cos(time * speed + modelPosition.x * noise.y * 100.0) * 0.2;
          modelPosition.x += cos(time * speed + modelPosition.x * noise.z * 100.0) * 0.2;
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectionPostion = projectionMatrix * viewPosition;
          gl_Position = projectionPostion;
          gl_PointSize = size * 25. * pixelRatio;
          gl_PointSize *= (1.0 / - viewPosition.z);
          vColor = color;
          vOpacity = opacity;
        }
      `,fragmentShader:`
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float strength = 0.05 / distanceToCenter - 0.1;
          gl_FragColor = vec4(vColor, strength * vOpacity);
          #include <tonemapping_fragment>
          #include <${pt>=154?"colorspace_fragment":"encodings_fragment"}>
        }
      `})}get time(){return this.uniforms.time.value}set time(e){this.uniforms.time.value=e}get pixelRatio(){return this.uniforms.pixelRatio.value}set pixelRatio(e){this.uniforms.pixelRatio.value=e}},dt=a=>a&&a.constructor===Float32Array,Dt=a=>[a.r,a.g,a.b],mt=a=>a instanceof U||a instanceof G||a instanceof Ze,gt=a=>Array.isArray(a)?a:mt(a)?a.toArray():[a,a,a];function X(a,e,s){if(e!==void 0){if(dt(e))return e;if(e instanceof b){let n=Array.from({length:a*3},()=>Dt(e)).flat();return Float32Array.from(n)}else if(mt(e)||Array.isArray(e)){let n=Array.from({length:a*3},()=>gt(e)).flat();return Float32Array.from(n)}return Float32Array.from({length:a},()=>e)}return Float32Array.from({length:a},s)}var oe=class extends ee{constructor({noise:e=1,count:s=100,speed:n=1,opacity:l=1,scale:o=1,size:u,color:p}={}){super(new P,new _e);let E=this.material;E.transparent=!0,E.depthWrite=!1,this.rebuildAttributes({count:s,size:u,opacity:l,speed:n,scale:o,noise:e,color:p})}setPixelRatio(e){let s=this.material;s.pixelRatio=e}rebuildAttributes({noise:e=1,count:s=100,speed:n=1,opacity:l=1,scale:o=1,size:u,color:p}={}){let E=gt(o),j=Float32Array.from(Array.from({length:s},()=>E.map(J.randFloatSpread)).flat()),D=X(s,u,Math.random),le=X(s,l),Q=X(s,n),w=X(s*3,e),R=X(p===void 0?s*3:s,dt(p)?p:new b(p),()=>1);this.geometry.setAttribute("position",new x(j,3)),this.geometry.setAttribute("size",new x(D,1)),this.geometry.setAttribute("opacity",new x(le,1)),this.geometry.setAttribute("speed",new x(Q,1)),this.geometry.setAttribute("color",new x(R,3)),this.geometry.setAttribute("noise",new x(w,3))}update(e){this.material.time=e}};var vt=matchMedia("(prefers-reduced-motion: reduce)").matches,Et=new URL("../../images/",import.meta.url).href,Nt=[{img:"suite-desk-hd.webp",depth:"suite-desk-depth.png"},{img:"suite-pedicure-hd.webp",depth:"suite-pedicure-depth.png"}],ne=4.6,Re=ne*.75,Ce=4,we=1.55,S=Math.atan(Re/2/Ce),Lt=[[[.262,.128],[.078,.323],[.352,.25],[.279,.256],[.772,.119],[.675,.132],[.527,.141],[.745,.234],[.854,.23],[.554,.243],[.614,.241],[.835,.343],[.147,.322],[.613,.135],[.132,.602],[.296,.602],[.448,.606],[.819,.437],[.674,.237],[.397,.144],[.925,.227],[.16,.644],[.381,.604],[.201,.601],[.876,.675],[.466,.145]],[[.144,.58],[.334,.346],[.181,.637],[.128,.522],[.238,.526],[.204,.579],[.057,.637],[.486,.556],[.078,.49],[.073,.579],[.446,.694],[.238,.356],[.631,.385],[.171,.17],[.743,.215],[.161,.041],[.154,.475],[.246,.466],[.371,.417],[.91,.211],[.833,.235],[.3,.403],[.078,.716],[.188,.424],[.152,.097],[.141,.325]]],F=[Re,Re*.94],Mt=[1,.94],Bt=Lt.map((a,e)=>a.map(([s,n])=>[s/Mt[e],n]).filter(([s])=>s<.98)),xt=[-S,S];function di(a,e){let s;try{s=new ht({antialias:!0})}catch{return null}let n=Math.min(innerWidth,innerHeight)<600;s.setPixelRatio(Math.min(devicePixelRatio||1,n?2:1.6)),s.outputColorSpace=Z,s.toneMapping=Ge,s.domElement.className="suite-canvas",a.prepend(s.domElement);let l=new et;l.background=new b("#f9e6ec");let o=new lt(70,1,.05,50),u=new k(new rt(20,32,16),new _({side:ze,depthWrite:!1,vertexShader:"varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:"varying vec3 vP; void main(){ float g = smoothstep(-0.6, 0.9, -vP.z); vec3 c = mix(vec3(0.93,0.78,0.83), vec3(1.0,0.96,0.95), g); gl_FragColor = vec4(c,1.0); }"}));l.add(u);let p=new oe({count:n?40:70,scale:[7,5,4],size:3,speed:.2,opacity:.85,color:"#fff3d6",noise:1});p.position.set(0,0,-2.2),p.setPixelRatio(s.getPixelRatio()),l.add(p);let E=new nt,j=[],D=Nt.map((t,i)=>{let r=E.load(Et+t.img);r.colorSpace=Z,r.anisotropy=8;let h=E.load(Et+t.depth,A=>le(A.image,i)),g=new at(F[i],ne,n?180:260,n?240:346),c=new _({transparent:!0,uniforms:{uMap:{value:r},uDepth:{value:h},uRelief:{value:we},uSide:{value:Math.sign(xt[i])},uReveal:{value:0}},vertexShader:`
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
        }`}),d=new k(g,c),M=xt[i],T=Math.sign(M),O=Math.cos(S),z=Math.sin(S),C=F[i]/2;return d.position.set(-T*O*C,0,-Ce/O+z*C),d.rotation.y=M,l.add(d),d});function le(t,i){let r=document.createElement("canvas");r.width=t.width,r.height=t.height;let h=r.getContext("2d",{willReadFrequently:!0});h.drawImage(t,0,0),j[i]={w:r.width,h:r.height,px:h.getImageData(0,0,r.width,r.height).data}}function Q(t,i,r){let h=j[t];if(!h)return .5;let g=Math.min(h.w-1,Math.max(0,Math.round(i*(h.w-1)))),c=Math.min(h.h-1,Math.max(0,Math.round((1-r)*(h.h-1))));return h.px[(c*h.w+g)*4]/255}let w=new se(s);w.addPass(new ae(l,o));let R=new H({uniforms:{tDiffuse:{value:null},uK:{value:.32},uAspect:{value:1},uTime:{value:0}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
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
      }`});w.addPass(R),w.addPass(new re);let fe=S*1.15,be=fe,N=.16,f={slide:.6,target:.6,vel:0,pitch:0,tp:0,tilt:0},m=null,L=performance.now(),Se=0,Ae=!1;a.addEventListener("pointerdown",t=>{if(!t.target.closest(".hs, .suite-views")){m={id:t.pointerId,x:t.clientX,y:t.clientY,start:f.target,lastX:t.clientX,lastT:performance.now()};try{a.setPointerCapture(t.pointerId)}catch{}f.vel=0,L=performance.now(),Ae||(Ae=!0,a.classList.add("touched"))}}),a.addEventListener("pointermove",t=>{if(m&&t.pointerId===m.id){let i=a.clientWidth;f.target=I(m.start-(t.clientX-m.x)/(i*.42),-1,1);let r=performance.now(),h=Math.max(1,r-m.lastT);f.vel=-(t.clientX-m.lastX)/(i*.42)/h*16,m.lastX=t.clientX,m.lastT=r,t.pointerType==="mouse"&&(f.tp=I(-(t.clientY-m.y)/i*.6,-N,N)),L=r}else if(t.pointerType==="mouse"){let i=a.getBoundingClientRect();f.tp=I(-((t.clientY-i.top)/i.height-.5)*N*1.2,-N,N)}});let ce=t=>{m&&(!t||t.pointerId===m.id)&&(m=null,L=performance.now())};a.addEventListener("pointerup",ce),a.addEventListener("pointercancel",ce),a.addEventListener("lostpointercapture",ce);let B=null;addEventListener("deviceorientation",t=>{t.gamma==null||!q||(B||(B=t.gamma),B+=(t.gamma-B)*.01,f.tilt=I((t.gamma-B)/25,-1,1)*.22)});function Tt(t){f.target=t===0?.75:-.75,f.vel=0,L=performance.now()+4e3}let _t=(()=>{let t=document.createElement("canvas");t.width=t.height=128;let i=t.getContext("2d");i.translate(64,64);let r=(c,d,M)=>{i.save(),i.rotate(M);let T=i.createLinearGradient(-c,0,c,0);T.addColorStop(0,"rgba(255,255,255,0)"),T.addColorStop(.5,"rgba(255,255,255,1)"),T.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=T,i.beginPath(),i.moveTo(-c,0),i.lineTo(0,-d),i.lineTo(c,0),i.lineTo(0,d),i.fill(),i.restore()};r(62,2.4,0),r(62,2.4,Math.PI/2),r(24,1.3,Math.PI/4),r(24,1.3,-Math.PI/4);let h=i.createRadialGradient(0,0,0,0,0,20);h.addColorStop(0,"rgba(255,255,255,1)"),h.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=h,i.beginPath(),i.arc(0,0,20,0,7),i.fill();let g=new st(t);return g.colorSpace=Z,g})(),wt=["#ffffff","#fff4dc","#ffffff","#ffd9ea","#ffffff","#e6f2ff"],he=[];for(let t=0;t<6;t++){let i=new it(new tt({map:_t,color:wt[t],transparent:!0,depthTest:!1,depthWrite:!1,blending:xe}));i.visible=!1,i.renderOrder=5,l.add(i),he.push({sp:i,t:1,life:1,size:.2})}let ue=1.2;function Rt(){let t=he.find(M=>M.t>=1);if(!t)return;let i=Math.random()<.8?f.slide<0?1:0:f.slide<0?0:1,r=Bt[i],[h,g]=r[Math.random()*r.length|0],c=D[i],d=Q(i,h,g);t.sp.position.set((h-.5)*F[i],(g-.5)*ne,(d-.25)*we*c.material.uniforms.uReveal.value+.05).applyMatrix4(c.matrixWorld),t.t=0,t.life=.7+Math.random()*.6,t.size=.16+Math.random()*.14,t.rot=Math.random()*.5,t.sp.visible=!0}let pe=n?36:60,de=new P,Pe=new Float32Array(pe*3),ye=new Float32Array(pe*4);for(let t=0;t<pe;t++)Pe.set([(Math.random()-.5)*6,Math.random()*4.6-2.3,-.8-Math.random()*2.6],t*3),ye.set([Math.random(),Math.random(),Math.random(),Math.random()],t*4);de.setAttribute("position",new x(Pe,3)),de.setAttribute("seed",new x(ye,4));let He=new _({uniforms:{uTime:{value:0},uPx:{value:s.getPixelRatio()}},vertexShader:`
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
      }`,transparent:!0,depthWrite:!1,depthTest:!1,blending:xe}),me=new ee(de,He);me.renderOrder=4,me.frustumCulled=!1,l.add(me),e=e.map(t=>({...t,u:t.u/Mt[t.view]})).filter(t=>t.u<.98);let Ct=e.map(t=>{let i=document.createElement("button");return i.type="button",i.className="hs hs3d",i.textContent="\u2726",i.dataset.title=t.title,i.dataset.text=t.text,i.setAttribute("aria-label",t.title),i.setAttribute("aria-expanded","false"),a.appendChild(i),{...t,el:i,world:new G}});function bt(){let t=a.clientWidth,i=a.clientHeight;Ct.forEach(r=>{let h=D[r.view],g=Q(r.view,r.u,r.v),c=new G((r.u-.5)*F[r.view],(r.v-.5)*ne,(g-.25)*we*h.material.uniforms.uReveal.value+.02);r.world.copy(c).applyMatrix4(h.matrixWorld);let d=r.world.clone().project(o),M=d.x,T=d.y,O=t/i,z=R.uniforms.uK.value,C=M,A=T;for(let Be=0;Be<6;Be++){let ve=C*O,Ee=A,St=ve*ve+Ee*Ee,Oe=(1-z*.42)/(1-z*.42*St*.6)/(1+z*.35),At=ve*Oe/O,Pt=Ee*Oe;C+=M-At,A+=T-Pt}let Le=d.z<1&&Math.abs(C)<.95&&Math.abs(A)<.92;r.el.style.opacity=Le?1:0,r.el.style.pointerEvents=Le?"auto":"none",r.el.style.transform=`translate(${((C+1)/2*t).toFixed(1)}px, ${((1-A)/2*i).toFixed(1)}px) translate(-50%, -50%)`})}let K=!1,q=!1,ge=performance.now(),Y=0,$=0;function Fe(t){if(!K)return;let i=Math.min(.05,(t-ge)/1e3);ge=t,Y+=i,m||(Math.abs(f.vel)>5e-4&&(f.target=I(f.target+f.vel*i*60*.06,-1,1),f.vel*=Math.pow(.04,i)),!vt&&performance.now()-L>8e3&&(Se+=i*.22,f.target+=(Math.sin(Se)*.7-f.target)*i*.4));let r=1-Math.pow(m?1e-5:.004,i);f.slide+=(I(f.target+f.tilt,-1,1)-f.slide)*r,f.pitch+=(f.tp-f.pitch)*r;let h=-f.slide*(f.slide<0?be:fe)*.78;o.position.set(f.slide*.7,f.pitch*.8,.45),o.rotation.set(f.pitch,h,0,"YXZ"),$=Math.min(1,$+i*.9);let g=1-Math.pow(1-$,3);D.forEach(c=>{c.material.uniforms.uReveal.value=g}),R.uniforms.uK.value=.32+(m?.04:0)*1,R.uniforms.uTime.value=Y,p.update(Y),vt||(He.uniforms.uTime.value=Y,ue-=i,ue<=0&&$>.6&&(Rt(),ue=.35+Math.random()*.9),he.forEach(c=>{if(c.t>=1){c.sp.visible=!1;return}c.t+=i/c.life;let d=Math.sin(Math.PI*Math.min(1,c.t))**2;c.sp.material.opacity=d,c.sp.scale.setScalar(c.size*(.3+.7*d)),c.sp.material.rotation=c.rot+c.t*.6})),w.render(i),bt(),a.dispatchEvent(new CustomEvent("suiteview",{detail:f.slide<0?1:0})),requestAnimationFrame(Fe)}function Ie(){let t=a.clientWidth,i=a.clientHeight;s.setSize(t,i,!1),w.setSize(t,i),o.aspect=t/i,o.fov=t/i<.8?80:t/i>1.6?50:60,o.updateProjectionMatrix(),R.uniforms.uAspect.value=t/i;let r=2*Math.atan(Math.tan(J.degToRad(o.fov)/2)*o.aspect),h=g=>{let c=Math.cos(S),d=Math.sin(S);return Math.atan2(c*g,Ce/c-d*g)};fe=Math.max(.06,h(F[0])-r/2*.86),be=Math.max(.06,h(F[1])-r/2*.86)}function De(){K||!q||document.hidden||(K=!0,ge=performance.now(),requestAnimationFrame(Fe))}function Ne(){K=!1}return new IntersectionObserver(([t])=>{q=t.isIntersecting,q?De():Ne()}).observe(a),document.addEventListener("visibilitychange",()=>document.hidden?Ne():De()),new ResizeObserver(Ie).observe(a),Ie(),{goTo:Tt}}var I=(a,e,s)=>Math.max(e,Math.min(s,a));export{di as createSuite};
