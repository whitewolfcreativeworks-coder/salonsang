import{a as Ye,b as ro,c as ao,e as no,f as io,g as so,h as lo}from"./chunk-RT5W57VC.js";import{$ as Xt,A as kt,Aa as Jt,D as Gt,Da as eo,E as _,Ea as to,F as Nt,Fa as oo,G,K as qe,L as Wt,N as Te,O as q,P as Ot,Q as jt,S as De,U as ct,V as ut,Z as qt,_ as J,ca as Xe,e as Lt,ea as Yt,ga as Fe,ia as Qt,k as At,ka as mt,la as $t,ma as ft,o as Vt,pa as ht,q as st,qa as Me,sa as be,t as lt,ta as ge,u as ve,ua as Kt,wa as Zt,z as je,za as dt}from"./chunk-NTALV72E.js";import{g as Bt,h as It,i as w,j as Ut,k as Oe}from"./chunk-SJBJ4AOW.js";var Qe=class extends Kt{constructor(i){super(i),this.type=ve}parse(i){let f=function(c,M){switch(c){case 1:throw new Error("THREE.HDRLoader: Read Error: "+(M||""));case 2:throw new Error("THREE.HDRLoader: Write Error: "+(M||""));case 3:throw new Error("THREE.HDRLoader: Bad File Format: "+(M||""));default:case 4:throw new Error("THREE.HDRLoader: Memory Error: "+(M||""))}},ee=function(c,M,y){M=M||1024;let x=c.pos,H=-1,h=0,L="",R=String.fromCharCode.apply(null,new Uint16Array(c.subarray(x,x+128)));for(;0>(H=R.indexOf(`
`))&&h<M&&x<c.byteLength;)L+=R,h+=R.length,x+=128,R=String.fromCharCode.apply(null,new Uint16Array(c.subarray(x,x+128)));return-1<H?(y!==!1&&(c.pos+=h+H+1),L+R.slice(0,H)):!1},X=function(c){let M=/^#\?(\S+)/,y=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,P=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,x=/^\s*FORMAT=(\S+)\s*$/,H=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,h={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0},L,R;for((c.pos>=c.byteLength||!(L=ee(c)))&&f(1,"no header found"),(R=L.match(M))||f(3,"bad initial token"),h.valid|=1,h.programtype=R[1],h.string+=L+`
`;L=ee(c),L!==!1;){if(h.string+=L+`
`,L.charAt(0)==="#"){h.comments+=L+`
`;continue}if((R=L.match(y))&&(h.gamma=parseFloat(R[1])),(R=L.match(P))&&(h.exposure=parseFloat(R[1])),(R=L.match(x))&&(h.valid|=2,h.format=R[1]),(R=L.match(H))&&(h.valid|=4,h.height=parseInt(R[1],10),h.width=parseInt(R[2],10)),h.valid&2&&h.valid&4)break}return h.valid&2||f(3,"missing format specifier"),h.valid&4||f(3,"missing image size specifier"),h},ie=function(c,M,y){let P=M;if(P<8||P>32767||c[0]!==2||c[1]!==2||c[2]&128)return new Uint8Array(c);P!==(c[2]<<8|c[3])&&f(3,"wrong scanline width");let x=new Uint8Array(4*M*y);x.length||f(4,"unable to allocate buffer space");let H=0,h=0,L=4*P,R=new Uint8Array(4),de=new Uint8Array(L),ze=y;for(;ze>0&&h<c.byteLength;){h+4>c.byteLength&&f(1),R[0]=c[h++],R[1]=c[h++],R[2]=c[h++],R[3]=c[h++],(R[0]!=2||R[1]!=2||(R[2]<<8|R[3])!=P)&&f(3,"bad rgbe scanline format");let Ee=0,K;for(;Ee<L&&h<c.byteLength;){K=c[h++];let Z=K>128;if(Z&&(K-=128),(K===0||Ee+K>L)&&f(3,"bad scanline data"),Z){let te=c[h++];for(let pe=0;pe<K;pe++)de[Ee++]=te}else de.set(c.subarray(h,h+K),Ee),Ee+=K,h+=K}let Ke=P;for(let Z=0;Z<Ke;Z++){let te=0;x[H]=de[Z+te],te+=P,x[H+1]=de[Z+te],te+=P,x[H+2]=de[Z+te],te+=P,x[H+3]=de[Z+te],H+=4}ze--}return x},me=function(c,M,y,P){let x=c[M+3],H=Math.pow(2,x-128)/255;y[P+0]=c[M+0]*H,y[P+1]=c[M+1]*H,y[P+2]=c[M+2]*H,y[P+3]=1},xe=function(c,M,y,P){let x=c[M+3],H=Math.pow(2,x-128)/255;y[P+0]=De.toHalfFloat(Math.min(c[M+0]*H,65504)),y[P+1]=De.toHalfFloat(Math.min(c[M+1]*H,65504)),y[P+2]=De.toHalfFloat(Math.min(c[M+2]*H,65504)),y[P+3]=De.toHalfFloat(1)},ae=new Uint8Array(i);ae.pos=0;let Q=X(ae),V=Q.width,fe=Q.height,he=ie(ae.subarray(ae.pos),V,fe),Re,ye,$;switch(this.type){case lt:$=he.length/4;let c=new Float32Array($*4);for(let y=0;y<$;y++)me(he,y*4,c,y*4);Re=c,ye=lt;break;case ve:$=he.length/4;let M=new Uint16Array($*4);for(let y=0;y<$;y++)xe(he,y*4,M,y*4);Re=M,ye=ve;break;default:throw new Error("THREE.HDRLoader: Unsupported type: "+this.type)}return{width:V,height:fe,data:Re,header:Q.string,gamma:Q.gamma,exposure:Q.exposure,type:ye,colorSpace:kt,minFilter:st,magFilter:st,generateMipmaps:!1,flipY:!0}}setDataType(i){return this.type=i,this}};var co={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new q(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var Se=class re extends ro{constructor(i,N=1,T,U){super(),this.strength=N,this.radius=T,this.threshold=U,this.resolution=i!==void 0?new _(i.x,i.y):new _(256,256),this.clearColor=new q(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let m=Math.round(this.resolution.x/2),f=Math.round(this.resolution.y/2);this.renderTargetBright=new qe(m,f,{type:ve,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let W=0;W<this.nMips;W++){let ee=new qe(m,f,{type:ve,depthBuffer:!1});ee.texture.name="UnrealBloomPass.h"+W,ee.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(ee);let X=new qe(m,f,{type:ve,depthBuffer:!1});X.texture.name="UnrealBloomPass.v"+W,X.texture.generateMipmaps=!1,this.renderTargetsVertical.push(X),m=Math.round(m/2),f=Math.round(f/2)}let D=co;this.highPassUniforms=ht.clone(D.uniforms),this.highPassUniforms.luminosityThreshold.value=U,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Me({uniforms:this.highPassUniforms,vertexShader:D.vertexShader,fragmentShader:D.fragmentShader}),this.separableBlurMaterials=[];let F=[6,10,14,18,22];m=Math.round(this.resolution.x/2),f=Math.round(this.resolution.y/2);for(let W=0;W<this.nMips;W++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(F[W])),this.separableBlurMaterials[W].uniforms.invSize.value=new _(1/m,1/f),m=Math.round(m/2),f=Math.round(f/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=N,this.compositeMaterial.uniforms.bloomRadius.value=.1;let ne=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=ne,this.bloomTintColors=[new G(1,1,1),new G(1,1,1),new G(1,1,1),new G(1,1,1),new G(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=ht.clone(Ye.uniforms),this.blendMaterial=new Me({uniforms:this.copyUniforms,vertexShader:Ye.vertexShader,fragmentShader:Ye.fragmentShader,premultipliedAlpha:!0,blending:Lt,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new q,this._oldClearAlpha=1,this._basic=new qt,this._fsQuad=new ao(null)}dispose(){for(let i=0;i<this.renderTargetsHorizontal.length;i++)this.renderTargetsHorizontal[i].dispose();for(let i=0;i<this.renderTargetsVertical.length;i++)this.renderTargetsVertical[i].dispose();this.renderTargetBright.dispose();for(let i=0;i<this.separableBlurMaterials.length;i++)this.separableBlurMaterials[i].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(i,N){let T=Math.round(i/2),U=Math.round(N/2);this.renderTargetBright.setSize(T,U);for(let m=0;m<this.nMips;m++)this.renderTargetsHorizontal[m].setSize(T,U),this.renderTargetsVertical[m].setSize(T,U),this.separableBlurMaterials[m].uniforms.invSize.value=new _(1/T,1/U),T=Math.round(T/2),U=Math.round(U/2)}render(i,N,T,U,m){i.getClearColor(this._oldClearColor),this._oldClearAlpha=i.getClearAlpha();let f=i.autoClear;i.autoClear=!1,i.setClearColor(this.clearColor,0),m&&i.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=T.texture,i.setRenderTarget(null),i.clear(),this._fsQuad.render(i)),this.highPassUniforms.tDiffuse.value=T.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,i.setRenderTarget(this.renderTargetBright),i.clear(),this._fsQuad.render(i);let D=this.renderTargetBright;for(let F=0;F<this.nMips;F++)this._fsQuad.material=this.separableBlurMaterials[F],this.separableBlurMaterials[F].uniforms.colorTexture.value=D.texture,this.separableBlurMaterials[F].uniforms.direction.value=re.BlurDirectionX,i.setRenderTarget(this.renderTargetsHorizontal[F]),i.clear(),this._fsQuad.render(i),this.separableBlurMaterials[F].uniforms.colorTexture.value=this.renderTargetsHorizontal[F].texture,this.separableBlurMaterials[F].uniforms.direction.value=re.BlurDirectionY,i.setRenderTarget(this.renderTargetsVertical[F]),i.clear(),this._fsQuad.render(i),D=this.renderTargetsVertical[F];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,i.setRenderTarget(this.renderTargetsHorizontal[0]),i.clear(),this._fsQuad.render(i),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,m&&i.state.buffers.stencil.setTest(!0),this.renderToScreen?(i.setRenderTarget(null),this._fsQuad.render(i)):(i.setRenderTarget(T),this._fsQuad.render(i)),i.setClearColor(this._oldClearColor,this._oldClearAlpha),i.autoClear=f}_getSeparableBlurMaterial(i){let N=[],T=i/3;for(let f=0;f<i;f++)N.push(.39894*Math.exp(-.5*f*f/(T*T))/T);let U=[],m=[];for(let f=1;f<i;f+=2){let D=N[f],F=f+1<i?N[f+1]:0,ne=D+F;U.push((f*D+(f+1)*F)/ne),m.push(ne)}return new Me({defines:{KERNEL_PAIRS:U.length},uniforms:{colorTexture:{value:null},invSize:{value:new _(.5,.5)},direction:{value:new _(.5,.5)},centerWeight:{value:N[0]},gaussianOffsets:{value:U},gaussianWeights:{value:m}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(i){return new Me({defines:{NUM_MIPS:i},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};Se.BlurDirectionX=new _(1,0);Se.BlurDirectionY=new _(0,1);var $e=class extends ge{constructor({samples:i=6,transmissionSampler:N=!1,chromaticAberration:T=.05,transmission:U=0,_transmission:m=1,transmissionMap:f=null,roughness:D=0,thickness:F=0,thicknessMap:ne=null,attenuationDistance:W=1/0,attenuationColor:ee=new q("white"),anisotropicBlur:X=.1,time:ie=0,distortion:me=0,distortionScale:xe=.5,temporalDistortion:ae=0,buffer:Q=null}={}){super(),this.uniforms={chromaticAberration:{value:T},transmission:{value:U},_transmission:{value:m},transmissionMap:{value:f},roughness:{value:D},thickness:{value:F},thicknessMap:{value:ne},attenuationDistance:{value:W},attenuationColor:{value:ee},anisotropicBlur:{value:X},time:{value:ie},distortion:{value:me},distortionScale:{value:xe},temporalDistortion:{value:ae},buffer:{value:Q}},this.onBeforeCompile=V=>{V.uniforms={...V.uniforms,...this.uniforms},N?V.defines.USE_SAMPLER="":V.defines.USE_TRANSMISSION="",V.fragmentShader=`
      uniform float chromaticAberration;         
      uniform float anisotropicBlur;      
      uniform float time;
      uniform float distortion;
      uniform float distortionScale;
      uniform float temporalDistortion;
      uniform sampler2D buffer;

      vec3 random3(vec3 c) {
        float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
        vec3 r;
        r.z = fract(512.0*j);
        j *= .125;
        r.x = fract(512.0*j);
        j *= .125;
        r.y = fract(512.0*j);
        return r-0.5;
      }

      uint hash( uint x ) {
        x += ( x << 10u );
        x ^= ( x >>  6u );
        x += ( x <<  3u );
        x ^= ( x >> 11u );
        x += ( x << 15u );
        return x;
      }

      // Compound versions of the hashing algorithm I whipped together.
      uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
      uint hash( uvec3 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
      uint hash( uvec4 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }

      // Construct a float with half-open range [0:1] using low 23 bits.
      // All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
      float floatConstruct( uint m ) {
        const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
        const uint ieeeOne      = 0x3F800000u; // 1.0 in IEEE binary32
        m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
        m |= ieeeOne;                          // Add fractional part to 1.0
        float  f = uintBitsToFloat( m );       // Range [1:2]
        return f - 1.0;                        // Range [0:1]
      }

      // Pseudo-random value in half-open range [0:1].
      float randomBase( float x ) { return floatConstruct(hash(floatBitsToUint(x))); }
      float randomBase( vec2  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float randomBase( vec3  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float randomBase( vec4  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float rand(float seed) {
        float result = randomBase(vec3(gl_FragCoord.xy, seed));
        return result;
      }

      const float F3 =  0.3333333;
      const float G3 =  0.1666667;

      float snoise(vec3 p) {
        vec3 s = floor(p + dot(p, vec3(F3)));
        vec3 x = p - s + dot(s, vec3(G3));
        vec3 e = step(vec3(0.0), x - x.yzx);
        vec3 i1 = e*(1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy*(1.0 - e);
        vec3 x1 = x - i1 + G3;
        vec3 x2 = x - i2 + 2.0*G3;
        vec3 x3 = x - 1.0 + 3.0*G3;
        vec4 w, d;
        w.x = dot(x, x);
        w.y = dot(x1, x1);
        w.z = dot(x2, x2);
        w.w = dot(x3, x3);
        w = max(0.6 - w, 0.0);
        d.x = dot(random3(s), x);
        d.y = dot(random3(s + i1), x1);
        d.z = dot(random3(s + i2), x2);
        d.w = dot(random3(s + 1.0), x3);
        w *= w;
        w *= w;
        d *= w;
        return dot(d, vec4(52.0));
      }

      float snoiseFractal(vec3 m) {
        return 0.5333333* snoise(m)
              +0.2666667* snoise(2.0*m)
              +0.1333333* snoise(4.0*m)
              +0.0666667* snoise(8.0*m);
      }
`+V.fragmentShader,V.fragmentShader=V.fragmentShader.replace("#include <transmission_pars_fragment>",`
        #ifdef USE_TRANSMISSION
          // Transmission code is based on glTF-Sampler-Viewer
          // https://github.com/KhronosGroup/glTF-Sample-Viewer
          uniform float _transmission;
          uniform float thickness;
          uniform float attenuationDistance;
          uniform vec3 attenuationColor;
          #ifdef USE_TRANSMISSIONMAP
            uniform sampler2D transmissionMap;
          #endif
          #ifdef USE_THICKNESSMAP
            uniform sampler2D thicknessMap;
          #endif
          uniform vec2 transmissionSamplerSize;
          uniform sampler2D transmissionSamplerMap;
          uniform mat4 modelMatrix;
          uniform mat4 projectionMatrix;
          varying vec3 vWorldPosition;
          vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
            // Direction of refracted light.
            vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
            // Compute rotation-independant scaling of the model matrix.
            vec3 modelScale;
            modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
            modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
            modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
            // The thickness is specified in local space.
            return normalize( refractionVector ) * thickness * modelScale;
          }
          float applyIorToRoughness( const in float roughness, const in float ior ) {
            // Scale roughness with IOR so that an IOR of 1.0 results in no microfacet refraction and
            // an IOR of 1.5 results in the default amount of microfacet refraction.
            return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
          }
          vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
            float framebufferLod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );            
            #ifdef USE_SAMPLER
              #ifdef texture2DLodEXT
                return texture2DLodEXT(transmissionSamplerMap, fragCoord.xy, framebufferLod);
              #else
                return texture2D(transmissionSamplerMap, fragCoord.xy, framebufferLod);
              #endif
            #else
              return texture2D(buffer, fragCoord.xy);
            #endif
          }
          vec3 applyVolumeAttenuation( const in vec3 radiance, const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
            if ( isinf( attenuationDistance ) ) {
              // Attenuation distance is +\u221E, i.e. the transmitted color is not attenuated at all.
              return radiance;
            } else {
              // Compute light attenuation using Beer's law.
              vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
              vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance ); // Beer's law
              return transmittance * radiance;
            }
          }
          vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
            const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
            const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
            const in vec3 attenuationColor, const in float attenuationDistance ) {
            vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
            vec3 refractedRayExit = position + transmissionRay;
            // Project refracted vector on the framebuffer, while mapping to normalized device coordinates.
            vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
            vec2 refractionCoords = ndcPos.xy / ndcPos.w;
            refractionCoords += 1.0;
            refractionCoords /= 2.0;
            // Sample framebuffer to get pixel the refracted ray hits.
            vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
            vec3 attenuatedColor = applyVolumeAttenuation( transmittedLight.rgb, length( transmissionRay ), attenuationColor, attenuationDistance );
            // Get the specular component.
            vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
            return vec4( ( 1.0 - F ) * attenuatedColor * diffuseColor, transmittedLight.a );
          }
        #endif
`),V.fragmentShader=V.fragmentShader.replace("#include <transmission_fragment>",`  
        // Improve the refraction to use the world pos
        material.transmission = _transmission;
        material.transmissionAlpha = 1.0;
        material.thickness = thickness;
        material.attenuationDistance = attenuationDistance;
        material.attenuationColor = attenuationColor;
        #ifdef USE_TRANSMISSIONMAP
          material.transmission *= texture2D( transmissionMap, vUv ).r;
        #endif
        #ifdef USE_THICKNESSMAP
          material.thickness *= texture2D( thicknessMap, vUv ).g;
        #endif
        
        vec3 pos = vWorldPosition;
        float runningSeed = 0.0;
        vec3 v = normalize( cameraPosition - pos );
        vec3 n = inverseTransformDirection( normal, viewMatrix );
        vec3 transmission = vec3(0.0);
        float transmissionR, transmissionB, transmissionG;
        float randomCoords = rand(runningSeed++);
        float thickness_smear = thickness * max(pow(roughnessFactor, 0.33), anisotropicBlur);
        vec3 distortionNormal = vec3(0.0);
        vec3 temporalOffset = vec3(time, -time, -time) * temporalDistortion;
        if (distortion > 0.0) {
          distortionNormal = distortion * vec3(snoiseFractal(vec3((pos * distortionScale + temporalOffset))), snoiseFractal(vec3(pos.zxy * distortionScale - temporalOffset)), snoiseFractal(vec3(pos.yxz * distortionScale + temporalOffset)));
        }
        for (float i = 0.0; i < ${i}.0; i ++) {
          vec3 sampleNorm = normalize(n + roughnessFactor * roughnessFactor * 2.0 * normalize(vec3(rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5)) * pow(rand(runningSeed++), 0.33) + distortionNormal);
          transmissionR = getIBLVolumeRefraction(
            sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
            pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness  + thickness_smear * (i + randomCoords) / float(${i}),
            material.attenuationColor, material.attenuationDistance
          ).r;
          transmissionG = getIBLVolumeRefraction(
            sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
            pos, modelMatrix, viewMatrix, projectionMatrix, material.ior  * (1.0 + chromaticAberration * (i + randomCoords) / float(${i})) , material.thickness + thickness_smear * (i + randomCoords) / float(${i}),
            material.attenuationColor, material.attenuationDistance
          ).g;
          transmissionB = getIBLVolumeRefraction(
            sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
            pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * (1.0 + 2.0 * chromaticAberration * (i + randomCoords) / float(${i})), material.thickness + thickness_smear * (i + randomCoords) / float(${i}),
            material.attenuationColor, material.attenuationDistance
          ).b;
          transmission.r += transmissionR;
          transmission.g += transmissionG;
          transmission.b += transmissionB;
        }
        transmission /= ${i}.0;
        totalDiffuse = mix( totalDiffuse, transmission.rgb, material.transmission );
`)},Object.keys(this.uniforms).forEach(V=>Object.defineProperty(this,V,{get:()=>this.uniforms[V].value,set:fe=>this.uniforms[V].value=fe}))}};var Y=512,pt=matchMedia("(prefers-reduced-motion: reduce)").matches;function No(re,{onReady:i,onTip:N}={}){let T;try{T=new oo({antialias:!0,powerPreference:"high-performance"})}catch{return null}let U=Math.min(innerWidth,innerHeight)<600;T.setPixelRatio(Math.min(devicePixelRatio||1,U?2:1.75)),T.toneMapping=At,T.toneMappingExposure=1,T.outputColorSpace=je,T.domElement.className="studio-canvas",re.prepend(T.domElement);let m=new jt,f=new q("#f7dfe6");m.background=f.clone(),m.fog=new Ot(f,11,20);let D=new Zt(32,1,.1,100),F=new G(.3,.4,-1.4),ne=new to(T);new Qe().load(new URL("../../assets/studio_small_09_1k.hdr",import.meta.url).href,e=>{e.mapping=Vt,m.environment=ne.fromEquirectangular(e).texture,m.environmentIntensity=.85,m.environmentRotation=new Wt(0,2.2,0),e.dispose()});let W=new dt("#fff1e6",1.25);W.position.set(-4,9,4),m.add(W);let ee=new dt("#ffd6e6",.35);ee.position.set(5,3,6),m.add(ee);let X=new lo({count:U?60:110,scale:[12,3,8],size:3.2,speed:.22,opacity:.85,color:"#fff0f6",noise:1});X.position.set(0,1.6,-1.2),X.setPixelRatio(T.getPixelRatio()),m.add(X);let ie={uTime:{value:0},uMagDir:{value:new _(.35,1).normalize()},uMagOff:{value:0}},me=20,xe=24,ae=U?18:26,Q=document.createElement("canvas");Q.width=512,Q.height=384;let V=new Xe(Q),fe=new Jt().copy(new $t(me,xe,1,1).rotateX(-Math.PI/2));fe.instanceCount=ae,fe.setAttribute("aLayer",new Xt(new Float32Array([...Array(ae)].map((e,t)=>t/(ae-1))),1));let he=new Me({uniforms:{uTime:ie.uTime,uLen:{value:.42},uShadow:{value:V},uFog:{value:f},uFogNear:{value:11},uFogFar:{value:20},uSize:{value:new _(me,xe)}},vertexShader:`
      attribute float aLayer; uniform float uLen; uniform float uTime;
      varying vec2 vUv; varying float vL; varying vec3 vW; varying float vDepth;
      void main(){
        vUv = uv; vL = aLayer;
        vec3 p = position; p.y += aLayer * uLen;
        float k = aLayer * aLayer;
        p.x += k * (0.16 + 0.05 * sin(uTime * 0.7 + p.z * 0.8 + p.x * 0.4));
        p.z += k * 0.05 * cos(uTime * 0.6 + p.x * 0.9);
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
        vec4 mv = viewMatrix * w; vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform sampler2D uShadow; uniform vec3 uFog; uniform vec2 uSize; uniform float uFogNear; uniform float uFogFar;
      varying vec2 vUv; varying float vL; varying vec3 vW; varying float vDepth;
      float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      void main(){
        vec2 st = vUv * uSize * 15.0;
        vec2 id = floor(st); vec2 f = fract(st) - 0.5;
        float clump = h21(floor(st / 5.0));
        float h = mix(0.45, 1.0, h21(id)) * mix(0.8, 1.0, clump);
        float r = 0.62 * (1.0 - vL / h);
        if (vL > 0.02 && (vL > h || length(f) > r)) discard;
        float ao = mix(0.5, 1.08, pow(vL, 0.55));
        vec3 col = vec3(1.0, 0.975, 0.965) * ao;
        col = mix(col, col * vec3(1.0, 0.93, 0.95), 0.25 * (1.0 - vL));
        vec2 suv = vec2(vW.x / uSize.x + 0.5, 0.5 - vW.z / uSize.y);
        float sh = texture2D(uShadow, suv).r;
        col *= mix(1.0, 0.5, sh * (1.0 - 0.55 * vL));
        float fog = smoothstep(uFogNear, uFogFar, vDepth);
        gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
      }`}),Re=new J(fe,he);Re.frustumCulled=!1,m.add(Re);let ye=(()=>{let e=document.createElement("canvas");e.width=1024,e.height=584;let t=new Xe(e);t.colorSpace=je,t.anisotropy=8;let o=()=>{let r=e.getContext("2d");r.fillStyle="#fbf8f4",r.fillRect(0,0,1024,584);let s=r.createLinearGradient(0,0,1024,584);s.addColorStop(0,"rgba(255,255,255,.6)"),s.addColorStop(1,"rgba(232,222,214,.5)"),r.fillStyle=s,r.fillRect(0,0,1024,584),r.save(),r.translate(70,400);for(let u=0;u<2;u++)for(let v=0;v<22;v++){r.save(),r.rotate(v/22*Math.PI*2+u*.14);let l=u?250:280,S=r.createLinearGradient(0,0,0,-l);S.addColorStop(0,"#c9700c"),S.addColorStop(.45,"#f2a91a"),S.addColorStop(1,"#ffd34a"),r.fillStyle=S,r.beginPath(),r.ellipse(0,-l*.58,34,l*.46,0,0,Math.PI*2),r.fill(),r.restore()}let d=r.createRadialGradient(-10,-10,10,0,0,120);d.addColorStop(0,"#5a3214"),d.addColorStop(1,"#2c170a"),r.fillStyle=d,r.beginPath(),r.arc(0,0,118,0,Math.PI*2),r.fill(),r.fillStyle="rgba(214,150,60,.55)";for(let u=0;u<220;u++){let v=u*2.399,l=Math.sqrt(u)*7.6;r.beginPath(),r.arc(Math.cos(v)*l,Math.sin(v)*l,3.2,0,7),r.fill()}r.restore(),r.fillStyle="#7b2d1e",r.textAlign="center",r.font='104px "Great Vibes", cursive',r.fillText("Sang Whitewolf",640,190),r.strokeStyle="#7b2d1e",r.lineWidth=2,r.beginPath(),r.moveTo(410,250),r.lineTo(500,250),r.moveTo(780,250),r.lineTo(870,250),r.stroke(),r.font='600 34px "Cormorant Garamond", serif',r.fillText("N A I L   A R T I S T",640,262),r.font='500 44px "Cormorant Garamond", serif',r.fillText("530-648-4977",640,370),r.fillText("salonsang.com",640,432),r.beginPath(),r.arc(640,492,6,0,7),r.fill(),r.beginPath(),r.moveTo(540,492),r.lineTo(620,492),r.moveTo(660,492),r.lineTo(740,492),r.stroke(),t.needsUpdate=!0};o(),(document.fonts?document.fonts.ready:Promise.resolve()).then(o);let a=new J(new Yt(3,.02,1.71),[new be({color:"#efe7df",roughness:.8}),new be({color:"#efe7df",roughness:.8}),new be({map:t,roughness:.72}),new be({color:"#efe7df"}),new be({color:"#efe7df",roughness:.8}),new be({color:"#efe7df",roughness:.8})]);return a.position.set(4.1,.4,2.3),a.rotation.y=.42,m.add(a),a})(),$=new Te;m.add($);let c=new Te;c.rotation.x=-Math.PI/2+.1,c.position.set(-.35,.5,.2),$.add(c);let M=new ge({color:w.tone,roughness:.48,sheen:.55,sheenColor:new q("#ffd2c6"),sheenRoughness:.5,clearcoat:.08,clearcoatRoughness:.6});function y(e,t){let o=[];for(let r=0;r<=40;r++){let s=r/40,d=-t+s*t,u=Math.exp(-Math.pow((s-.42)/.09,2))*.05+Math.exp(-Math.pow((s-.78)/.07,2))*.025;o.push(new _(e*(1.03-.1*s+u),d))}for(let r=1;r<=16;r++){let s=r/16*Math.PI/2;o.push(new _(e*.93*Math.cos(s),e*.93*Math.sin(s)*1.08))}return new mt(o,56)}let P=[{x:-2,tip:.55,R:.4,rz:.17,ry:0,len:3.4},{x:-1,tip:1.35,R:.465,rz:.06,ry:0,len:4.2},{x:.05,tip:1.7,R:.49,rz:-.01,ry:0,len:4.5},{x:1.1,tip:1.32,R:.465,rz:-.09,ry:0,len:4.2},{x:2.35,tip:-1.2,R:.54,rz:-.95,ry:-.9,len:2.6}],x=[];P.forEach((e,t)=>{let o=new Te,a=e.tip-e.len-e.R;o.position.set(e.x,a,t===4?.1:0),o.rotation.set(0,e.ry,e.rz),c.add(o);let r=new J(y(e.R,e.len),M);r.position.y=e.len,r.scale.set(1.04,1,.8),o.add(r);let s=e.len+e.R*.93,d=new Te;d.position.set(0,s-e.R*1.95,e.R*.8*.99),o.add(d);let u=R(),v=R(),l=R(),S=Ke(u.tex,v.tex,l.tex),z=new J(new ut,S);z.userData.index=t,d.add(z);let n=new Te;d.add(n),x.push({f:e,pivot:o,finger:r,group:d,mesh:z,mat:S,paint:u,art:v,metal:l,gems:n,baseZ:e.R*.8*.99})});let H=new J(new ft(1,64,48),M);H.scale.set(2.45,2.35,.5),H.position.set(.1,-3.7,-.12),c.add(H);let h=new J(new ft(1,48,32),M);h.scale.set(.85,1.4,.5),h.position.set(1.95,-3.9,-.05),h.rotation.z=-.8,c.add(h);function L(){$.updateMatrixWorld(!0);let e=Q.getContext("2d");e.clearRect(0,0,512,384),e.fillStyle="#000",e.fillRect(0,0,512,384);let t=a=>[(a.x/me+.5)*512,(a.z/xe+.5)*384],o=(a,r,s)=>{let[d,u]=t(a),v=r/me*512,l=e.createRadialGradient(d,u,0,d,u,v);l.addColorStop(0,`rgba(255,255,255,${s})`),l.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=l,e.beginPath(),e.arc(d,u,v,0,7),e.fill()};x.forEach(a=>{for(let r=0;r<=1.001;r+=.08){let s=new G(0,a.f.len*r+(r===1?a.f.R*.6:0),0).applyMatrix4(a.pivot.matrixWorld);o(s,a.f.R*1.9,.22)}});for(let a=0;a<9;a++)o(new G((a%3-1)*.6,(Math.floor(a/3)-1)*.6,0).applyMatrix4(H.matrixWorld),1.9,.24);ye.updateMatrixWorld();for(let a=-1.3;a<=1.31;a+=.4)for(let r=-.7;r<=.71;r+=.35)o(new G(a,0,r).applyMatrix4(ye.matrixWorld),.6,.18);V.needsUpdate=!0}function R(){let e=document.createElement("canvas");e.width=e.height=Y;let t=e.getContext("2d"),o=new Xe(e);return o.colorSpace=je,o.anisotropy=4,{c:e,ctx:t,tex:o}}let de={square:1.3,round:1.32,almond:1.72,coffin:1.9,stiletto:2.1};function ze(e,t){let o=t/2,a=de[e]*t,r=new Qt;switch(r.moveTo(-o,.24*t),r.bezierCurveTo(-o,-.05*t,o,-.05*t,o,.24*t),e){case"square":r.lineTo(o,a-.1*t),r.quadraticCurveTo(o,a,o-.1*t,a),r.lineTo(-o+.1*t,a),r.quadraticCurveTo(-o,a,-o,a-.1*t);break;case"round":r.lineTo(o,a-.42*t),r.bezierCurveTo(o,a-.08*t,.45*o,a,0,a),r.bezierCurveTo(-.45*o,a,-o,a-.08*t,-o,a-.42*t);break;case"almond":r.lineTo(o,a*.5),r.bezierCurveTo(o,a*.8,.3*o,a*.97,0,a),r.bezierCurveTo(-.3*o,a*.97,-o,a*.8,-o,a*.5);break;case"coffin":r.lineTo(o,a*.5),r.lineTo(.48*o,a-.05*t),r.quadraticCurveTo(.44*o,a,.36*o,a),r.lineTo(-.36*o,a),r.quadraticCurveTo(-.44*o,a,-.48*o,a-.05*t),r.lineTo(-o,a*.5);break;default:r.lineTo(o,a*.4),r.bezierCurveTo(o,a*.7,.07*o,a*.95,0,a),r.bezierCurveTo(-.07*o,a*.95,-o,a*.7,-o,a*.4)}return r.lineTo(-o,.24*t),{shape:r,L:a}}function Ee(e,t,o){let{shape:a,L:r}=ze(e,t),s=160,d=16,u=8,v=.032,l=a.getSpacedPoints(s).slice(0,s),S=new _(0,r*.4),z=o*1.85,n=(E,b)=>{let A=-(o-Math.sqrt(Math.max(o*o-E*E,1e-4)))*.92;if(b>z){let I=(b-z)/t;A-=.07*I*I}return b<.18*t&&(A-=.025*(1-b/(.18*t))),A},g=l.map((E,b)=>{let A=l[(b+s-1)%s],I=l[(b+1)%s],ue=new _(I.y-A.y,-(I.x-A.x)).normalize();return ue.dot(E.clone().sub(S))<0&&ue.negate(),ue}),C=[];for(let E=0;E<=d;E++){let b=Math.pow(E/d,.85);C.push(l.map(A=>{let I=S.clone().lerp(A,b);return[I.x,I.y,v+n(I.x,I.y)]}))}for(let E=1;E<u;E++){let b=Math.PI*E/u;C.push(l.map((A,I)=>{let ue=A.clone().addScaledVector(g[I],v*Math.sin(b));return[ue.x,ue.y,n(A.x,A.y)+v*Math.cos(b)]}))}for(let E=d;E>=0;E--){let b=Math.pow(E/d,.85);C.push(l.map(A=>{let I=S.clone().lerp(A,b);return[I.x,I.y,-v+n(I.x,I.y)]}))}let k=[],B=[],we=[],oe=1e9,Ne=-1e9,Pe=1e9,We=-1e9;l.forEach(E=>{oe=Math.min(oe,E.x),Ne=Math.max(Ne,E.x),Pe=Math.min(Pe,E.y),We=Math.max(We,E.y)}),C.forEach(E=>E.forEach(([b,A,I])=>{k.push(b,A,I),B.push((b-oe)/(Ne-oe),(A-Pe)/(We-Pe))}));for(let E=0;E<C.length-1;E++)for(let b=0;b<s;b++){let A=E*s+b,I=E*s+(b+1)%s,ue=(E+1)*s+b,Mo=(E+1)*s+(b+1)%s;we.push(A,ue,I,I,ue,Mo)}let ce=new ut;if(ce.setAttribute("position",new ct(k,3)),ce.setAttribute("uv",new ct(B,2)),ce.setIndex(we),ce.computeVertexNormals(),ce.attributes.normal.getZ(s*Math.floor(d/2))<0){let E=ce.index.array;for(let b=0;b<E.length;b+=3){let A=E[b+1];E[b+1]=E[b+2],E[b+2]=A}ce.computeVertexNormals()}return ce.userData={minX:oe,maxX:Ne,minY:Pe,maxY:We,L:r,w:t,h:v,bend:n},ce}function K(e,t,o){let a=e.mesh.geometry.userData,r=a.minX+t*(a.maxX-a.minX),s=a.minY+o*(a.maxY-a.minY),d=a.h+a.bend(r,s),u=.01,v=new G(-(a.bend(r+u,s)-a.bend(r-u,s))/(2*u),-(a.bend(r,s+u)-a.bend(r,s-u))/(2*u),1).normalize();return{p:new G(r,s,d),n:v}}function Ke(e,t,o){let a=new ge({roughness:.1,clearcoat:1,clearcoatRoughness:.03,envMapIntensity:1.15});a.defines={USE_UV:""};let r={uPaint:{value:e},uArt:{value:t},uMetal:{value:o},uBare:{value:new q("#f0cdc4")},...ie};return a.userData.u=r,a.onBeforeCompile=s=>{Object.assign(s.uniforms,r),s.fragmentShader=s.fragmentShader.replace("#include <common>",`#include <common>
          uniform sampler2D uPaint; uniform sampler2D uArt; uniform sampler2D uMetal; uniform vec3 uBare;
          uniform float uTime; uniform vec2 uMagDir; uniform float uMagOff;
          float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
          float gPaint; vec4 gP; float gGold;`).replace("#include <map_fragment>",`
          gP = texture2D(uPaint, vUv);
          vec4 art = texture2D(uArt, vUv);
          vec4 met = texture2D(uMetal, vUv);
          vec3 bare = mix(uBare, vec3(0.98, 0.94, 0.9), smoothstep(0.84, 0.97, vUv.y) * 0.8);
          gPaint = gP.a;
          vec3 col = mix(bare, gP.rgb, gP.a);
          #ifdef CHROME
            col = mix(col, vec3(1.0), 0.22 * gP.a);
          #endif
          #ifdef MATTE
            col *= mix(1.0, 0.93, gP.a);
          #endif
          col = mix(col, art.rgb, art.a);
          gGold = met.a;
          col = mix(col, met.rgb, met.a);
          diffuseColor.rgb = col;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.18, gGold);`).replace("#include <metalnessmap_fragment>",`#include <metalnessmap_fragment>
          metalnessFactor = mix(metalnessFactor, 1.0, gGold);`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
          #ifdef CATEYE
          {
            vec2 q = vUv - 0.5;
            float d = dot(q, uMagDir) - uMagOff;
            float band = exp(-d * d * 38.0);
            float grain = h21(floor(vUv * vec2(240.0, 400.0)));
            vec3 glow = mix(gP.rgb, vec3(1.0), 0.5);
            totalEmissiveRadiance += glow * band * (0.35 + 1.1 * grain) * gPaint * 0.9;
            diffuseColor.rgb *= mix(1.0, mix(0.38, 1.0, band), gPaint);
          }
          #endif
          #ifdef GLITTER
          {
            vec2 cell = floor(vUv * vec2(70.0, 120.0));
            float r1 = h21(cell);
            vec3 rn = vec3(h21(cell + 1.3), h21(cell + 7.1), h21(cell + 3.7)) - 0.5;
            vec3 fn = normalize(normal + rn * 1.8);
            vec3 V = normalize(vViewPosition);
            vec3 L = normalize(vec3(0.35 + 0.35 * sin(uTime * 0.9), 0.75, 0.55));
            vec3 H = normalize(L + V);
            float sp = pow(max(dot(fn, H), 0.0), 70.0) * step(0.35, r1);
            vec3 fc = mix(vec3(1.0, 0.86, 0.6), vec3(1.0, 0.75, 0.9), h21(cell + 9.0));
            fc = mix(fc, vec3(1.0), 0.4);
            totalEmissiveRadiance += fc * sp * 7.0 * gPaint;
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.8 + 0.4 * r1), gPaint);
          }
          #endif
          totalEmissiveRadiance += met.rgb * gGold * 0.08;`)},a}function Z(){let e=w.finish;x.forEach(t=>{let o=t.mat;o.defines={USE_UV:""},Object.assign(o,{roughness:.1,metalness:0,clearcoat:1,clearcoatRoughness:.03,iridescence:0,transmission:0,sheen:0,thickness:0}),e==="cateye"&&(o.defines.CATEYE="",o.roughness=.22,o.metalness=.12),e==="chrome"&&(o.defines.CHROME="",Object.assign(o,{metalness:.3,roughness:.12,iridescence:1,iridescenceIOR:1.85}),o.iridescenceThicknessMinimum=220,o.iridescenceThicknessMaximum=680),e==="glitter"&&(o.defines.GLITTER="",o.roughness=.28,o.metalness=.2),e==="jelly"&&Object.assign(o,{transmission:.62,thickness:.5,ior:1.5,roughness:.04}),e==="matte"&&(o.defines.MATTE="",Object.assign(o,{roughness:.62,clearcoat:0,sheen:.6,sheenRoughness:.45}),o.sheenColor=new q("#ffffff")),o.needsUpdate=!0})}function te(e,t,o){return[t*Y,(1-o)*Y]}function pe(e){let t=e.mesh.geometry.userData;return(t.maxX-t.minX)/(t.maxY-t.minY)}function Ze(e,t,o,a,r){let s=e.paint.ctx,[d,u]=te(e,t,o),v=r*Y,l=v/pe(e)*pe(e);s.save(),s.translate(d,u),s.scale(1,pe(e)),s.fillStyle=a,s.globalAlpha=.95,s.beginPath(),s.arc(0,0,l,0,Math.PI*2),s.fill(),s.globalAlpha=.25;for(let S=0;S<4;S++)s.beginPath(),s.arc((Math.random()-.5)*l*1.4,(Math.random()-.5)*l*.6,l*.55,0,Math.PI*2),s.fill();s.restore(),e.paint.tex.needsUpdate=!0}function Je(e,t,o,a,r){let s=o[0]-t[0],d=(o[1]-t[1])/pe(e),u=Math.hypot(s,d),v=Math.max(1,Math.ceil(u/(r*.3)));for(let l=1;l<=v;l++){let S=l/v;Ze(e,t[0]+(o[0]-t[0])*S,t[1]+(o[1]-t[1])*S,a,r)}}function vt(e,t,o){let a=w.nailColors[e];o&&(a.length=0),a[a.length-1]!==t&&(a.push(t),a.length>3&&a.shift())}let uo=e=>vt(e,w.color[0]);function Ce(e){let t=x[e],o=t.art.ctx,a=t.metal.ctx;o.clearRect(0,0,Y,Y),a.clearRect(0,0,Y,Y),t.gems.clear();let r=w.art,s=e===It,d=pe(t),u=w.nailColors[e].length?w.color[1]:"#f0cdc4",v=mo(fo(e))>.6,l=Y,S=(n,g,C,k)=>{n.save(),n.translate(g*l,(1-C)*l),n.scale(1,d),k(n),n.restore()};if(r==="french"&&(o.fillStyle="#fbf8f3",o.beginPath(),o.moveTo(0,0),o.lineTo(l,0),o.lineTo(l,l*.3),o.quadraticCurveTo(l/2,l*.48,0,l*.3),o.closePath(),o.fill()),!s||r==="none"||r==="french"){t.art.tex.needsUpdate=t.metal.tex.needsUpdate=!0;return}let z=l*.4;if(r==="daisy"||r==="sunflower")S(o,.5,.5,n=>{let g=r==="daisy"?9:14,C=z*(r==="daisy"?.62:.6),k=z*(r==="daisy"?.2:.15);for(let we=0;we<g;we++){n.save(),n.rotate(we/g*Math.PI*2);let oe=n.createLinearGradient(0,0,0,-C);r==="daisy"?(oe.addColorStop(0,"#ffffff"),oe.addColorStop(1,"#fff6fa")):(oe.addColorStop(0,"#e38a0e"),oe.addColorStop(1,"#ffd23f")),n.fillStyle=oe,n.beginPath(),n.ellipse(0,-C*.55,k,C*.5,0,0,Math.PI*2),n.fill(),n.strokeStyle="rgba(0,0,0,.08)",n.lineWidth=2,n.stroke(),n.restore()}let B=n.createRadialGradient(-z*.05,-z*.05,2,0,0,z*(r==="daisy"?.2:.3));r==="daisy"?(B.addColorStop(0,"#ffe680"),B.addColorStop(1,"#f1a805")):(B.addColorStop(0,"#7a4a22"),B.addColorStop(1,"#3d220e")),n.fillStyle=B,n.beginPath(),n.arc(0,0,z*(r==="daisy"?.18:.28),0,Math.PI*2),n.fill()});else if(r==="starfish")S(o,.5,.48,n=>{n.rotate(.2),n.beginPath();for(let C=0;C<10;C++){let k=C%2?z*.28:z*.72,B=-Math.PI/2+C*Math.PI/5;n.lineTo(Math.cos(B)*k,Math.sin(B)*k)}n.closePath();let g=n.createRadialGradient(0,0,4,0,0,z*.7);g.addColorStop(0,"#ffc15a"),g.addColorStop(1,"#e8851f"),n.fillStyle=g,n.fill(),n.lineJoin="round",n.strokeStyle="#c96a16",n.lineWidth=4,n.stroke(),n.fillStyle="#fff4dc";for(let C=0;C<5;C++){let k=-Math.PI/2+C*Math.PI*2/5;for(let B=1;B<=3;B++)n.beginPath(),n.arc(Math.cos(k)*z*.17*B,Math.sin(k)*z*.17*B,3.2,0,7),n.fill()}});else if(r==="dots"){o.fillStyle=v?"#18181c":"#ffffff";for(let n=0;n<9;n++)for(let g=0;g<6;g++){let C=(g+n%2*.5+.25)/5.5,k=(n+.4)/8.5;S(o,C,k,B=>{B.beginPath(),B.arc(0,0,l*.045,0,7),B.fill()})}}else if(r==="heart")S(o,.5,.48,n=>{let g=z*.022;n.scale(g,g),n.beginPath(),n.moveTo(0,12),n.bezierCurveTo(-18,0,-14,-14,-5,-14),n.bezierCurveTo(-1,-14,0,-10,0,-8),n.bezierCurveTo(0,-10,1,-14,5,-14),n.bezierCurveTo(14,-14,18,0,0,12),n.closePath(),n.fillStyle=v?"#d4157a":"#ffffff",n.fill()}),S(a,.5,.48,n=>{n.strokeStyle="#d8b25a",n.lineWidth=5;let g=z*.022;n.scale(g,g),n.lineWidth=5/g,n.beginPath(),n.moveTo(0,12),n.bezierCurveTo(-18,0,-14,-14,-5,-14),n.bezierCurveTo(-1,-14,0,-10,0,-8),n.bezierCurveTo(0,-10,1,-14,5,-14),n.bezierCurveTo(14,-14,18,0,0,12),n.stroke()});else if(r==="swirl"){a.strokeStyle="#e1bd63",a.lineCap="round";let n=[[.15,.05],[.7,.3],[.25,.55],[.8,.8],[.45,1]];a.save(),a.scale(1,1),a.lineWidth=l*.035,a.beginPath(),a.moveTo(n[0][0]*l,(1-n[0][1])*l);for(let g=1;g<n.length;g++){let C=n[g-1],k=n[g];a.quadraticCurveTo(C[0]*l+(g%2?1:-1)*l*.35,(1-(C[1]+k[1])/2)*l,k[0]*l,(1-k[1])*l)}a.stroke(),a.lineWidth=l*.015,a.globalAlpha=.8,a.translate(l*.06,0),a.stroke(),a.restore();for(let g=0;g<14;g++)a.beginPath(),a.arc(Math.random()*l,Math.random()*l,2+Math.random()*5,0,7),a.fillStyle="#e8c878",a.fill()}else r==="gems"&&(He(t,.5,.24,.19),He(t,.24,.16,.1),He(t,.76,.16,.1),He(t,.5,.45,.085),He(t,.5,.6,.06),S(a,.5,.24,n=>{n.strokeStyle="#d9b45c",n.lineWidth=8,n.beginPath(),n.arc(0,0,l*.2,0,7),n.stroke()}));t.art.tex.needsUpdate=t.metal.tex.needsUpdate=!0}let gt=(()=>{let e=[new _(0,-.55),new _(1,0),new _(.92,.12),new _(.55,.3),new _(0,.3)],t=new mt(e,10);return t.rotateX(Math.PI/2),t.toNonIndexed()})();gt.computeVertexNormals();let Be=new $e({transmissionSampler:!0,chromaticAberration:.9,transmission:1,roughness:0,thickness:.4,anisotropicBlur:.05,distortion:0,distortionScale:0,temporalDistortion:0});Object.assign(Be,{ior:2.2,color:new q("#ffffff"),iridescence:.7,iridescenceIOR:1.6,flatShading:!0,envMapIntensity:2.2,specularIntensity:1,clearcoat:1});function He(e,t,o,a){let{p:r,nrm:s}=(()=>{let v=K(e,t,o);return{p:v.p,nrm:v.n}})(),d=new J(gt,Be),u=a*e.mesh.geometry.userData.w;d.scale.setScalar(u*3.2),d.position.copy(r).addScaledVector(s,u*.9),d.quaternion.setFromUnitVectors(new G(0,0,1),s),d.rotateZ(Math.random()*Math.PI),e.gems.add(d)}function mo(e){let t=new q(e);return .299*t.r+.587*t.g+.114*t.b}function fo(e){return w.nailColors[e].length?x[e].lastHex||w.color[1]:"#f0cdc4"}function xt(){x.forEach(e=>{let t=e.f.R*1.28;e.mesh.geometry.dispose(),e.mesh.geometry=Ee(w.shape,t,e.f.R*.82)}),x.forEach((e,t)=>Ce(t))}let O=new Te,ho=new ge({color:"#0c0c0e",roughness:.12,clearcoat:1,clearcoatRoughness:.05,metalness:0,envMapIntensity:.35}),Et=new ge({color:"#e6c27a",roughness:.22,metalness:1}),Tt=new ge({color:w.color[1],roughness:.15,clearcoat:1}),Mt=new J(new Fe(.15,.19,1.5,32),ho);Mt.position.y=1.42;let bt=new J(new Fe(.2,.2,.12,32),Et);bt.position.y=.66;let Rt=new J(new Fe(.035,.035,.5,12),Et);Rt.position.y=.38;let et=new J(new Fe(.075,.03,.26,24),Tt);et.position.y=.12,et.scale.z=.45,O.add(Mt,bt,Rt,et),O.scale.setScalar(.85),O.visible=!1,m.add(O);let yt=new G,wt=new G(0,0,1);function Ie(e,t){yt.copy(e).addScaledVector(t,.02),wt.copy(t)}function po(e){if(!O.visible)return;O.position.lerp(yt,1-Math.pow(1e-4,e));let t=wt.clone().multiplyScalar(.5).add(new G(.62,0,.6)).normalize(),o=new Nt().setFromUnitVectors(new G(0,1,0),t);O.quaternion.slerp(o,1-Math.pow(.001,e))}let se=[],p=null;function tt(e,t){e.forEach(o=>{w.nailColors[o]=[],se.push({i:o,hex:t,t:0})})}let Ue=[[.5,-.05,.5,1.05],[.22,0,.2,1.02],[.78,0,.8,1.02]];function vo(e){if(!p&&se.length&&(p=se.shift(),p.last=null,p.s=0,x[p.i].lastHex=p.hex,vt(p.i,p.name||w.color[0])),!p)return!1;let t=x[p.i],o=pt?50:3.6;for(p.t+=e*o;p.t>=1&&p.s<Ue.length;)z();if(p.s>=Ue.length)return n(),!0;let[a,r,s,d]=Ue[p.s],u=a+(s-a)*p.t,v=r+(d-r)*xo(p.t),l=.17;p.last?Je(t,p.last,[u,v],p.hex,l):Ze(t,u,v,p.hex,l),p.last=[u,v];let S=K(t,Math.min(1,Math.max(0,u)),Math.min(1,Math.max(0,v)));return t.mesh.updateWorldMatrix(!0,!1),Ie(S.p.clone().applyMatrix4(t.mesh.matrixWorld),S.n.clone().transformDirection(t.mesh.matrixWorld)),O.visible=!0,!0;function z(){let[g,C,k,B]=Ue[p.s];Je(t,p.last||[g,C],[k,B],p.hex,go()),p.s++,p.t-=1,p.last=null}function n(){let g=t.paint.ctx;g.save(),g.globalAlpha=1,g.fillStyle=p.hex,g.fillRect(0,0,Y,Y),g.restore(),t.paint.tex.needsUpdate=!0,Ce(p.i),Eo(p.i),p=null,se.length||(setTimeout(()=>{!se.length&&!j&&(O.visible=!1)},500),Oe("painted"))}}let go=()=>.17,xo=e=>e<.5?2*e*e:1-Math.pow(-2*e+2,2)/2,Le=[0,0,0,0,0];function Eo(e){Le[e]=1}let St=new eo,Ct=new _,j=null,Ae=null,ot=!1,le=T.domElement;function Ht(e){let t=le.getBoundingClientRect();return Ct.set((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1),St.setFromCamera(Ct,D),St.intersectObjects(x.map(a=>a.mesh),!1)[0]||null}le.addEventListener("pointerdown",e=>{let t=Ht(e);if(!t)return;le.setPointerCapture(e.pointerId);let o=t.object.userData.index;j={i:o,last:[t.uv.x,t.uv.y],moved:0},Ae=[e.clientX,e.clientY],x[o].lastHex=w.color[1],uo(o),w.rainbow=!1,Ze(x[o],t.uv.x,t.uv.y,w.color[1],.16),Ie(t.point,t.face.normal.clone().transformDirection(t.object.matrixWorld)),O.visible=!0}),le.addEventListener("pointermove",e=>{let t=le.getBoundingClientRect();ke.set((e.clientX-t.left)/t.width-.5,(e.clientY-t.top)/t.height-.5),Ve=.42*((e.clientX-t.left)/t.width-.5)*2,rt=performance.now();let o=Ht(e);if(j){j.moved+=Math.hypot(e.clientX-Ae[0],e.clientY-Ae[1]),Ae=[e.clientX,e.clientY],o&&o.object.userData.index===j.i&&(Je(x[j.i],j.last,[o.uv.x,o.uv.y],w.color[1],.16),j.last=[o.uv.x,o.uv.y],Ie(o.point,o.face.normal.clone().transformDirection(o.object.matrixWorld)));return}e.pointerType==="mouse"&&(ot=!!o,o&&!p?(Ie(o.point,o.face.normal.clone().transformDirection(o.object.matrixWorld)),O.visible=!0):p||(O.visible=!1),le.style.cursor=o?"none":"default")});let _t=()=>{if(!j)return;let{i:e,moved:t}=j;j=null,t<8?tt([e],w.color[1]):(Ce(e),Oe("painted"),N&&N("Gorgeous. Keep brushing, or tap a nail to give it a full coat.")),!ot&&!p&&setTimeout(()=>{!p&&!j&&(O.visible=!1)},400)};le.addEventListener("pointerup",_t),le.addEventListener("pointercancel",_t),le.addEventListener("pointerleave",()=>{ot=!1,!p&&!j&&(O.visible=!1)});let Ve=0,rt=0,ke=new _,at=new _;addEventListener("deviceorientation",e=>{e.gamma!=null&&(Ve=Math.max(-.4,Math.min(.4,e.gamma/60)),ke.set(e.gamma/90,(e.beta-45)/120),rt=performance.now())});function Pt(){let e=re.clientWidth,t=re.clientHeight;T.setSize(e,t,!1),_e.setSize(e,t),D.aspect=e/t;let o=D.aspect<.8?5.8:7,a=4.9,r=Gt.degToRad(D.fov),s=a/2/Math.tan(r/2),d=o/2/(Math.tan(r/2)*D.aspect),u=Math.max(s,d),v=new G(0,.82,.57).normalize();D.position.copy(F).addScaledVector(v,u),D.lookAt(F),m.fog.near=u*1.05,m.fog.far=u*2.1,he.uniforms.uFogNear.value=u*1.05,he.uniforms.uFogFar.value=u*2.1,D.updateProjectionMatrix(),X.setPixelRatio(T.getPixelRatio())}let _e=new no(T);_e.addPass(new io(m,D));let To=new Se(new _(256,256),.32,.55,.88);_e.addPass(To),_e.addPass(new so);let nt={last:performance.now(),elapsedTime:0,getDelta(){let e=performance.now(),t=(e-this.last)/1e3;return this.last=e,this.elapsedTime+=Math.min(t,.05),t}},Ge=!1,it=!1;function Dt(){if(!Ge)return;let e=Math.min(nt.getDelta(),1/20),t=nt.elapsedTime;ie.uTime.value=t,performance.now()-rt>2500&&!pt&&(Ve=Math.sin(t*.9)*.3,ke.set(Math.sin(t*.35)*.12,Math.cos(t*.27)*.08)),ie.uMagOff.value+=(Ve-ie.uMagOff.value)*Math.min(1,e*6),at.lerp(ke,Math.min(1,e*3)),j||($.rotation.y=at.x*.22,$.rotation.x=at.y*.05),x.forEach((o,a)=>{Le[a]=Math.max(0,Le[a]-e*1.8);let r=Math.sin(Le[a]*Math.PI)*.06;o.group.position.z=o.baseZ+r,o.gems.children.forEach(s=>s.rotateOnAxis(new G(0,0,1),e*.4))}),c.position.y=.5+(pt?0:Math.sin(t*.8)*.025),vo(e),po(e),Tt.color.set(w.color[1]),X.update(t),Be.uniforms&&(Be.uniforms.time.value=t),_e.render(e),requestAnimationFrame(Dt)}function Ft(){Ge||!it||document.hidden||(Ge=!0,nt.getDelta(),requestAnimationFrame(Dt))}function zt(){Ge=!1}return new IntersectionObserver(([e])=>{it=e.isIntersecting,it?Ft():zt()},{rootMargin:"100px"}).observe(re),document.addEventListener("visibilitychange",()=>document.hidden?zt():Ft()),new ResizeObserver(Pt).observe(re),xt(),Z(),Pt(),L(),tt([0,1,2,3,4],w.color[1]),Ut(e=>{e==="shape"&&xt(),e==="finish"&&Z(),e==="art"&&x.forEach((t,o)=>Ce(o)),e==="tone"&&M.color.set(w.tone)}),i&&i(),{paintAll(e){w.rainbow=!1,se.length=0,tt([0,1,2,3,4],e||w.color[1])},paintSet(e){w.rainbow=!0,se.length=0,e.forEach((t,o)=>{w.nailColors[o]=[],se.push({i:o,hex:t[1],t:0,name:t[0]})})},clear(){se.length=0,p=null,x.forEach((e,t)=>{e.paint.ctx.clearRect(0,0,Y,Y),e.paint.tex.needsUpdate=!0,w.nailColors[t]=[],Ce(t)}),w.rainbow=!1,Oe("painted")},fingerName:e=>Bt[e]}}export{No as createStudio};
