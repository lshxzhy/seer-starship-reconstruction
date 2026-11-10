  // The colour and depth for contact shading come from the same scene draw.
  // The direct path retains native MSAA where a sampleable depth target is unavailable.
  function createFrameFinish() {
    const supported=renderer.capabilities.isWebGL2 || renderer.extensions.has('WEBGL_depth_texture');
    const size=new T.Vector2(), fullscreen=new T.Scene(), screenCamera=new T.Camera();
    const uniforms={
      frameColor:{value:null},frameDepth:{value:null},pixel:{value:new T.Vector2()},
      lens:{value:new T.Vector2()},clipPlanes:{value:new T.Vector2()},radius:{value:1}
    };
    const material=new T.RawShaderMaterial({
      depthTest:false,depthWrite:false,toneMapped:false,uniforms,
      vertexShader:`
        attribute vec3 position;
        varying vec2 uv;
        void main(){
          uv=position.xy*.5+.5;
          gl_Position=vec4(position.xy,0.,1.);
        }`,
      fragmentShader:`
        precision highp float;
        uniform sampler2D frameColor, frameDepth;
        uniform vec2 pixel, lens, clipPlanes;
        uniform float radius;
        varying vec2 uv;
        float eyeDistance(vec2 at){
          float d=texture2D(frameDepth,at).x;
          return clipPlanes.x*clipPlanes.y/(clipPlanes.y-d*(clipPlanes.y-clipPlanes.x));
        }
        vec3 viewPoint(vec2 at){
          float z=eyeDistance(at);
          return vec3((at*2.-1.)*lens*z,-z);
        }
        float luma(vec4 c){return dot(c.rgb,vec3(.299,.587,.114));}
        void main(){
          vec2 dx=vec2(pixel.x,0.),dy=vec2(0.,pixel.y);
          vec4 center=texture2D(frameColor,uv);
          vec4 left=texture2D(frameColor,uv-dx),right=texture2D(frameColor,uv+dx);
          vec4 top=texture2D(frameColor,uv+dy),bottom=texture2D(frameColor,uv-dy);
          float lo=min(luma(center),min(min(luma(left),luma(right)),min(luma(top),luma(bottom))));
          float hi=max(luma(center),max(max(luma(left),luma(right)),max(luma(top),luma(bottom))));
          if(hi-lo>max(.04,.15*hi)){
            vec2 edge=vec2(luma(top)-luma(bottom),luma(left)-luma(right));
            edge/=max(max(abs(edge.x),abs(edge.y)),.001);
            vec2 axis=pixel*edge*.5;
            center=mix(center,(texture2D(frameColor,uv-axis)+texture2D(frameColor,uv+axis))*.5,.72);
          }
          vec3 p=viewPoint(uv);
          float projected=radius/(2.*lens.y*-p.z);
          if(projected>pixel.y*1.8 && p.z>-clipPlanes.y*.95){
            vec3 ax=viewPoint(uv+dx)-p,bx=p-viewPoint(uv-dx);
            vec3 ay=viewPoint(uv+dy)-p,by=p-viewPoint(uv-dy);
            vec3 n=normalize(cross(abs(ax.z)<abs(bx.z)?ax:bx,abs(ay.z)<abs(by.z)?ay:by));
            vec2 span=min(projected,.095)*vec2(lens.y/lens.x,1.);
            float occluded=0.;
            for(int k=0;k<10;k++){
              float i=float(k), angle=i*2.399963;
              vec2 delta=span*vec2(cos(angle),sin(angle))*sqrt((i+.65)/10.);
              vec3 samplePoint=viewPoint(clamp(uv+delta,pixel,1.-pixel));
              vec3 diff=samplePoint-p;
              float dist=length(diff);
              float alignment=max(0.,dot(diff,n)-radius*.035)/max(dist,.000001);
              occluded+=alignment*(1.-smoothstep(radius*.13,radius*1.30,dist));
            }
            center.rgb*=1.-min(.27,occluded*.15);
          }
          gl_FragColor=center;
        }`
    });
    const triangle=new T.BufferGeometry();
    triangle.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
    const mesh=new T.Mesh(triangle,material);mesh.frustumCulled=false;fullscreen.add(mesh);
    let target=null;
    function render(radius) {
      if(!supported){renderer.render(scene,camera);return;}
      renderer.getDrawingBufferSize(size);
      if(!target) {
        target=new T.WebGLRenderTarget(size.x,size.y,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,
          encoding:T.sRGBEncoding,depthBuffer:true,stencilBuffer:false,generateMipmaps:false});
        target.texture.generateMipmaps=false;
        target.depthTexture=new T.DepthTexture(size.x,size.y,T.UnsignedIntType);
        uniforms.frameColor.value=target.texture;uniforms.frameDepth.value=target.depthTexture;
      } else if(target.width!==size.x || target.height!==size.y) target.setSize(size.x,size.y);
      const tan=Math.tan(T.MathUtils.degToRad(camera.fov)*.5);
      uniforms.pixel.value.set(1/size.x,1/size.y);
      uniforms.lens.value.set(tan*camera.aspect,tan);
      uniforms.clipPlanes.value.set(camera.near,camera.far);
      uniforms.radius.value=radius;
      renderer.setRenderTarget(target);renderer.render(scene,camera);
      renderer.setRenderTarget(null);renderer.render(fullscreen,screenCamera);
    }
    return {render, dispose(){target?.dispose();material.dispose();triangle.dispose();}};
  }
