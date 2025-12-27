/* =========================================
   MAIN APP CONTROLLER 2.2 PRO (FIXED)
   ========================================= */
class App {
    constructor() {
        this.audio = new AudioEngine();
        this.viz = new VisualizerEngine('stage-container');
        this.recorder = new RecorderEngine(this.audio, this.viz);
        this.ui = new UIManager(this);
        
        this.isPlaying = false;
        this.params = { size: 1, color: 1, bloom: 0.8, fps: 60, bitcrush: 1 };
        
        this.macros = {
            sizeLFO: { active: false, speed: 2.0 },
            autoOrbit: { active: false, speed: 1.0 },
            warpDrive: { active: false, intensity: 0 }
        };

        this.lastFrameTime = 0;
        this.viz.init();
        
        // Initial sync
        this.viz.setBitcrush(this.params.bitcrush);
        
        this.loop();
    }

    load(file) {
        if (!file) return;
        this.audio.load(URL.createObjectURL(file));
        // Reset playback state on UI
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.disabled = false;
    }

    runMacros() {
        const t = Date.now() * 0.001;
        if (this.macros.sizeLFO.active) {
            this.params.size = 1 + Math.sin(t * this.macros.sizeLFO.speed) * 2;
        }
        if (this.macros.autoOrbit.active) {
            this.viz.camState.theta += 0.01 * this.macros.autoOrbit.speed;
        }
    }

    loop() {
        const now = Date.now();
        const interval = 1000 / this.params.fps;
        
        if (now - this.lastFrameTime >= interval) {
            this.lastFrameTime = now;
            this.runMacros();
            const data = this.isPlaying ? this.audio.getFrequencyData() : null;
            this.viz.update(data, this.params);
            this.ui.updateTelemetry(this.audio.getCurrentTime(), this.audio.getDuration());
        }
        requestAnimationFrame(() => this.loop());
    }
}

window.onload = () => { window.app = new App(); };
