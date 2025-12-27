/* =========================================
   MAIN APP CONTROLLER 2.2
   Handles Automation, Transitions, and UI Binding
   ========================================= */
class App {
    constructor() {
        this.debug = new DebugEngine();
        this.audio = new AudioEngine();
        this.viz = new VisualizerEngine('stage-container');
        this.recorder = new RecorderEngine(this.audio, this.viz);
        this.ui = new UIManager(this);
        
        this.isPlaying = false;
        this.params = { size: 1, color: 1, bloom: 0.5, fps: 60, bitcrush: 1 };
        
        // Transition System
        this.transitionQueue = [];
        this.isTransitioning = false;

        // Automation Macros
        this.macros = {
            sizePulse: { active: false, speed: 1.0, amplitude: 1.0 },
            colorShift: { active: false, speed: 0.5 },
            camOrbit: { active: false, speed: 0.5 }
        };
        
        this.viz.init();
        this.loop();
    }

    queueTransition(mode, delaySeconds) {
        this.transitionQueue.push({ mode, time: Date.now() + (delaySeconds * 1000) });
        this.debug.log("SYSTEM", `Queued ${mode} in ${delaySeconds}s`);
    }

    processTransitions() {
        if (this.transitionQueue.length > 0) {
            const next = this.transitionQueue[0];
            if (Date.now() >= next.time) {
                this.setVisual(next.mode);
                this.transitionQueue.shift();
            }
        }
    }

    runMacros() {
        const t = Date.now() * 0.001;
        if (this.macros.sizePulse.active) {
            this.params.size = 1 + Math.sin(t * this.macros.sizePulse.speed) * this.macros.sizePulse.amplitude;
            document.getElementById('particleSize').value = this.params.size;
        }
        if (this.macros.camOrbit.active) {
            this.viz.camState.theta += 0.01 * this.macros.camOrbit.speed;
        }
    }

    setVisual(mode) {
        this.viz.switchVisual(mode);
        document.getElementById('visualMode').value = mode;
        this.debug.log("VIZ", `Switched to ${mode}`);
    }

    load(file) {
        this.debug.log("SYSTEM", `Loading: ${file.name}`);
        this.audio.load(URL.createObjectURL(file));
    }

    play() { this.audio.play(); this.isPlaying = true; }
    pause() { this.audio.pause(); this.isPlaying = false; }

    loop() {
        // Capped FPS Logic
        const interval = 1000 / this.params.fps;
        const now = Date.now();
        if (!this.lastFrameTime) this.lastFrameTime = now;
        
        const delta = now - this.lastFrameTime;

        if (delta >= interval) {
            this.lastFrameTime = now - (delta % interval);
            
            this.runMacros();
            this.processTransitions();

            const data = this.isPlaying ? this.audio.getFrequencyData() : null;
            this.viz.update(data, this.params);
            
            if (this.ui) this.ui.updateStatus();
        }
        
        requestAnimationFrame(() => this.loop());
    }
}

window.onload = () => { window.app = new App(); };
