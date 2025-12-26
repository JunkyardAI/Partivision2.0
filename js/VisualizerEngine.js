/* =========================================
   MODULE: VISUALIZER ENGINE
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
        
        // Camera State
        this.camState = { mode: 'orbit', dist: 50, speed: 0.5, theta: Math.PI/4, phi: Math.PI/4, pan: new THREE.Vector3() };
        
        this.targetResolution = 'window'; // 'window' or {w, h}
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0015);

        // Default camera aspect (will be fixed in resize)
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.camera.position.set(0, 20, 50);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.scene.add(new THREE.AmbientLight(0x404040, 0.5));
        const l1 = new THREE.PointLight(0x00ffff, 1, 150); l1.position.set(0,30,30); this.scene.add(l1);
        const l2 = new THREE.PointLight(0xff00ff, 1, 150); l2.position.set(0,30,-30); this.scene.add(l2);

        // Post-processing
        const renderScene = new THREE.RenderPass(this.scene, this.camera);
        this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.bloomPass.strength = 0.5; this.bloomPass.radius = 0; this.bloomPass.threshold = 0;
        
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(this.bloomPass);

        this.initVisuals();
        this.handleResize();
    }

    setResolution(mode) {
        this.targetResolution = mode;
        this.handleResize();
    }

    handleResize() {
        let w, h;

        if (this.targetResolution === 'window') {
            w = window.innerWidth;
            h = window.innerHeight;
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';
            this.renderer.domElement.style.maxWidth = 'none';
            this.renderer.domElement.style.maxHeight = 'none';
            this.renderer.setPixelRatio(window.devicePixelRatio);
        } else {
            // Parse "1080x1920"
            const parts = this.targetResolution.split('x');
            w = parseInt(parts[0]);
            h = parseInt(parts[1]);
            
            // For recording precision, use PixelRatio 1
            this.renderer.setPixelRatio(1); 
            
            // CSS scaling to fit viewport
            this.renderer.domElement.style.width = 'auto';
            this.renderer.domElement.style.height = 'auto';
            this.renderer.domElement.style.maxWidth = '100%';
            this.renderer.domElement.style.maxHeight = '100%';
        }

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false); 
        this.composer.setSize(w, h);
        
        // If custom resolution, we manually set width/height attribs to ensure buffer size
        if (this.targetResolution !== 'window') {
            this.renderer.domElement.width = w;
            this.renderer.domElement.height = h;
        }
    }

    initVisuals() {
        // Helpers to keep code clean
        const createMesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); this.scene.add(m); return m; };
        const createPoints = (geo, mat) => { const p = new THREE.Points(geo, mat); this.scene.add(p); return p; };

        // 1. Particles
        const pg = new THREE.BufferGeometry();
        const pos = []; const cols = [];
        for(let i=0; i<8000; i++) {
            pos.push((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100);
            cols.push(1,1,1);
        }
        pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        pg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        this.visualizations.particles = createPoints(pg, new THREE.PointsMaterial({size:0.5, vertexColors:true, blending:THREE.AdditiveBlending, depthWrite:false}));

        // 2. Sphere
        const sg = new THREE.IcosahedronGeometry(15, 5);
        sg.userData.orig = sg.attributes.position.clone();
        this.visualizations.sphere = createMesh(sg, new THREE.MeshPhongMaterial({color:0x00ffff, emissive:0xff00ff, emissiveIntensity:0.1, wireframe:true}));

        // 3. Galaxy
        const gg = new THREE.BufferGeometry();
        const gp = []; const gc = [];
        for(let i=0; i<10000; i++) {
            const r = Math.random()*50; const th = Math.random()*Math.PI*2;
            gp.push(Math.cos(th)*r, (Math.random()-0.5)*5, Math.sin(th)*r);
            gc.push(1,1,1);
        }
        gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
        gg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
        this.visualizations.galaxy = createPoints(gg, new THREE.PointsMaterial({size:0.2, vertexColors:true, blending:THREE.AdditiveBlending}));

        // 4. Terrain
        const tg = new THREE.PlaneGeometry(80, 80, 127, 127);
        tg.rotateX(-Math.PI/2); tg.userData.orig = tg.attributes.position.clone();
        this.visualizations.terrain = createMesh(tg, new THREE.MeshPhongMaterial({color:0x3a86ff, emissive:0x8338ec, emissiveIntensity:0.2, wireframe:true}));
        
        // 5. Parametric EQ
        const eg = new THREE.PlaneGeometry(100, 40, 127, 63);
        eg.rotateX(-Math.PI/2); eg.userData.orig = eg.attributes.position.clone();
        this.visualizations.parametricEq = createMesh(eg, new THREE.MeshPhongMaterial({color:0x06ffa5, emissive:0x3a86ff, emissiveIntensity:0.2, wireframe:true}));

        // 6. Crystalline
        this.visualizations.crystalline = new THREE.Group();
        const cg = new THREE.BoxGeometry(1,1,1);
        for(let i=0; i<64; i++){
            const m = new THREE.Mesh(cg, new THREE.MeshPhongMaterial({color:0xffffff, transparent:true, opacity:0.7}));
            m.position.set((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
            m.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
            this.visualizations.crystalline.add(m);
        }
        this.scene.add(this.visualizations.crystalline);

        this.switchVisual(this.currentViz);
    }

    switchVisual(name) {
        this.currentViz = name;
        for(let k in this.visualizations) {
            const obj = this.visualizations[k];
            if(obj) obj.visible = (k === name);
        }
    }

    update(freqData, params) {
        // Camera Logic
        const t = Date.now() * 0.0001;
        const cam = this.camera;
        const cs = this.camState;
        
        if (cs.mode === 'orbit') {
            cam.position.x = Math.sin(cs.theta) * Math.sin(cs.phi) * cs.dist + cs.pan.x;
            cam.position.y = Math.cos(cs.phi) * cs.dist + cs.pan.y;
            cam.position.z = Math.cos(cs.theta) * Math.sin(cs.phi) * cs.dist + cs.pan.z;
            cam.lookAt(cs.pan);
        } else if (cs.mode === 'fly') {
            cam.position.x = Math.sin(t*cs.speed)*cs.dist;
            cam.position.y = 20 + Math.cos(t*cs.speed*1.2)*10;
            cam.position.z = Math.cos(t*cs.speed)*cs.dist;
            cam.lookAt(0,0,0);
        } else if (cs.mode === 'fps') {
            cam.position.x = Math.sin(t*cs.speed)*30;
            cam.position.y = 5;
            cam.position.z = Math.cos(t*cs.speed)*30;
            cam.lookAt(0,10,0);
        } else {
            cam.position.set(0, 30, 70);
            cam.lookAt(0,0,0);
        }

        // Update Bloom
        if (this.bloomPass) this.bloomPass.strength = params.bloom;

        // --- VISUALIZATION UPDATE (Only runs if audio data exists) ---
        if (freqData) {
            const len = freqData.length;
            const sensitivity = 2.0;

            const updateGeo = (obj, fn) => {
                const pos = obj.geometry.attributes.position;
                const orig = obj.geometry.userData.orig.array;
                const arr = pos.array;
                fn(arr, orig, freqData, sensitivity, len);
                pos.needsUpdate = true;
                obj.geometry.computeVertexNormals();
            };

            switch (this.currentViz) {
                case 'particles': {
                    const p = this.visualizations.particles;
                    const c = p.geometry.attributes.color.array;
                    const pa = p.geometry.attributes.position.array;
                    for(let i=0; i<pa.length/3; i++) {
                        const idx = Math.floor(i/(pa.length/3)*len*0.5);
                        const val = freqData[idx]/255;
                        const col = new THREE.Color().setHSL(idx/(len*0.5), 1, 0.5);
                        c[i*3] = col.r * val * params.color;
                        c[i*3+1] = col.g * val * params.color;
                        c[i*3+2] = col.b * val * params.color;
                    }
                    p.geometry.attributes.color.needsUpdate = true;
                    p.rotation.y += 0.0005;
                    p.material.size = params.size;
                    break;
                }
                case 'sphere':
                    updateGeo(this.visualizations.sphere, (arr, orig, f, s, l) => {
                        for(let i=0; i<arr.length/3; i++) {
                            const val = f[i%l]/255 * s * 5;
                            const v = new THREE.Vector3(orig[i*3], orig[i*3+1], orig[i*3+2]).normalize().multiplyScalar(15 + val);
                            arr[i*3] = v.x; arr[i*3+1] = v.y; arr[i*3+2] = v.z;
                        }
                    });
                    this.visualizations.sphere.rotation.y += 0.002;
                    break;
                case 'terrain':
                    updateGeo(this.visualizations.terrain, (arr, orig, f, s, l) => {
                            for(let i=0; i<128; i++) {
                                const val = f[i]/255 * s * 15;
                                for(let j=0; j<128; j++) {
                                    const idx = (i*128 + j)*3 + 1; // y
                                    arr[idx] = orig[idx] + val;
                                }
                            }
                    });
                    break;
                case 'galaxy':
                    const g = this.visualizations.galaxy;
                    const col = g.geometry.attributes.color.array;
                    for(let i=0; i<col.length/3; i++){
                        const idx = Math.floor(i/(col.length/3)*len*0.2);
                        const val = freqData[idx]/255;
                        const c = new THREE.Color().setHSL(0.6 + 0.4*val, 1, 0.5 + 0.5*val);
                        col[i*3] = c.r * params.color; col[i*3+1] = c.g * params.color; col[i*3+2] = c.b * params.color;
                    }
                    g.geometry.attributes.color.needsUpdate = true;
                    g.rotation.y += 0.001;
                    break;
                    case 'parametricEq':
                    updateGeo(this.visualizations.parametricEq, (arr, orig, f, s, l) => {
                        for(let i=0; i<=127; i++) {
                            const idx = Math.floor(i/127 * (l*0.4));
                            const val = f[idx]/255 * s * 20;
                            for(let j=0; j<=63; j++) {
                                const n = (j*128 + i)*3 + 1;
                                arr[n] = orig[n] + val;
                            }
                        }
                    });
                    break;
                    case 'crystalline':
                    this.visualizations.crystalline.children.forEach((c, i) => {
                        const val = freqData[i%len]/255 * sensitivity;
                        c.scale.setScalar(1 + 3*val);
                        c.material.emissiveIntensity = 2*val;
                    });
                    this.visualizations.crystalline.rotation.y += 0.002;
                    break;
            }
        }
        
        // --- ALWAYS RENDER (Even if paused) ---
        this.composer.render();
    }

    getCanvas() { return this.renderer.domElement; }
}
