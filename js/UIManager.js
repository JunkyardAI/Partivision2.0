/* =========================================
   MODULE: UI MANAGER
   Handles DOM Interactions, Hotkeys, and Help
   FIXED / HARDENED VERSION
   ========================================= */

class UIManager {
    constructor(app) {
        this.app = app;

        /* ---------- DOM CACHE (NULL-SAFE) ---------- */
        this.dom = {
            file: document.getElementById('audioFile'),
            play: document.getElementById('playBtn'),
            pause: document.getElementById('pauseBtn'),
            record: document.getElementById('recordBtn'),
            snap: document.getElementById('snapshotBtn'),
            hideUi: document.getElementById('hideUiBtn'),
            help: document.getElementById('helpBtn'),
            helpOverlay: document.getElementById('help-overlay'),
            closeHelp: document.getElementById('closeHelpBtn'),
            canvasSize: document.getElementById('canvasSize'),
            visualMode: document.getElementById('visualMode'),
            fftSize: document.getElementById('fftSize'),
            time: document.getElementById('timeDisplay'),
            progress: document.getElementById('progressFill'),
            bar: document.getElementById('progressBar'),
            loading: document.getElementById('loading-overlay'),
            drop: document.getElementById('drop-overlay'),
            panels: document.querySelectorAll('.settings-panel'),
            playbackControls: document.getElementById('playback-controls'),
            clearFileBtn: document.getElementById('clearFileBtn'),
        };

        this.bindEvents();
        this.setupHotkeys();
        this.setupDraggables();
    }

    /* =========================================
       EVENTS
       ========================================= */
    bindEvents() {
        const d = this.dom;

        d.file?.addEventListener('change', e => {
            const file = e.target.files?.[0];
            if (file) this.app.load(file);
        });

        d.play?.addEventListener('click', () => this.app.play());
        d.pause?.addEventListener('click', () => this.app.pause());

        d.bar?.addEventListener('click', e => {
            const r = d.bar.getBoundingClientRect();
            const pct = (e.clientX - r.left) / r.width;
            this.app.seek(Math.min(Math.max(pct, 0), 1));
        });

        d.record?.addEventListener('click', () => {
            this.app.toggleRecord?.();
            if (this.app.recorder) {
                d.record.classList.toggle('recording', this.app.recorder.isRecording);
            }
        });

        d.snap?.addEventListener('click', () => this.app.snapshot?.());
        d.hideUi?.addEventListener('click', () => document.body.classList.toggle('ui-hidden'));

        d.help?.addEventListener('click', () => d.helpOverlay?.classList.add('active'));
        d.closeHelp?.addEventListener('click', () => d.helpOverlay?.classList.remove('active'));

        d.canvasSize?.addEventListener('change', e => this.app.setResolution?.(e.target.value));
        d.visualMode?.addEventListener('change', e => this.app.setVisual?.(e.target.value));
        d.fftSize?.addEventListener('change', e => this.app.setFFT?.(Number(e.target.value)));

        /* ---------- SETTINGS ---------- */
        const vol = document.getElementById('volume');
        vol?.addEventListener('input', e => {
            this.app.audio?.setVolume?.(Number(e.target.value));
            const label = document.getElementById('vol-val');
            if (label) label.textContent = `${e.target.value}%`;
        });

        ['particleSize', 'colorIntensity', 'bloomStrength'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.app.updateParams?.());
        });

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
        });

        /* ---------- CAMERA ---------- */
        document.querySelectorAll('.cam-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cam-mode-btn').forEach(x => x.classList.remove('active'));
                btn.classList.add('active');
                if (this.app.viz?.camState) this.app.viz.camState.mode = btn.dataset.mode;
            });
        });

        ['camDistance', 'camSpeed'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', e => {
                if (!this.app.viz?.camState) return;
                const key = id === 'camDistance' ? 'dist' : 'speed';
                this.app.viz.camState[key] = Number(e.target.value);
            });
        });

        document.getElementById('camFOV')?.addEventListener('input', e => {
            const cam = this.app.viz?.camera;
            if (!cam) return;
            cam.fov = Number(e.target.value);
            cam.updateProjectionMatrix();
        });

        window.addEventListener('resize', () => this.app.viz?.handleResize?.());
    }

    /* =========================================
       HOTKEYS
       ========================================= */
    setupHotkeys() {
        window.addEventListener('keydown', e => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.app.isPlaying ? this.app.pause() : this.app.play();
                    break;
                case 'h':
                    document.body.classList.toggle('ui-hidden');
                    break;
                case 'd':
                case '`': {
                    const dbg = this.app.debug?.dom?.container;
                    if (dbg) dbg.style.display = dbg.style.display === 'none' ? 'flex' : 'none';
                    break;
                }
                case 'r':
                    this.dom.record?.click();
                    break;
                case 's':
                    this.app.snapshot?.();
                    break;
                case 'escape': {
                    document.body.classList.remove('ui-hidden');
                    this.dom.helpOverlay?.classList.remove('active');
                    const dbg = this.app.debug?.dom?.container;
                    if (dbg) dbg.style.display = 'flex';
                    break;
                }
                case '/':
                case '?':
                    this.dom.helpOverlay?.classList.toggle('active');
                    break;
            }
        });
    }

    /* =========================================
       DRAGGABLE PANELS
       ========================================= */
    setupDraggables() {
        const makeDrag = panel => {
            const header = panel.querySelector('.panel-header');
            if (!header) return;

            let dragging = false;
            let ox = 0, oy = 0;

            header.addEventListener('mousedown', e => {
                dragging = true;
                ox = e.clientX - panel.offsetLeft;
                oy = e.clientY - panel.offsetTop;
                panel.style.transition = 'none';
            });

            window.addEventListener('mousemove', e => {
                if (!dragging) return;
                panel.style.left = `${e.clientX - ox}px`;
                panel.style.top = `${e.clientY - oy}px`;
            });

            window.addEventListener('mouseup', () => {
                if (!dragging) return;
                dragging = false;
                panel.style.transition = '';
            });
        };

        this.dom.panels.forEach(makeDrag);
    }

    /* =========================================
       UI UPDATES
       ========================================= */
    updateProgress(curr = 0, dur = 0) {
        if (!this.dom.progress || !this.dom.time) return;

        const pct = dur > 0 ? (curr / dur) * 100 : 0;
        this.dom.progress.style.width = `${pct}%`;

        const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
        this.dom.time.textContent = `${fmt(curr)} / ${fmt(dur)}`;
    }

    /* =========================================
       PRESETS
       ========================================= */
    applyPreset(name) {
        const presets = {
            subtle: { p: 0.5, c: 0.8, b: 0.3 },
            intense: { p: 2, c: 1.5, b: 1.2 },
            club: { p: 1.5, c: 1.2, b: 0.8 },
            minimal: { p: 0.8, c: 0.5, b: 0.1 }
        };

        const preset = presets[name];
        if (!preset) return;

        document.getElementById('particleSize').value = preset.p;
        document.getElementById('colorIntensity').value = preset.c;
        document.getElementById('bloomStrength').value = preset.b;

        this.app.updateParams?.();
    }
}
