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
        
        const canvasStream = this.viz.getCanvas().captureStream(60);
        const audioStream = this.audio.getAudioStream();
        const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);

        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        
        this.recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 15000000 }); // 15Mbps
        this.chunks = [];
        this.recorder.ondataavailable = e => { if(e.data.size>0) this.chunks.push(e.data); };
        this.recorder.onstop = () => this.save();
        this.recorder.start();
        this.isRecording = true;
    }

    stop() {
        if (this.recorder) this.recorder.stop();
        this.isRecording = false;
    }

    save() {
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
        const url = URL.createObjectURL(blob);
        this.download(url, `PARTIVISION_REC_${Date.now()}.webm`);
        URL.revokeObjectURL(url);
    }

    snapshot() {
        this.viz.render ? this.viz.render() : null; // Ensure fresh frame if paused
        try {
            const data = this.viz.getCanvas().toDataURL("image/png");
            this.download(data, `PARTIVISION_SNAP_${Date.now()}.png`);
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