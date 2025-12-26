/* =========================================
   MODULE: DEBUG ENGINE & PIPELINE DAEMON
   Handles logging, system status, and console UI
   ========================================= */
class DebugEngine {
    constructor() {
        this.logs = [];
        this.maxLogs = 50;
        this.isOpen = false;
        this.pipelineStatus = 'IDLE'; // IDLE, PROCESSING, RECORDING, EXPORTING
        this.daemonInterval = null;
        
        this.dom = this.createConsoleUI();
        this.bindEvents();
        this.startDaemon();
        this.log("SYSTEM", "Partivision Core Initialized v2.1");
        this.log("DAEMON", "Background Pipeline Service Started [PID: 4096]");
    }

    createConsoleUI() {
        // Create container
        const container = document.createElement('div');
        container.id = 'debug-console';
        container.className = 'settings-panel'; // Re-use panel styles
        container.style.cssText = 'left: 20px; top: 120px; width: 300px; height: 250px; display: flex; flex-direction: column; z-index: 200; font-family: monospace; font-size: 10px;';
        
        // Header
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = '<span style="color:#00ffff">●</span> SYSTEM CONSOLE <span id="pipeline-status" style="float:right; color:#666">IDLE</span>';
        
        // Log Area
        const logArea = document.createElement('div');
        logArea.id = 'console-logs';
        logArea.style.cssText = 'flex-grow: 1; overflow-y: auto; background: rgba(0,0,0,0.8); padding: 5px; color: #aaa; scrollbar-width: thin;';
        
        // Input Area
        const inputArea = document.createElement('div');
        inputArea.style.cssText = 'border-top: 1px solid #333; padding: 5px; background: #111; display: flex;';
        const prompt = document.createElement('span');
        prompt.textContent = '>';
        prompt.style.color = '#00ffff';
        prompt.style.marginRight = '5px';
        const input = document.createElement('input');
        input.type = 'text';
        input.style.cssText = 'background: transparent; border: none; color: #fff; width: 100%; outline: none; font-family: monospace; font-size: 10px;';
        
        inputArea.appendChild(prompt);
        inputArea.appendChild(input);
        
        container.appendChild(header);
        container.appendChild(logArea);
        container.appendChild(inputArea);
        
        document.body.appendChild(container);
        
        // Initialize Draggable behavior manually since UIManager might load after or before
        // Simple drag logic reused here for self-containment
        let isDragging = false;
        let offsetX, offsetY;
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - container.offsetLeft;
            offsetY = e.clientY - container.offsetTop;
        });
        document.addEventListener('mousemove', (e) => {
            if(!isDragging) return;
            container.style.left = (e.clientX - offsetX) + 'px';
            container.style.top = (e.clientY - offsetY) + 'px';
        });
        document.addEventListener('mouseup', () => isDragging = false);

        return { container, logs: logArea, input, status: header.querySelector('#pipeline-status') };
    }

    bindEvents() {
        this.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(this.dom.input.value);
                this.dom.input.value = '';
            }
        });
    }

    log(source, message) {
        const time = new Date().toLocaleTimeString().split(' ')[0];
        const entry = document.createElement('div');
        
        // Color coding
        let color = '#aaa';
        if (source === 'ERROR') color = '#ff4444';
        if (source === 'AUDIO') color = '#00ff88';
        if (source === 'VIZ') color = '#ff00ff';
        if (source === 'REC') color = '#ffcc00';
        if (source === 'SYSTEM') color = '#00ffff';

        entry.innerHTML = `<span style="color:#666">[${time}]</span> <span style="color:${color}; font-weight:bold">${source}:</span> ${message}`;
        entry.style.marginBottom = '2px';
        
        this.dom.logs.appendChild(entry);
        this.dom.logs.scrollTop = this.dom.logs.scrollHeight;
        
        // Prune old logs
        if (this.dom.logs.children.length > this.maxLogs) {
            this.dom.logs.removeChild(this.dom.logs.firstChild);
        }
    }

    setPipelineStatus(status) {
        this.pipelineStatus = status;
        this.dom.status.textContent = status;
        
        if (status === 'RECORDING') {
            this.dom.status.style.color = '#ff4444';
            this.dom.status.style.textShadow = '0 0 5px red';
        } else if (status === 'PROCESSING') {
            this.dom.status.style.color = '#00ff88';
            this.dom.status.style.textShadow = 'none';
        } else {
            this.dom.status.style.color = '#666';
            this.dom.status.style.textShadow = 'none';
        }
        
        this.log("DAEMON", `Pipeline State Changed: ${status}`);
    }

    startDaemon() {
        // Simulates background "noise" and checking
        this.daemonInterval = setInterval(() => {
            if (this.pipelineStatus === 'RECORDING') {
                if (Math.random() > 0.95) this.log("DAEMON", "Buffer Flush: OK");
                if (Math.random() > 0.98) this.log("DAEMON", `Write Speed: ${(15 + Math.random()).toFixed(1)} MB/s`);
            }
            if (this.pipelineStatus === 'PROCESSING' && Math.random() > 0.9) {
                this.log("AUDIO", `Peak Level: -${(Math.random()*10).toFixed(1)}dB`);
            }
        }, 1000);
    }

    executeCommand(cmd) {
        this.log("USER", cmd);
        const parts = cmd.split(' ');
        switch(parts[0].toLowerCase()) {
            case 'clear':
                this.dom.logs.innerHTML = '';
                break;
            case 'help':
                this.log("SYSTEM", "Commands: clear, status, hide, show");
                break;
            case 'status':
                this.log("SYSTEM", `Pipeline: ${this.pipelineStatus}`);
                this.log("SYSTEM", `Memory: ${(performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : 'N/A')}MB`);
                break;
            case 'hide':
                this.dom.container.style.display = 'none';
                break;
            default:
                this.log("SYSTEM", "Unknown command");
        }
    }
}
