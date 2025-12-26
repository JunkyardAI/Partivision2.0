/* =========================================
   MODULE: RECORDER ENGINE
   Handles MediaRecorder for video and Canvas->DataURL for images
   ========================================= */
class RecorderEngine {
    constructor(audioEngine, visualizerEngine) {
        this.audio = audioEngine;
        this.viz = visualizerEngine;
        this.recorder = null;
        this.chunks = [];
        this.isRecording = false;
    }

    start() {
        if (!this.audio.context) return alert("Load audio first.");
        
        // Capture at 60 FPS
        const canvasStream = this.viz.getCanvas().captureStream(60);
        const audioStream = this.audio.getAudioStream();
        
        // Combine video and audio
        const combined = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
        ]);

        // Try to use the highest quality codec available
        const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
        ];
        const mime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
        
        // Ultra-High Bitrate for "Pristine" Quality (25 Mbps)
        const options = { 
            mimeType: mime, 
            videoBitsPerSecond: 25000000 
        };
        
        try {
            this.recorder = new MediaRecorder(combined, options);
        } catch (e) {
            console.warn("High bitrate failed, falling back to default.", e);
            this.recorder = new MediaRecorder(combined);
        }

        this.chunks = [];
        this.recorder.ondataavailable = e => { if(e.data.size > 0) this.chunks.push(e.data); };
        this.recorder.onstop = () => this.save();
        this.recorder.start();
        this.isRecording = true;
    }

    stop() {
        if (this.recorder && this.recorder.state !== 'inactive') {
            this.recorder.stop();
        }
        this.isRecording = false;
    }

    save() {
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
        const url = URL.createObjectURL(blob);
        
        // Filename with timestamp for organization
        const date = new Date();
        const timestamp = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}`;
        
        this.download(url, `PARTIVISION_${timestamp}.webm`);
        
        // Cleanup to free memory
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    snapshot() {
        // Force a render call to ensure the frame is fresh
        this.viz.render ? this.viz.render() : null; 
        
        try {
            // Use highest quality PNG
            const data = this.viz.getCanvas().toDataURL("image/png", 1.0);
            const date = new Date();
            const timestamp = `${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
            this.download(data, `PARTIVISION_SNAP_${timestamp}.png`);
        } catch(e) { console.error(e); }
    }

    download(url, filename) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
