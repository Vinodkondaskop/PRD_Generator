/**
 * Frontend logic for AI PRD Workbench
 */

document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const generateBtn = document.getElementById('generateBtn');
    const featureNameInput = document.getElementById('featureName');
    const problemStatementInput = document.getElementById('problemStatement');
    const objectiveInput = document.getElementById('businessObjective');
    const metricsInput = document.getElementById('successMetrics');
    const personaInput = document.getElementById('targetPersona');
    const constraintsInput = document.getElementById('constraints');

    const prdOutput = document.getElementById('prdOutput');
    const statusIndicator = document.getElementById('statusIndicator');
    const docTitle = document.getElementById('docTitle');
    const docSubtitle = document.getElementById('docSubtitle');

    let currentMarkdown = '';

    // Real-time Title Sync
    if (featureNameInput) {
        featureNameInput.addEventListener('input', (e) => {
            docTitle.textContent = e.target.value.trim() || 'Workbench Ready';
        });
    }

    if (problemStatementInput) {
        problemStatementInput.addEventListener('input', (e) => {
            docSubtitle.textContent = e.target.value.trim() || 'Fill out the context in the sidebar or use the Assistant ✨ to begin.';
        });
    }

    /**
     * Handle Generation
     */
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const payload = {
                featureName: featureNameInput.value.trim(),
                problemStatement: problemStatementInput.value.trim(),
                businessObjective: objectiveInput.value.trim(),
                successMetrics: metricsInput.value.trim(),
                targetPersona: personaInput.value.trim(),
                constraints: constraintsInput.value.trim()
            };

            if (!payload.featureName || !payload.problemStatement) {
                alert('Feature Name and Problem Statement are required to begin drafting.');
                return;
            }

            // UI State: Loading
            generateBtn.disabled = true;
            generateBtn.textContent = 'Orchestrating AI...';
            statusIndicator.querySelector('.label').textContent = 'Analyzing context...';
            statusIndicator.querySelector('.dot').style.background = '#1d4ed8';

            prdOutput.innerHTML = '';
            currentMarkdown = '';

            try {
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to generate PRD');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    currentMarkdown += chunk;
                    prdOutput.innerHTML = marked.parse(currentMarkdown);
                    statusIndicator.querySelector('.label').textContent = 'Drafting details...';
                }

                statusIndicator.querySelector('.label').textContent = 'PRD Draft Complete.';
                statusIndicator.querySelector('.dot').style.background = '#10b981';

            } catch (error) {
                console.error(error);
                statusIndicator.querySelector('.label').textContent = `Error: ${error.message}`;
                statusIndicator.querySelector('.dot').style.background = '#ef4444';
                prdOutput.innerHTML = `<p style="color: #ef4444"><b>Generation Failed:</b> ${error.message}</p>`;
            } finally {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate PRD Draft';
            }
        });
    }

    // Chat Selectors
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatOverlay = document.getElementById('chatOverlay');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatInput = document.getElementById('chatInput');
    const sendMsgBtn = document.getElementById('sendMsgBtn');
    const chatMessages = document.getElementById('chatMessages');

    let messageHistory = [
        { role: 'assistant', content: "Hello! I'm your AI PM Assistant. Paste your raw notes or 'brain dump' here, and I'll help you refine them into a structured PRD step-by-step." }
    ];

    if (chatToggleBtn && chatOverlay) {
        chatToggleBtn.addEventListener('click', () => chatOverlay.classList.toggle('hidden'));
        closeChatBtn.addEventListener('click', () => chatOverlay.classList.add('hidden'));

        sendMsgBtn.addEventListener('click', async () => {
            const text = chatInput.value.trim();
            if (!text) return;

            // Add user message
            const uMsg = document.createElement('div');
            uMsg.className = 'msg user';
            uMsg.textContent = text;
            chatMessages.appendChild(uMsg);
            messageHistory.push({ role: 'user', content: text });
            chatInput.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Assistant response
            const aMsg = document.createElement('div');
            aMsg.className = 'msg assistant';
            aMsg.textContent = '...';
            chatMessages.appendChild(aMsg);

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ history: messageHistory })
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullContent = '';
                aMsg.textContent = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    fullContent += decoder.decode(value, { stream: true });
                    aMsg.textContent = fullContent;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                messageHistory.push({ role: 'assistant', content: fullContent });
            } catch (e) {
                aMsg.textContent = 'Error: ' + e.message;
            }
        });
    }
});
