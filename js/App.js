/* =========================================
   MAIN APP CONTROLLER
   Ties Engines together
   ========================================= */
class App {
    constructor() {
        this.audio = new AudioEngine();
        this.viz = new VisualizerEngine('stage-container');
        this.recorder = new RecorderEngine(this.audio, this.viz);
        this.ui = new UIManager(this);
        
        this.isPlaying = false;
        this.params = { size: 1, color: 1, bloom: 0.5 };
        
        // Audio Hooks
        this.audio.onLoaded = () => {
            this.ui.dom.loading.classList.remove('active');
            // Reveal controls
            this.ui.dom.playbackControls.style.visibility = 'visible';
            this.ui.dom.clearFileBtn.style.display = 'inline-block';
            // Start Playing
            this.play();
        };
        this.audio.onTimeUpdate = () => this.ui.updateProgress(this.audio.getCurrentTime(), this.audio.getDuration());
        this.audio.onEnded = () => { 
            this.isPlaying = false; 
            this.ui.dom.play.disabled = false; 
            this.ui.dom.pause.disabled = true; 
        };
        
        this.viz.init();
        this.loop();
    }

    load(file) {
        if(!file || (!file.type.startsWith('audio/') && !file.type.startsWith('video/'))) return;
        this.ui.dom.loading.classList.add('active');
        if(this.isPlaying) this.pause();
        this.audio.load(URL.createObjectURL(file));
    }

    play() { 
        this.audio.play(); 
        this.isPlaying = true; 
        this.ui.dom.play.disabled = true; 
        this.ui.dom.pause.disabled = false; 
    }

    pause() { 
        this.audio.pause(); 
        this.isPlaying = false; 
        this.ui.dom.play.disabled = false; 
        this.ui.dom.pause.disabled = true; 
    }

    seek(pct) { this.audio.seek(pct); }
    
    toggleRecord() { this.recorder.isRecording ? this.recorder.stop() : this.recorder.start(); }
    snapshot() { this.recorder.snapshot(); }
    
    setResolution(mode) { this.viz.setResolution(mode); }
    setVisual(mode) { this.viz.switchVisual(mode); }
    setFFT(size) { this.audio.setFFTSize(size); }
    
    updateParams() {
        this.params.size = parseFloat(document.getElementById('particleSize').value);
        this.params.color = parseFloat(document.getElementById('colorIntensity').value);
        this.params.bloom = parseFloat(document.getElementById('bloomStrength').value);
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        
        // Only send data if we are actively playing.
        // If not playing, we send 'null', which VisualizerEngine uses to hide the visuals.
        if(this.isPlaying) {
            const data = this.audio.getFrequencyData();
            this.viz.update(data, this.params);
        } else {
            this.viz.update(null, this.params); 
        }
    }
}

// --- Boot ---
window.onload = () => { window.app = new App(); };
