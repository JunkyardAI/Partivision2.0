/* =========================================
   UI MANAGER PRO
   ========================================= */
class UIManager {
    constructor(app) {
        this.app = app;
        this.logs = document.getElementById('console-logs');
        this.bindEvents();
    }

    log(source, message) {
        const div = document.createElement('div');
        div.innerHTML = `<span style="color:#444">[${new Date().toLocaleTimeString()}]</span> <span style="color:var(--neon)">${source}:</span> ${message}`;
        this.logs.appendChild(div);
        this.logs.scrollTop = this.logs.scrollHeight;
    }

    bindEvents() {
        // Transport
        document.getElementById('playBtn').onclick = () => { this.app.isPlaying = true; this.app.audio.play(); };
        document.getElementById('pauseBtn').onclick = () => { this.app.isPlaying = false; this.app.audio.pause(); };
        
        // Parameters
        document.getElementById('visualMode').onchange = (e) => this.app.viz.switchVisual(e.target.value);
        document.getElementById('particleSize').oninput = (e) => this.app.params.size = parseFloat(e.target.value);
        document.getElementById('colorIntensity').oninput = (e) => this.app.params.color = parseFloat(e.target.value);
        document.getElementById('bloomStrength').oninput = (e) => this.app.params.bloom = parseFloat(e.target.value);
        
        // Performance
        document.getElementById('targetFPS').onchange = (e) => this.app.params.fps = parseInt(e.target.value);
        document.getElementById('bitcrush').oninput = (e) => this.app.viz.setBitcrush(parseInt(e.target.value));
        document.getElementById('fftSize').onchange = (e) => this.app.audio.setFFTSize(parseInt(e.target.value));

        // Macros
        document.querySelectorAll('.macro-btn').forEach(btn => {
            btn.onclick = () => {
                const m = btn.dataset.macro;
                this.app.macros[m].active = !this.app.macros[m].active;
                btn.classList.toggle('active', this.app.macros[m].active);
                this.log("MACRO", `${m} is now ${this.app.macros[m].active ? 'ACTIVE' : 'IDLE'}`);
            };
        });

        // Transitions
        document.querySelectorAll('.trans-btn').forEach(btn => {
            btn.onclick = () => this.app.queueTransition(btn.dataset.mode, 5);
        });

        // File drop
        window.addEventListener('dragover', (e) => { e.preventDefault(); document.getElementById('drop-overlay').classList.add('active'); });
        window.addEventListener('drop', (e) => {
            e.preventDefault();
            document.getElementById('drop-overlay').classList.remove('active');
            if(e.dataTransfer.files.length) this.app.load(e.dataTransfer.files[0]);
        });
        
        // Global Hotkeys
        window.onkeydown = (e) => {
            if (e.key.toLowerCase() === 'h') document.body.classList.toggle('ui-hidden');
            if (e.key.toLowerCase() === 'r') document.getElementById('recordBtn').click();
            if (e.key.toLowerCase() === 's') document.getElementById('snapshotBtn').click();
        };
    }

    updateProgress(curr, dur) {
        const pct = (curr/dur) * 100;
        document.getElementById('progressFill').style.width = pct + '%';
        const fmt = s => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
        document.getElementById('timeDisplay').textContent = `${fmt(curr)} / ${fmt(dur)}`;
    }
}
