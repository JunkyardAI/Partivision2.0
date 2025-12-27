/* =========================================
   MODULE: AUDIO ENGINE
   Handles AudioContext, Analyser, and Media Loading
   ========================================= */
class AudioEngine {
    constructor() {
        // Initialize Context immediately to prevent startup null crashes
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 2048;
        // Smoothing constant: 0.85 for fluid but reactive flow
        this.analyser.smoothingTimeConstant = 0.85; 
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.recordingDest = this.context.createMediaStreamDestination();
        
        this.source = null;
        this.audioElement = null;
        
        // Event hooks
        this.onTimeUpdate = null;
        this.onEnded = null;
        this.onError = null;
        this.onLoaded = null;
    }

    load(blobUrl) {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement.load();
        }

        this.audioElement = new Audio(blobUrl);
        this.audioElement.crossOrigin = "anonymous";
        
        if (this.source) {
            try { this.source.disconnect(); } catch(e) {}
        }
        
        this.source = this.context.createMediaElementSource(this.audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
        this.source.connect(this.recordingDest);

        this.audioElement.addEventListener('canplaythrough', () => {
            if (this.onLoaded) this.onLoaded();
        }, { once: true });

        this.audioElement.addEventListener('timeupdate', () => { if(this.onTimeUpdate) this.onTimeUpdate(); });
        this.audioElement.addEventListener('ended', () => { if(this.onEnded) this.onEnded(); });
        this.audioElement.addEventListener('error', (e) => { 
            console.error("Audio Error", e);
            if(this.onError) this.onError(e); 
        });
    }

    play() {
        if (!this.audioElement) return;
        if (this.context.state === 'suspended') this.context.resume();
        
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.warn("Autoplay blocked", error));
        }
    }

    pause() {
        if (this.audioElement) this.audioElement.pause();
    }

    seek(percent) {
        if (this.audioElement && this.audioElement.duration) {
            this.audioElement.currentTime = percent * this.audioElement.duration;
        }
    }

    setVolume(percent) {
        if (this.audioElement) this.audioElement.volume = percent / 100;
    }

    setFFTSize(size) {
        this.analyser.fftSize = size;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    getFrequencyData() {
        if (this.analyser) this.analyser.getByteFrequencyData(this.frequencyData);
        return this.frequencyData;
    }

    getDuration() { return this.audioElement ? this.audioElement.duration : 0; }
    getCurrentTime() { return this.audioElement ? this.audioElement.currentTime : 0; }
    getAudioStream() { return this.recordingDest ? this.recordingDest.stream : null; }
}
