/* =========================================
   MODULE: UI MANAGER
   Handles DOM Interactions, Hotkeys, and Draggables
   ========================================= */
class UIManager {
    constructor(app) {
        this.app = app;
        this.dom = {
            file: document.getElementById('audioFile'),
            play: document.getElementById('playBtn'),
            pause: document.getElementById('pauseBtn'),
            record: document.getElementById('recordBtn'),
            snap: document.getElementById('snapshotBtn'),
            hideUi: document.getElementById('hideUiBtn'),
            help: document.getElementById('helpBtn'), 
            helpOverlay: document.getElementById('help-overlay'), 
            closeHelp: document.getElementById('closeHelpBtn'),
            canvasSize: document.getElementById('canvasSize'),
            visualMode: document.getElementById('visualMode'),
            fftSize: document.getElementById('fftSize'),
            time: document.getElementById('timeDisplay'),
            progress: document.getElementById('progressFill'),
            bar: document.getElementById('progressBar'),
            loading: document.getElementById('loading-overlay'),
            drop: document.getElementById('drop-overlay'),
            panels: document.querySelectorAll('.settings-panel'),
            playbackControls: document.getElementById('playback-controls'),
            clearFileBtn: document.getElementById('clearFileBtn')
        };

        this.bindEvents();
        this.setupHotkeys();
        this.setupDraggables();
    }

    bindEvents() {
        // Playback
        this.dom.file.addEventListener('change', e => this.app.load(e.target.files[0]));
        this.dom.play.addEventListener('click', () => this.app.play());
        this.dom.pause.addEventListener('click', () => this.app.pause());
        this.dom.bar.addEventListener('click', e => {
            const r = this.dom.bar.getBoundingClientRect();
            this.app.seek((e.clientX - r.left)/r.width);
        });
        
        // Recording
        this.dom.record.addEventListener('click', () => {
            this.app.toggleRecord();
            // Update UI State
            this.dom.record.classList.toggle('recording', this.app.recorder.isRecording);
            this.dom.record.title = this.app.recorder.isRecording ? "Stop Recording (R)" : "Start High Quality Recording (R)";
        });
        this.dom.snap.addEventListener('click', () => this.app.snapshot());

        // UI & Help
        this.dom.hideUi.addEventListener('click', () => document.body.classList.toggle('ui-hidden'));
        this.dom.help.addEventListener('click', () => this.dom.helpOverlay.classList.add('active'));
        this.dom.closeHelp.addEventListener('click', () => this.dom.helpOverlay.classList.remove('active'));
        this.dom.helpOverlay.addEventListener('click', (e) => {
            if(e.target === this.dom.helpOverlay) this.dom.helpOverlay.classList.remove('active');
        });

        // Settings
        this.dom.canvasSize.addEventListener('change', e => this.app.setResolution(e.target.value));
        this.dom.visualMode.addEventListener('change', e => this.app.setVisual(e.target.value));
        this.dom.fftSize.addEventListener('change', e => this.app.setFFT(parseInt(e.target.value)));
        
        // Drag Drop
        window.addEventListener('dragenter', e => { e.preventDefault(); this.dom.drop.classList.add('active'); });
        window.addEventListener('dragover', e => e.preventDefault());
        window.addEventListener('dragleave', e => { if(!e.relatedTarget) this.dom.drop.classList.remove('active'); });
        window.addEventListener('drop', e => {
            e.preventDefault();
            this.dom.drop.classList.remove('active');
            if(e.dataTransfer.files.length) this.app.load(e.dataTransfer.files[0]);
        });

        // Params
        document.getElementById('volume').addEventListener('input', e => {
            this.app.audio.setVolume(e.target.value);
            document.getElementById('vol-val').textContent = e.target.value + '%';
        });
        
        // Param Sliders
        ['particleSize','colorIntensity','bloomStrength'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.app.updateParams()); 
        });
        
        // Presets
        document.querySelectorAll('.preset-btn').forEach(b => {
            b.addEventListener('click', () => this.applyPreset(b.dataset.preset)); 
        });

        // Camera Controls
        document.querySelectorAll('.cam-mode-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('.cam-mode-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this.app.viz.camState.mode = b.dataset.mode;
            });
        });
        ['camDistance','camSpeed'].forEach(id => {
            document.getElementById(id).addEventListener('input', e => {
                const k = id === 'camDistance' ? 'dist' : 'speed';
                this.app.viz.camState[k] = parseFloat(e.target.value);
            });
        });
        document.getElementById('camFOV').addEventListener('input', e => {
            this.app.viz.camera.fov = parseFloat(e.target.value);
            this.app.viz.camera.updateProjectionMatrix();
        });
        
        // Mouse Interaction (Orbit/Pan)
        const c = document.getElementById('stage-container');
        let md = false, rmd = false, lx=0, ly=0;
        c.addEventListener('mousedown', e => { if(e.button===0) md=true; if(e.button===2) rmd=true; lx=e.clientX; ly=e.clientY; });
        window.addEventListener('mouseup', () => { md=false; rmd=false; });
        c.addEventListener('mousemove', e => {
            if(!md && !rmd) return;
            const dx = e.clientX - lx; const dy = e.clientY - ly;
            const cs = this.app.viz.camState;
            if(md) {
                cs.theta -= dx * 0.005;
                cs.phi = Math.max(0.1, Math.min(Math.PI-0.1, cs.phi - dy * 0.005));
            }
            lx = e.clientX; ly = e.clientY;
        });
        c.addEventListener('wheel', e => {
            e.preventDefault();
            this.app.viz.camState.dist = Math.max(10, Math.min(200, this.app.viz.camState.dist + e.deltaY * 0.1));
            document.getElementById('camDistance').value = this.app.viz.camState.dist;
        });
        c.addEventListener('contextmenu', e => e.preventDefault());
    }

    setupHotkeys() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch(e.key.toLowerCase()) {
                case ' ':
                case 'k': 
                    e.preventDefault();
                    this.app.isPlaying ? this.app.pause() : this.app.play();
                    break;
                case 'h':
                    document.body.classList.toggle('ui-hidden');
                    break;
                case 'r':
                    // Simulate button click to keep UI state in sync
                    this.dom.record.click(); 
                    break;
                case 's':
                    this.app.snapshot();
                    break;
                case 'escape':
                    document.body.classList.remove('ui-hidden');
                    this.dom.helpOverlay.classList.remove('active');
                    break;
                case '/':
                case '?':
                    this.dom.helpOverlay.classList.toggle('active');
                    break;
            }
        });
    }

    setupDraggables() {
        const makeDrag = (el) => {
            const h = el.querySelector('.panel-header');
            let isD = false, ox, oy;
            h.addEventListener('mousedown', e => { isD=true; ox=e.clientX-el.offsetLeft; oy=e.clientY-el.offsetTop; el.style.transition='none'; });
            window.addEventListener('mousemove', e => {
                if(!isD) return;
                el.style.left = (e.clientX-ox)+'px'; el.style.top = (e.clientY-oy)+'px';
            });
            window.addEventListener('mouseup', () => { if(isD) el.style.transition=''; isD=false; });
        };
        this.dom.panels.forEach(makeDrag);
        
        // Resize listener for viz
        window.addEventListener('resize', () => this.app.viz.handleResize());
    }

    updateProgress(curr, dur) {
        const pct = dur > 0 ? (curr/dur)*100 : 0;
        this.dom.progress.style.width = pct + '%';
        const fmt = s => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
        this.dom.time.textContent = `${fmt(curr)} / ${fmt(dur)}`;
    }
    
    applyPreset(p) {
        const d = { subtle: {p:0.5, c:0.8, b:0.3}, intense: {p:2,c:1.5,b:1.2}, club: {p:1.5,c:1.2,b:0.8}, minimal: {p:0.8,c:0.5,b:0.1} }[p];
        if(d) {
            document.getElementById("particleSize").value=d.p; document.getElementById("colorIntensity").value=d.c; document.getElementById("bloomStrength").value=d.b;
            this.app.updateParams();
        }
    }
}
