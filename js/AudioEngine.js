/* =========================================
   MODULE: AUDIO ENGINE
   Handles AudioContext, Analyser, and Media Loading
   ========================================= */
class AudioEngine {
    constructor() {
        this.context = null;
        this.analyser = null;
        this.source = null;
        this.audioElement = null;
        this.recordingDest = null;
        this.frequencyData = null;
        this.fftSize = 2048;
        
        // Event hooks
        this.onTimeUpdate = null;
        this.onEnded = null;
        this.onError = null;
        this.onLoaded = null;
    }

    init() {
        if (this.context) return;
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = 0.8;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.recordingDest = this.context.createMediaStreamDestination();
    }

    load(blobUrl) {
        this.init();
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }

        this.audioElement = new Audio(blobUrl);
        this.audioElement.crossOrigin = "anonymous";
        
        if (this.source) this.source.disconnect();
        this.source = this.context.createMediaElementSource(this.audioElement);
        
        // Routing: Source -> Analyser -> Speakers -> Recording Destination
        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
        this.source.connect(this.recordingDest);

        this.audioElement.addEventListener('loadedmetadata', () => {
            if (this.onLoaded) this.onLoaded();
        });
        this.audioElement.addEventListener('timeupdate', () => { if(this.onTimeUpdate) this.onTimeUpdate(); });
        this.audioElement.addEventListener('ended', () => { if(this.onEnded) this.onEnded(); });
        this.audioElement.addEventListener('error', (e) => { if(this.onError) this.onError(e); });
    }

    play() {
        if (!this.audioElement) return;
        if (this.context.state === 'suspended') this.context.resume();
        this.audioElement.play().catch(e => console.error(e));
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
        this.fftSize = size;
        if (this.analyser) {
            this.analyser.fftSize = size;
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        }
    }

    getFrequencyData() {
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.frequencyData);
        }
        return this.frequencyData;
    }

    getDuration() { return this.audioElement ? this.audioElement.duration : 0; }
    getCurrentTime() { return this.audioElement ? this.audioElement.currentTime : 0; }
    getAudioStream() { return this.recordingDest ? this.recordingDest.stream : null; }
    
    clear() {
        this.pause();
        if (this.source) this.source.disconnect();
        this.audioElement = null;
    }
}
