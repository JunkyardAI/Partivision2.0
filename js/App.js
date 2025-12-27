/* =========================================
   MAIN APP CONTROLLER 2.2 PRO
   ========================================= */
class App {
    constructor() {
        this.audio = new AudioEngine();
        this.viz = new VisualizerEngine('stage-container');
        this.recorder = new RecorderEngine(this.audio, this.viz);
        this.ui = new UIManager(this);
        
        this.isPlaying = false;
        this.params = { size: 1, color: 1, bloom: 0.8, fps: 60, bitcrush: 1 };
        
        // Automation Engine (Macros)
        this.macros = {
            sizeLFO: { active: false, speed: 2.0 },
            autoOrbit: { active: false, speed: 1.0 },
            warpDrive: { active: false, intensity: 0 }
        };

        this.lastFrameTime = 0;
        this.viz.init();
        
        // Sync bitcrush and fps on load
        this.viz.setBitcrush(this.params.bitcrush);
        
        this.loop();
    }

    load(file) {
        if (!file) return;
        this.audio.load(URL.createObjectURL(file));
        this.ui.log("DAEMON", `Ingesting Data Stream: ${file.name}`);
    }

    queueTransition(mode, delay) {
        this.ui.log("PIPELINE", `Queueing ${mode} transition in ${delay}s...`);
        setTimeout(() => {
            this.setVisual(mode);
            this.ui.log("DAEMON", `Successfully Transitioned to ${mode}`);
        }, delay * 1000);
    }

    setVisual(mode) {
        this.viz.switchVisual(mode);
        const select = document.getElementById('visualMode');
        if (select) select.value = mode;
    }

    runMacros() {
        const t = Date.now() * 0.001;
        if (this.macros.sizeLFO.active) {
            this.params.size = 1 + Math.sin(t * this.macros.sizeLFO.speed) * 2;
            const slider = document.getElementById('particleSize');
            if (slider) slider.value = this.params.size;
        }
        if (this.macros.autoOrbit.active) {
            this.viz.camState.theta += 0.01 * this.macros.autoOrbit.speed;
        }
        if (this.macros.warpDrive.active) {
            this.viz.camState.dist = 60 + Math.sin(t * 4) * 30;
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
