/* =========================================
   UI MANAGER PRO
   Handles Command Center bindings and Telemetry
   ========================================= */
class UIManager {
    constructor(app) {
        this.app = app;
        this.logs = document.getElementById('console-logs');
        this.bindEvents();
    }

    log(source, message) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> <span class="log-source">${source}:</span> ${message}`;
        this.logs.appendChild(div);
        this.logs.scrollTop = this.logs.scrollHeight;
        
        // Trim logs if too many
        if (this.logs.children.length > 50) this.logs.removeChild(this.logs.firstChild);
    }

    bindEvents() {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');

        playBtn.onclick = () => { 
            this.app.isPlaying = true; 
            this.app.audio.play(); 
            playBtn.disabled = true;
            pauseBtn.disabled = false;
            this.log("TRANSPORT", "Playback Initialized");
        };
        pauseBtn.onclick = () => { 
            this.app.isPlaying = false; 
            this.app.audio.pause(); 
            playBtn.disabled = false;
            pauseBtn.disabled = true;
            this.log("TRANSPORT", "Playback Suspended");
        };
        
        // Pipeline Controls
        document.getElementById('visualMode').onchange = (e) => this.app.viz.switchVisual(e.target.value);
        document.getElementById('particleSize').oninput = (e) => this.app.params.size = parseFloat(e.target.value);
        document.getElementById('colorIntensity').oninput = (e) => this.app.params.color = parseFloat(e.target.value);
        document.getElementById('bloomStrength').oninput = (e) => this.app.params.bloom = parseFloat(e.target.value);
        
        // Performance Tuning
        document.getElementById('targetFPS').onchange = (e) => this.app.params.fps = parseInt(e.target.value);
        document.getElementById('bitcrush').oninput = (e) => this.app.viz.setBitcrush(parseInt(e.target.value));
        document.getElementById('fftSize').onchange = (e) => this.app.audio.setFFTSize(parseInt(e.target.value));

        // Macro Bindings
        document.querySelectorAll('.macro-btn').forEach(btn => {
            btn.onclick = () => {
                const m = btn.dataset.macro;
                this.app.macros[m].active = !this.app.macros[m].active;
                btn.classList.toggle('active', this.app.macros[m].active);
                this.log("DAEMON", `${m} logic ${this.app.macros[m].active ? 'ACTIVE' : 'IDLE'}`);
            };
        });

        // Transitions
        document.querySelectorAll('.trans-btn').forEach(btn => {
            btn.onclick = () => this.app.queueTransition(btn.dataset.mode, 5);
        });

        // UI Global Keys
        window.onkeydown = (e) => {
            if (e.key.toLowerCase() === 'h') document.body.classList.toggle('ui-hidden');
            if (e.key === ' ') { 
                e.preventDefault(); 
                this.app.isPlaying ? pauseBtn.click() : playBtn.click(); 
            }
        };

        // File drop
        window.addEventListener('dragover', (e) => { e.preventDefault(); document.getElementById('drop-overlay').classList.add('active'); });
        window.addEventListener('drop', (e) => {
            e.preventDefault();
            document.getElementById('drop-overlay').classList.remove('active');
            if(e.dataTransfer.files.length) this.app.load(e.dataTransfer.files[0]);
        });
    }

    updateTelemetry(curr, dur) {
        const pct = dur > 0 ? (curr/dur) * 100 : 0;
        const fill = document.getElementById('progressFill');
        if (fill) fill.style.width = pct + '%';
        const display = document.getElementById('timeDisplay');
        const fmt = s => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
        if (display) display.textContent = `${fmt(curr)} / ${fmt(dur)}`;
        
        // Dynamic Status
        const status = document.getElementById('buffer-display');
        if (status && this.app.isPlaying) {
            status.textContent = `STATUS: ACTIVE [${Math.round(pct)}%]`;
        }
    }
}
