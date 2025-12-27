/* =========================================
   MAIN APP CONTROLLER
   ========================================= */
class App {
    constructor() {
        this.debug = new DebugEngine();
        this.audio = new AudioEngine();
        this.viz = new VisualizerEngine('stage-container');
        this.recorder = new RecorderEngine(this.audio, this.viz);
        this.ui = new UIManager(this);
        
        this.isPlaying = false;
        this.params = { size: 1, color: 1, bloom: 0.5 };
        
        // Safety: Resume audio context on first user click
        const unlock = () => {
            if (this.audio.context.state === 'suspended') this.audio.context.resume();
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);

        this.audio.onLoaded = () => {
            this.ui.dom.loading.classList.remove('active');
            this.ui.dom.playbackControls.style.visibility = 'visible';
            this.ui.dom.clearFileBtn.style.display = 'inline-block';
            this.debug.log("AUDIO", "Ready");
            this.play();
        };
        
        this.audio.onEnded = () => { 
            this.isPlaying = false; 
            this.ui.dom.play.disabled = false; this.ui.dom.pause.disabled = true;
            this.debug.setPipelineStatus('IDLE');
        };
        
        this.audio.onTimeUpdate = () => this.ui.updateProgress(this.audio.getCurrentTime(), this.audio.getDuration());

        this.viz.init();
        this.loop();
    }

    load(file) {
        this.debug.log("SYSTEM", `Loading: ${file.name}`);
        this.ui.dom.loading.classList.add('active');
        if(this.isPlaying) this.pause();
        this.audio.load(URL.createObjectURL(file));
    }

    play() { 
        this.audio.play(); this.isPlaying = true; 
        this.ui.dom.play.disabled = true; this.ui.dom.pause.disabled = false; 
        this.debug.setPipelineStatus('PROCESSING');
    }

    pause() { 
        this.audio.pause(); this.isPlaying = false; 
        this.ui.dom.play.disabled = false; this.ui.dom.pause.disabled = true; 
        this.debug.setPipelineStatus('IDLE');
    }

    seek(pct) { this.audio.seek(pct); }
    
    toggleRecord() { 
        if (this.recorder.isRecording) {
            this.recorder.stop();
            this.debug.setPipelineStatus('EXPORTING');
            setTimeout(() => this.debug.setPipelineStatus(this.isPlaying ? 'PROCESSING' : 'IDLE'), 1000);
        } else {
            this.recorder.start();
            this.debug.setPipelineStatus('RECORDING');
        }
    }
    
    snapshot() { this.recorder.snapshot(); this.debug.log("REC", "Snapshot Taken"); }
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
        if(this.isPlaying) {
            this.viz.update(this.audio.getFrequencyData(), this.params);
        } else {
            this.viz.update(null, this.params); 
        }
    }
}

window.onload = () => { window.app = new App(); };
