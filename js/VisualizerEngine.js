/* =========================================
   MODULE: VISUALIZER ENGINE (FIXED)
   Handles Three.js Scene, Camera, Rendering, and Resizing
   ========================================= */
class VisualizerEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.bloomPass = null;
        
        this.visualizations = {};
        this.currentViz = 'particles';
        
        this.isVisualsVisible = null; 
        this.bitcrush = 1;
        
        // Camera State
        this.camState = { mode: 'orbit', dist: 60, speed: 0.5, theta: Math.PI/4, phi: Math.PI/4, pan: new THREE.Vector3() };
        this.targetResolution = 'window'; 
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020205);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0012);

        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 3000);
        this.camera.position.set(0, 20, 60);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.scene.add(new THREE.AmbientLight(0x202020, 0.5));
        const l1 = new THREE.PointLight(0x00ffff, 2, 200); l1.position.set(50,50,50); this.scene.add(l1);
        const l2 = new THREE.PointLight(0xffaa00, 2, 200); l2.position.set(-50,-50,-50); this.scene.add(l2);

        const renderScene = new THREE.RenderPass(this.scene, this.camera);
        this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.bloomPass.strength = 0.8; 
        
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(this.bloomPass);

        this.initVisuals();
        this.handleResize();
    }

    // FIXED: Added missing bitcrush method for resolution downscaling
    setBitcrush(val) {
        this.bitcrush = val || 1;
        this.handleResize();
    }

    setResolution(mode) {
        this.targetResolution = mode;
        this.handleResize();
    }

    handleResize() {
        if (!this.renderer) return;
        
        const crunch = this.bitcrush || 1;
        let w, h;
        
        if (this.targetResolution === 'window') {
            w = window.innerWidth / crunch; 
            h = window.innerHeight / crunch;
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';
            this.renderer.setPixelRatio(window.devicePixelRatio);
        } else {
            const parts = this.targetResolution.split('x');
            w = parseInt(parts[0]) / crunch; 
            h = parseInt(parts[1]) / crunch;
            this.renderer.setPixelRatio(1); 
            this.renderer.domElement.style.width = 'auto';
            this.renderer.domElement.style.height = 'auto';
            this.renderer.domElement.style.maxWidth = '100%';
            this.renderer.domElement.style.maxHeight = '100%';
        }
        
        this.camera.aspect = (w * crunch) / (h * crunch);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w * crunch, h * crunch, false); 
        this.composer.setSize(w * crunch, h * crunch);
    }

    initVisuals() {
        const createMesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); this.scene.add(m); m.visible = false; return m; };
        const createPoints = (geo, mat) => { const p = new THREE.Points(geo, mat); this.scene.add(p); p.visible = false; return p; };

        // 1. Particles
        const pg = new THREE.BufferGeometry();
        const pos = []; const cols = [];
        for(let i=0; i<8000; i++) {
            pos.push((Math.random()-0.5)*120, (Math.random()-0.5)*120, (Math.random()-0.5)*120);
            cols.push(1,1,1);
        }
        pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        pg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        this.visualizations.particles = createPoints(pg, new THREE.PointsMaterial({size:0.4, vertexColors:true, blending:THREE.AdditiveBlending, depthWrite:false}));

        // 2. Sphere
        const sg = new THREE.IcosahedronGeometry(15, 5);
        sg.userData.orig = sg.attributes.position.clone();
        this.visualizations.sphere = createMesh(sg, new THREE.MeshPhongMaterial({color:0x00ffff, emissive:0xff00ff, emissiveIntensity:0.2, wireframe:true}));

        // 3. Galaxy
        const gg = new THREE.BufferGeometry();
        const gp = []; const gc = [];
        for(let i=0; i<15000; i++) {
            const r = Math.random()*60; const th = Math.random()*Math.PI*2;
            gp.push(Math.cos(th)*r, (Math.random()-0.5)*8, Math.sin(th)*r);
            gc.push(1,1,1);
        }
        gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
        gg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
        this.visualizations.galaxy = createPoints(gg, new THREE.PointsMaterial({size:0.15, vertexColors:true, blending:THREE.AdditiveBlending}));

        // 4. Stellar Core
        const starGeo = new THREE.IcosahedronGeometry(18, 6);
        starGeo.userData.orig = starGeo.attributes.position.clone();
        const starColors = new Float32Array(starGeo.attributes.position.count * 3);
        starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        this.visualizations.star = createMesh(starGeo, new THREE.MeshStandardMaterial({
            vertexColors: true, metalness: 0.2, roughness: 0.8, emissive: 0xffffff, emissiveIntensity: 1.0
        }));

        // 5. Parametric EQ
        const eg = new THREE.PlaneGeometry(120, 50, 127, 63);
        eg.rotateX(-Math.PI/2); eg.userData.orig = eg.attributes.position.clone();
        this.visualizations.parametricEq = createMesh(eg, new THREE.MeshPhongMaterial({color:0x06ffa5, emissive:0x3a86ff, emissiveIntensity:0.3, wireframe:true}));

        // 6. Crystalline
        this.visualizations.crystalline = new THREE.Group();
        const cg = new THREE.BoxGeometry(1.5,1.5,1.5);
        for(let i=0; i<80; i++){
            const m = new THREE.Mesh(cg, new THREE.MeshPhongMaterial({color:0xffffff, transparent:true, opacity:0.6}));
            m.position.set((Math.random()-0.5)*80, (Math.random()-0.5)*80, (Math.random()-0.5)*80);
            m.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
            this.visualizations.crystalline.add(m);
        }
        this.scene.add(this.visualizations.crystalline);
        this.switchVisual(this.currentViz);
    }

    switchVisual(name) {
        this.currentViz = name;
        this.updateVisibilityFlags(true, true); 
    }

    updateVisibilityFlags(shouldBeVisible, forceUpdate = false) {
        if (!forceUpdate && this.isVisualsVisible === shouldBeVisible) return;
        this.isVisualsVisible = shouldBeVisible;
        for(let k in this.visualizations) {
            if(this.visualizations[k]) {
                this.visualizations[k].visible = shouldBeVisible ? (k === this.currentViz) : false;
            }
        }
    }

    update(freqData, params) {
        const time = Date.now() * 0.0005;
        const cs = this.camState;
        
        if (cs.mode === 'orbit') {
            this.camera.position.x = Math.sin(cs.theta) * Math.sin(cs.phi) * cs.dist + cs.pan.x;
            this.camera.position.y = Math.cos(cs.phi) * cs.dist + cs.pan.y;
            this.camera.position.z = Math.cos(cs.theta) * Math.sin(cs.phi) * cs.dist + cs.pan.z;
            this.camera.lookAt(cs.pan);
        }

        if (this.bloomPass) this.bloomPass.strength = params.bloom * 1.5;

        const isPlaying = !!freqData;
        this.updateVisibilityFlags(isPlaying, false);

        if (isPlaying) {
            const len = freqData.length;
            const sensitivity = 2.5;

            switch (this.currentViz) {
                case 'particles': {
                    const p = this.visualizations.particles;
                    const c = p.geometry.attributes.color.array;
                    for(let i=0; i<c.length/3; i++) {
                        const val = freqData[Math.floor(i/(c.length/3)*len*0.6)]/255;
                        const col = new THREE.Color().setHSL(0.05 + val*0.1, 1, 0.5);
                        c[i*3] = col.r * val * params.color;
                        c[i*3+1] = col.g * val * params.color;
                        c[i*3+2] = col.b * val * params.color;
                    }
                    p.geometry.attributes.color.needsUpdate = true;
                    p.rotation.y += 0.001;
                    p.material.size = params.size;
                    break;
                }
                case 'star': {
                    const star = this.visualizations.star;
                    const pos = star.geometry.attributes.position;
                    const orig = star.geometry.userData.orig.array;
                    const colors = star.geometry.attributes.color.array;
                    const tCol = new THREE.Color();
                    for(let i=0; i<pos.array.length/3; i++) {
                        const val = (freqData[i%len]/255) * sensitivity;
                        const v = new THREE.Vector3(orig[i*3], orig[i*3+1], orig[i*3+2]).normalize().multiplyScalar(18 + (val*12));
                        pos.array[i*3] = v.x; pos.array[i*3+1] = v.y; pos.array[i*3+2] = v.z;
                        tCol.setHSL(val > 0.7 ? 0.55 : 0.05 + (val*0.1), 1, 0.4 + val*0.3);
                        colors[i*3] = tCol.r; colors[i*3+1] = tCol.g; colors[i*3+2] = tCol.b;
                    }
                    pos.needsUpdate = true;
                    star.geometry.attributes.color.needsUpdate = true;
                    star.rotation.y += 0.005;
                    break;
                }
                // (Sphere, Galaxy, EQ etc follow similar update patterns...)
            }
        }
        this.composer.render();
    }

    getCanvas() { return this.renderer.domElement; }
}
