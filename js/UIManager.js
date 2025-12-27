/* =========================================
   MODULE: UI MANAGER
   Handles DOM, Hotkeys, and Help
   ========================================= */
class UIManager {
    constructor(app) {
        this.app = app;
        this.dom = {
            file: document.getElementById('audioFile'), play: document.getElementById('playBtn'), pause: document.getElementById('pauseBtn'),
            record: document.getElementById('recordBtn'), snap: document.getElementById('snapshotBtn'), hideUi: document.getElementById('hideUiBtn'),
            help: document.getElementById('helpBtn'), helpOverlay: document.getElementById('help-overlay'), closeHelp: document.getElementById('closeHelpBtn'),
            canvasSize: document.getElementById('canvasSize'), visualMode: document.getElementById('visualMode'), fftSize: document.getElementById('fftSize'),
            time: document.getElementById('timeDisplay'), progress: document.getElementById('progressFill'), bar: document.getElementById('progressBar'),
            loading: document.getElementById('loading-overlay'), drop: document.getElementById('drop-overlay'), panels: document.querySelectorAll('.settings-panel'),
            playbackControls: document.getElementById('playback-controls'), clearFileBtn: document.getElementById('clearFileBtn')
        };
        this.bindEvents(); this.setupHotkeys(); this.setupDraggables();
    }

    bindEvents() {
        this.dom.file.addEventListener('change', e => this.app.load(e.target.files[0]));
        this.dom.play.addEventListener('click', () => this.app.play());
        this.dom.pause.addEventListener('click', () => this.app.pause());
        this.dom.bar.addEventListener('click', e => { const r = this.dom.bar.getBoundingClientRect(); this.app.seek((e.clientX - r.left)/r.width); });
        this.dom.record.addEventListener('click', () => {
            this.app.toggleRecord();
            this.dom.record.classList.toggle('recording', this.app.recorder.isRecording);
        });
        this.dom.snap.addEventListener('click', () => this.app.snapshot());
        this.dom.hideUi.addEventListener('click', () => document.body.classList.toggle('ui-hidden'));
        this.dom.help.addEventListener('click', () => this.dom.helpOverlay.classList.add('active'));
        this.dom.closeHelp.addEventListener('click', () => this.dom.helpOverlay.classList.remove('active'));
        this.dom.canvasSize.addEventListener('change', e => this.app.setResolution(e.target.value));
        this.dom.visualMode.addEventListener('change', e => this.app.setVisual(e.target.value));
        this.dom.fftSize.addEventListener('change', e => this.app.setFFT(parseInt(e.target.value)));
        
        document.getElementById('volume').addEventListener('input', e => { this.app.audio.setVolume(e.target.value); document.getElementById('vol-val').textContent = e.target.value + '%'; });
        ['particleSize','colorIntensity','bloomStrength'].forEach(id => { document.getElementById(id).addEventListener('input', () => this.app.updateParams()); });
        document.querySelectorAll('.preset-btn').forEach(b => { b.addEventListener('click', () => this.applyPreset(b.dataset.preset)); });

        // Camera Modes
        document.querySelectorAll('.cam-mode-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('.cam-mode-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active'); this.app.viz.camState.mode = b.dataset.mode;
            });
        });
        ['camDistance','camSpeed'].forEach(id => { document.getElementById(id).addEventListener('input', e => {
            const k = id === 'camDistance' ? 'dist' : 'speed'; this.app.viz.camState[k] = parseFloat(e.target.value);
        });});
    }

    setupHotkeys() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            switch(e.key.toLowerCase()) {
                case ' ': e.preventDefault(); this.app.isPlaying ? this.app.pause() : this.app.play(); break;
                case 'h': document.body.classList.toggle('ui-hidden'); break;
                case 'r': this.dom.record.click(); break;
                case 's': this.app.snapshot(); break;
                case 'escape': 
                    document.body.classList.remove('ui-hidden'); 
                    this.dom.helpOverlay.classList.remove('active'); 
                    break;
                case '?': case '/': this.dom.helpOverlay.classList.toggle('active'); break;
            }
        });
    }

    setupDraggables() {
        this.dom.panels.forEach(el => {
            const h = el.querySelector('.panel-header');
            let isD = false, ox, oy;
            h.addEventListener('mousedown', e => { isD=true; ox=e.clientX-el.offsetLeft; oy=e.clientY-el.offsetTop; el.style.transition='none'; });
            window.addEventListener('mousemove', e => { if(!isD) return; el.style.left = (e.clientX-ox)+'px'; el.style.top = (e.clientY-oy)+'px'; });
            window.addEventListener('mouseup', () => { if(isD) el.style.transition=''; isD=false; });
        });
        window.addEventListener('resize', () => this.app.viz.handleResize());
    }

    updateProgress(curr, dur) {
        const pct = dur > 0 ? (curr/dur)*100 : 0; this.dom.progress.style.width = pct + '%';
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
