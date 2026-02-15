/**
 * AI Voice Workbench Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- UI ELEMENTS ---
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceOverlay = document.getElementById('voiceOverlay');
    const stopVoiceBtn = document.getElementById('stopVoiceBtn');
    const transcriptPreview = document.getElementById('transcriptPreview');
    const voiceStatus = document.getElementById('voiceStatus');

    const generateBtn = document.getElementById('generateBtn');
    const prdOutput = document.getElementById('prdOutput');
    const statusIndicator = document.getElementById('statusIndicator');

    // Form Fields
    const fields = {
        featureName: document.getElementById('featureName'),
        problemStatement: document.getElementById('problemStatement'),
        businessObjective: document.getElementById('businessObjective'),
        successMetrics: document.getElementById('successMetrics'),
        targetPersona: document.getElementById('targetPersona'),
        constraints: document.getElementById('constraints')
    };

    // --- RIPPLE ANIMATION (WATER EFFECT) ---
    const canvas = document.getElementById('rippleCanvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let ripples = [];

    const resize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Ripple {
        constructor(x, y) {
            this.x = x; this.y = y;
            this.r = 0; this.opacity = 0.5;
            this.speed = 4;
        }
        update() {
            this.r += this.speed;
            this.opacity -= 0.01;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        ripples = ripples.filter(r => r.opacity > 0);
        ripples.forEach(r => {
            r.update();
            r.draw();
        });
        requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('mousemove', (e) => {
        if (Math.random() > 0.8) { // Performance throttle
            ripples.push(new Ripple(e.clientX, e.clientY));
        }
    });

    // --- VOICE LOGIC (Web Speech API) ---
    let recognition;
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                final += event.results[i][0].transcript;
            }
            transcriptPreview.textContent = final;
        };

        recognition.onend = () => {
            voiceOverlay.classList.add('hidden');
            processBrainDump(transcriptPreview.textContent);
        };
    }

    voiceBtn.addEventListener('click', () => {
        if (!recognition) return alert("Voice recognition not supported in this browser.");
        voiceOverlay.classList.remove('hidden');
        transcriptPreview.textContent = 'Listening...';
        recognition.start();
    });

    stopVoiceBtn.addEventListener('click', () => {
        recognition.stop();
    });

    // --- AI PARSING LOGIC ---
    async function processBrainDump(text) {
        if (!text || text === 'Listening...') return;

        voiceStatus.textContent = 'AI IS PARSING YOUR BRAIN DUMP...';
        statusIndicator.querySelector('.label').textContent = 'Extracting fields...';

        try {
            const response = await fetch('/api/parse-brain-dump', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brainDump: text })
            });
            const data = await response.json();

            // Auto-fill fields
            Object.keys(fields).forEach(key => {
                if (data[key]) {
                    fields[key].value = data[key];
                    // Trigger input event for title/subtitle sync
                    fields[key].dispatchEvent(new Event('input'));
                }
            });

            voiceStatus.textContent = 'RECOGNITION COMPLETE. VERIFY FIELDS.';
            statusIndicator.querySelector('.label').textContent = 'Context loaded.';
            statusIndicator.querySelector('.dot').style.background = '#10b981';

        } catch (e) {
            voiceStatus.textContent = 'AI PARSING FAILED. PLEASE FILL MANUALLY.';
            console.error(e);
        }
    }

    // --- PRD GENERATION LOGIC ---
    generateBtn.addEventListener('click', async () => {
        const payload = {};
        Object.keys(fields).forEach(k => payload[k] = fields[k].value);

        if (!payload.featureName || !payload.problemStatement) {
            return alert("Minimally need Feature Name and Problem Statement!");
        }

        generateBtn.disabled = true;
        prdOutput.innerHTML = '<i>Orchestrating professional draft...</i>';

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                content += decoder.decode(value, { stream: true });
                prdOutput.innerHTML = marked.parse(content);
            }
        } catch (e) {
            prdOutput.innerHTML = 'Error: ' + e.message;
        } finally {
            generateBtn.disabled = false;
        }
    });

    // --- UI TOOLS ---
    fields.featureName.addEventListener('input', (e) => {
        document.getElementById('docTitle').textContent = e.target.value || 'Voice Professional';
    });
    fields.problemStatement.addEventListener('input', (e) => {
        document.getElementById('docSubtitle').textContent = e.target.value || 'Brain dump parsed via AI.';
    });
});
