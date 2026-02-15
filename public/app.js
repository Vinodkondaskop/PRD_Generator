/**
 * Frontend logic for PM Helper
 */

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const featureNameInput = document.getElementById('featureName');
    const objectiveInput = document.getElementById('businessObjective');
    const descriptionInput = document.getElementById('description');

    const outputPanel = document.querySelector('.output-panel');
    const prdOutput = document.getElementById('prdOutput');
    const statusIndicator = document.getElementById('statusIndicator');
    const copyBtn = document.getElementById('copyBtn');

    let currentMarkdown = '';

    /**
     * Handle Generation
     */
    generateBtn.addEventListener('click', async () => {
        const featureName = featureNameInput.value.trim();
        const description = descriptionInput.value.trim();
        const businessObjective = objectiveInput.value.trim();

        if (!featureName || !description) {
            alert('Feature Name and Description are required.');
            return;
        }

        // UI State: Loading
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        statusIndicator.textContent = 'Orchestrating Llama 3.2 (3B) via Ollama...';
        outputPanel.classList.remove('hidden');
        prdOutput.innerHTML = '<p style="color: #666">Please wait while the PRD is structured...</p>';
        outputPanel.scrollIntoView({ behavior: 'smooth' });

        try {
            console.log('>>> [UI] Initiating Fetch to /api/generate');
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    featureName,
                    businessObjective,
                    description
                })
            });

            console.log('>>> [UI] Fetch Headers Received. Status:', response.status);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate PRD');
            }

            // Streaming Handle
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            currentMarkdown = '';
            prdOutput.innerHTML = ''; // Clear initial message

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                if (chunk.trim()) console.log('Chunk received:', chunk.length, 'bytes');
                currentMarkdown += chunk;

                // Update UI incrementally
                prdOutput.innerHTML = marked.parse(currentMarkdown);

                // Keep status updated
                statusIndicator.textContent = 'Streaming implementation details...';
            }

            statusIndicator.textContent = 'PRD Generated Successfully.';
            statusIndicator.style.color = '#007aff';

        } catch (error) {
            console.error(error);
            statusIndicator.textContent = `Error: ${error.message}`;
            statusIndicator.style.color = '#ff3b30';
            prdOutput.innerHTML = `<p style="color: #ff3b30"><b>Generation Failed:</b> ${error.message}</p>`;
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate PRD';
        }
    });

    /**
     * Handle Copy
     */
    copyBtn.addEventListener('click', () => {
        if (!currentMarkdown) return;

        navigator.clipboard.writeText(currentMarkdown).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    });
});
