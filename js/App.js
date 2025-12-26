/* =========================================
   MAIN APP CONTROLLER
   Ties Engines together
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
        
        // Unlock Audio Context on first interaction
        const unlockAudio = () => {
            if (this.audio.context.state === 'suspended') {
                this.audio.context.resume().then(() => {
                    this.debug.log("SYSTEM", "Audio Context Resumed");
                });
            }
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        // Audio Hooks
        this.audio.onLoaded = () => {
            this.ui.dom.loading.classList.remove('active');
            this.ui.dom.playbackControls.style.visibility = 'visible';
            this.ui.dom.clearFileBtn.style.display = 'inline-block';
            
            this.debug.log("AUDIO", "File Loaded Successfully");
            
            // Try to play; if blocked, it will wait for interaction
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
        
        this.debug.log("SYSTEM", `Loading: ${file.name}`);
        this.ui.dom.loading.classList.add('active');
        if(this.isPlaying) this.pause();
        this.audio.load(URL.createObjectURL(file));
    }

    play() { 
        // Ensure context is running
        if (this.audio.context.state === 'suspended') {
            this.audio.context.resume();
        }
        
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
        this.debug.log("AUDIO", `Seek`);
    }
    
    toggleRecord() { 
        if (this.recorder.isRecording) {
            this.recorder.stop();
            this.debug.log("REC", "Stopping...");
            this.debug.setPipelineStatus('EXPORTING');
            setTimeout(() => {
                this.debug.log("REC", "Export Complete");
                this.debug.setPipelineStatus(this.isPlaying ? 'PROCESSING' : 'IDLE');
            }, 1000);
        } else {
            this.recorder.start();
            this.debug.log("REC", "Recording Started");
            this.debug.setPipelineStatus('RECORDING');
        }
    }
    
    snapshot() { 
        this.recorder.snapshot(); 
        this.debug.log("REC", "Snapshot Taken");
    }
    
    setResolution(mode) { 
        this.viz.setResolution(mode); 
        this.debug.log("VIZ", `Res: ${mode}`);
    }
    
    setVisual(mode) { 
        this.viz.switchVisual(mode); 
        this.debug.log("VIZ", `Mode: ${mode}`);
    }
    
    setFFT(size) { 
        this.audio.setFFTSize(size); 
        this.debug.log("AUDIO", `FFT: ${size}`);
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
