/* =========================================
   MAIN APP CONTROLLER
   Ties Engines together
   ========================================= */
class App {
    constructor() {
        // Initialize Debug Engine First
        this.debug = new DebugEngine();
        
        this.audio = new AudioEngine();
        this.viz = new VisualizerEngine('stage-container');
        this.recorder = new RecorderEngine(this.audio, this.viz);
        this.ui = new UIManager(this);
        
        this.isPlaying = false;
        this.params = { size: 1, color: 1, bloom: 0.5 };
        
        // Audio Hooks
        this.audio.onLoaded = () => {
            this.ui.dom.loading.classList.remove('active');
            this.ui.dom.playbackControls.style.visibility = 'visible';
            this.ui.dom.clearFileBtn.style.display = 'inline-block';
            
            this.debug.log("AUDIO", "File Loaded Successfully");
            this.debug.log("AUDIO", `Duration: ${this.audio.getDuration().toFixed(2)}s`);
            
            this.play();
        };
        
        this.audio.onError = (e) => {
            this.debug.log("ERROR", `Audio Error: ${e.message || e}`);
        };

        this.audio.onTimeUpdate = () => this.ui.updateProgress(this.audio.getCurrentTime(), this.audio.getDuration());
        
        this.audio.onEnded = () => { 
            this.isPlaying = false; 
            this.ui.dom.play.disabled = false; 
            this.ui.dom.pause.disabled = true; 
            this.debug.log("AUDIO", "Playback Ended");
            this.debug.setPipelineStatus('IDLE');
        };
        
        this.viz.init();
        this.debug.log("VIZ", "Render Engine Initialized (WebGL)");
        this.loop();
    }

    load(file) {
        if(!file || (!file.type.startsWith('audio/') && !file.type.startsWith('video/'))) {
            this.debug.log("ERROR", "Invalid File Type");
            return;
        }
        
        this.debug.log("SYSTEM", `Loading: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`);
        this.ui.dom.loading.classList.add('active');
        if(this.isPlaying) this.pause();
        this.audio.load(URL.createObjectURL(file));
    }

    play() { 
        this.audio.play(); 
        this.isPlaying = true; 
        this.ui.dom.play.disabled = true; 
        this.ui.dom.pause.disabled = false; 
        this.debug.log("AUDIO", "Playback Started");
        this.debug.setPipelineStatus('PROCESSING');
    }

    pause() { 
        this.audio.pause(); 
        this.isPlaying = false; 
        this.ui.dom.play.disabled = false; 
        this.ui.dom.pause.disabled = true; 
        this.debug.log("AUDIO", "Playback Paused");
        this.debug.setPipelineStatus('IDLE');
    }

    seek(pct) { 
        this.audio.seek(pct); 
        this.debug.log("AUDIO", `Seek to ${Math.round(pct*100)}%`);
    }
    
    toggleRecord() { 
        if (this.recorder.isRecording) {
            this.recorder.stop();
            this.debug.log("REC", "Recording Stopped. Starting Export...");
            this.debug.setPipelineStatus('EXPORTING');
            
            // Simulate export time
            setTimeout(() => {
                this.debug.log("REC", "Export Complete. Downloading...");
                this.debug.setPipelineStatus(this.isPlaying ? 'PROCESSING' : 'IDLE');
            }, 1000);
        } else {
            this.recorder.start();
            this.debug.log("REC", "Recording Started (15 Mbps)");
            this.debug.setPipelineStatus('RECORDING');
        }
    }
    
    snapshot() { 
        this.recorder.snapshot(); 
        this.debug.log("REC", "Snapshot Captured (PNG)");
    }
    
    setResolution(mode) { 
        this.viz.setResolution(mode); 
        this.debug.log("VIZ", `Resolution Set: ${mode}`);
    }
    
    setVisual(mode) { 
        this.viz.switchVisual(mode); 
        this.debug.log("VIZ", `Visual Model Switched: ${mode}`);
    }
    
    setFFT(size) { 
        this.audio.setFFTSize(size); 
        this.debug.log("AUDIO", `FFT Size Updated: ${size}`);
    }
    
    updateParams() {
        this.params.size = parseFloat(document.getElementById('particleSize').value);
        this.params.color = parseFloat(document.getElementById('colorIntensity').value);
        this.params.bloom = parseFloat(document.getElementById('bloomStrength').value);
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        
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
