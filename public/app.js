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
    featureNameInput.addEventListener('input', (e) => {
        docTitle.textContent = e.target.value.trim() || 'Workbench Ready';
    });

    problemStatementInput.addEventListener('input', (e) => {
        docSubtitle.textContent = e.target.value.trim() || 'Fill out the context in the sidebar to begin orchestration.';
    });

    /**
     * Handle Generation
     */
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
            console.log('>>> [UI] Initiating Workbench Fetch');
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate PRD');
            }

            // Streaming Handle
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                currentMarkdown += chunk;

                // Update UI incrementally using marked
                prdOutput.innerHTML = marked.parse(currentMarkdown);

                statusIndicator.querySelector('.label').textContent = 'Drafting user stories...';
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

    // Mock PDF/DOCX actions
    document.querySelectorAll('.secondary-btn, .publish-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            alert('This feature is coming soon to the Workbench!');
        });
    });
});
