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
        
        // Track state to avoid redundant updates
        this.isVisualsVisible = null; 
        
        // Camera State
        this.camState = { mode: 'orbit', dist: 60, speed: 0.5, theta: Math.PI/4, phi: Math.PI/4, pan: new THREE.Vector3() };
        this.targetResolution = 'window'; 
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020205);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0012);

        // Increased far plane to prevent clipping
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 3000);
        this.camera.position.set(0, 20, 60);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lighting - Star needs better illumination
        this.scene.add(new THREE.AmbientLight(0x202020, 0.5));
        const l1 = new THREE.PointLight(0x00ffff, 2, 200); l1.position.set(50,50,50); this.scene.add(l1);
        const l2 = new THREE.PointLight(0xffaa00, 2, 200); l2.position.set(-50,-50,-50); this.scene.add(l2);

        // Post-processing
        const renderScene = new THREE.RenderPass(this.scene, this.camera);
        this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.bloomPass.strength = 0.8; this.bloomPass.radius = 0.5; this.bloomPass.threshold = 0.1;
        
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
            w = window.innerWidth; h = window.innerHeight;
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';
            this.renderer.setPixelRatio(window.devicePixelRatio);
        } else {
            const parts = this.targetResolution.split('x');
            w = parseInt(parts[0]); h = parseInt(parts[1]);
            this.renderer.setPixelRatio(1); 
            this.renderer.domElement.style.width = 'auto';
            this.renderer.domElement.style.height = 'auto';
            this.renderer.domElement.style.maxWidth = '100%';
            this.renderer.domElement.style.maxHeight = '100%';
        }
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false); 
        this.composer.setSize(w, h);
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

        // 4. Stellar Core (Replaces Terrain/Spiral)
        const starGeo = new THREE.IcosahedronGeometry(18, 6);
        starGeo.userData.orig = starGeo.attributes.position.clone();
        const starColors = new Float32Array(starGeo.attributes.position.count * 3);
        starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        
        this.visualizations.star = createMesh(starGeo, new THREE.MeshStandardMaterial({
            vertexColors: true,
            metalness: 0.2,
            roughness: 0.8,
            emissive: 0xffffff,
            emissiveIntensity: 1.0,
            flatShading: false
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
        this.visualizations.crystalline.visible = false;

        this.switchVisual(this.currentViz);
    }

    switchVisual(name) {
        // Backwards compatibility for the dropdown if not edited yet
        if(name === 'terrain' || name === 'spiral') name = 'star';
        this.currentViz = name;
        this.updateVisibilityFlags(true, true); 
    }

    updateVisibilityFlags(shouldBeVisible, forceUpdate = false) {
        if (!forceUpdate && this.isVisualsVisible === shouldBeVisible) return;
        this.isVisualsVisible = shouldBeVisible;
        for(let k in this.visualizations) {
            if(this.visualizations[k]) {
                const targetState = shouldBeVisible ? (k === this.currentViz) : false;
                this.visualizations[k].visible = targetState;
            }
        }
    }

    update(freqData, params) {
        const time = Date.now() * 0.0005;
        const cam = this.camera;
        const cs = this.camState;
        
        if (cs.mode === 'orbit') {
            cam.position.x = Math.sin(cs.theta) * Math.sin(cs.phi) * cs.dist + cs.pan.x;
            cam.position.y = Math.cos(cs.phi) * cs.dist + cs.pan.y;
            cam.position.z = Math.cos(cs.theta) * Math.sin(cs.phi) * cs.dist + cs.pan.z;
            cam.lookAt(cs.pan);
        } else if (cs.mode === 'fly') {
            cam.position.x = Math.sin(time*cs.speed*0.2)*cs.dist;
            cam.position.y = 15 + Math.cos(time*cs.speed*0.3)*15;
            cam.position.z = Math.cos(time*cs.speed*0.2)*cs.dist;
            cam.lookAt(0,0,0);
        } else if (cs.mode === 'fps') {
            cam.position.x = Math.sin(time*cs.speed*0.5)*40;
            cam.position.y = 10;
            cam.position.z = Math.cos(time*cs.speed*0.5)*40;
            cam.lookAt(0,5,0);
        }

        if (this.bloomPass) this.bloomPass.strength = params.bloom * 1.5;

        const isPlaying = !!freqData;
        this.updateVisibilityFlags(isPlaying, false);

        if (isPlaying) {
            const len = freqData.length;
            const sensitivity = 2.5;

            const updateGeo = (obj, fn) => {
                if(!obj || !obj.geometry || !obj.geometry.attributes.position) return;
                const pos = obj.geometry.attributes.position;
                const orig = obj.geometry.userData.orig.array;
                const arr = pos.array;
                fn(arr, orig, freqData, sensitivity, len);
                pos.needsUpdate = true;
                if(obj.geometry.attributes.color) obj.geometry.attributes.color.needsUpdate = true;
                obj.geometry.computeVertexNormals();
            };

            switch (this.currentViz) {
                case 'particles': {
                    const p = this.visualizations.particles;
                    const c = p.geometry.attributes.color.array;
                    for(let i=0; i<c.length/3; i++) {
                        const idx = Math.floor(i/(c.length/3)*len*0.6);
                        const val = freqData[idx]/255;
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
                case 'sphere':
                    updateGeo(this.visualizations.sphere, (arr, orig, f, s, l) => {
                        for(let i=0; i<arr.length/3; i++) {
                            const val = f[i%l]/255 * s * 6;
                            const v = new THREE.Vector3(orig[i*3], orig[i*3+1], orig[i*3+2]).normalize().multiplyScalar(15 + val);
                            arr[i*3] = v.x; arr[i*3+1] = v.y; arr[i*3+2] = v.z;
                        }
                    });
                    this.visualizations.sphere.rotation.y += 0.003;
                    break;
                case 'star':
                    const star = this.visualizations.star;
                    updateGeo(star, (arr, orig, f, s, l) => {
                        const cols = star.geometry.attributes.color.array;
                        const tempCol = new THREE.Color();
                        
                        for(let i=0; i<arr.length/3; i++) {
                            // Fluid motion based on index and time
                            const noise = Math.sin(i * 0.1 + time * 2) * 0.5;
                            const freqIdx = Math.floor((i / (arr.length/3)) * l * 0.5);
                            const val = (f[freqIdx] / 255) * s;
                            
                            // Blue Flames vs Yellow Core Logic
                            const distFactor = 18 + (val * 12) + noise;
                            const v = new THREE.Vector3(orig[i*3], orig[i*3+1], orig[i*3+2]).normalize().multiplyScalar(distFactor);
                            arr[i*3] = v.x; arr[i*3+1] = v.y; arr[i*3+2] = v.z;

                            // Color heat map: 
                            // Low = Orange/Red (0.0), Mid = Yellow (0.15), High (Clipping) = Blue/Cyan (0.5-0.6)
                            let hue = 0.05 + (val * 0.1); // Yellow/Orange base
                            let saturation = 1.0;
                            let lightness = 0.4 + (val * 0.4);

                            if(val > 0.7) { // High intensity "clipping" into blue flames
                                hue = 0.55 + (val - 0.7); 
                                lightness = 0.6;
                            } else if (val < 0.2) { // Cooler yellow/red
                                hue = 0.02;
                                lightness = 0.3;
                            }

                            tempCol.setHSL(hue, saturation, lightness);
                            cols[i*3] = tempCol.r; cols[i*3+1] = tempCol.g; cols[i*3+2] = tempCol.b;
                        }
                        star.material.emissive.setHSL(0.1, 1, 0.2 + (f[10]/255)*0.5);
                    });
                    star.rotation.y += 0.005;
                    star.rotation.z += 0.002;
                    break;
                case 'galaxy':
                    const g = this.visualizations.galaxy;
                    const gcol = g.geometry.attributes.color.array;
                    for(let i=0; i<gcol.length/3; i++){
                        const idx = Math.floor(i/(gcol.length/3)*len*0.3);
                        const val = freqData[idx]/255;
                        const c = new THREE.Color().setHSL(0.5 + 0.2*val, 1, 0.5);
                        gcol[i*3] = c.r * params.color; gcol[i*3+1] = c.g * params.color; gcol[i*3+2] = c.b * params.color;
                    }
                    g.geometry.attributes.color.needsUpdate = true;
                    g.rotation.y += 0.002;
                    break;
                case 'parametricEq':
                    updateGeo(this.visualizations.parametricEq, (arr, orig, f, s, l) => {
                        for(let i=0; i<=127; i++) {
                            const idx = Math.floor(i/127 * (l*0.4));
                            const val = (f[idx]/255) * s * 25;
                            for(let j=0; j<=63; j++) {
                                const n = (j*128 + i)*3 + 1;
                                arr[n] = orig[n] + val;
                            }
                        }
                    });
                    break;
                case 'crystalline':
                    this.visualizations.crystalline.children.forEach((c, i) => {
                        const val = freqData[i % len]/255 * sensitivity;
                        c.scale.setScalar(1 + 4*val);
                        c.material.emissive.setHSL(i/80, 1, 0.5);
                        c.material.emissiveIntensity = 3*val;
                    });
                    this.visualizations.crystalline.rotation.y += 0.004;
                    break;
            }
        }
        this.composer.render();
    }

    getCanvas() { return this.renderer.domElement; }
}
