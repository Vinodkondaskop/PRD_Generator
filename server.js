const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { constructPrompt, validatePRD } = require('./prompt_template');

const app = express();
const PORT = process.env.PORT || 3008;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_TAGS_URL = 'http://localhost:11434/api/tags';
let MODEL_NAME = 'llama3.2';

// Check for available models and fallback
async function initModel() {
    try {
        const response = await axios.get(OLLAMA_TAGS_URL);
        const models = response.data.models || [];
        const hasLlama = models.some(m => m.name.includes('llama3.2'));
        if (!hasLlama) {
            console.warn('Llama 3.2 not found, falling back to Mistral.');
            MODEL_NAME = 'mistral';
        } else {
            console.log('Using optimized model: Llama 3.2');
        }
    } catch (e) {
        console.error('Could not reach Ollama to verify models. Defaulting to Llama 3.2.');
    }
}
initModel();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', model: MODEL_NAME });
});

// Explicitly serve index.html to avoid static serving issues on certain systems
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Endpoint to generate PRD (Streaming)
 */
app.post('/api/generate', async (req, res) => {
    console.log(`\n>>> [${new Date().toLocaleTimeString()}] RECEIVED REQUEST:`, req.body);

    const { featureName, problemStatement } = req.body;

    if (!featureName || !problemStatement) {
        console.error('Missing required fields');
        return res.status(400).json({ error: 'Feature Name and Problem Statement are required.' });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // BUFFER FLUSH
    res.write(' '.repeat(1024));

    try {
        const prompt = constructPrompt(req.body);
        console.log(`>>> Sending prompt to Ollama (${MODEL_NAME})...`);

        const response = await axios.post(OLLAMA_URL, {
            model: MODEL_NAME,
            prompt: prompt,
            stream: true,
            options: {
                temperature: 0.2
            }
        }, {
            responseType: 'stream',
            timeout: 300000 // 5 minutes for slow initial loads
        });

        console.log('>>> Ollama stream opened.');
        let buffer = '';
        response.data.on('data', chunk => {
            buffer += chunk.toString();

            let boundary = buffer.lastIndexOf('\n');
            if (boundary === -1) return; // Wait for more data

            const completeData = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 1);

            const lines = completeData.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.response) {
                        res.write(json.response);
                    }
                    if (json.done) {
                        console.log(`Generation complete for: ${featureName}`);
                        res.end();
                    }
                } catch (e) {
                    console.error('JSON Parse Error on line:', line);
                }
            }
        });

        response.data.on('error', (err) => {
            console.error('Ollama stream error:', err);
            if (!res.headersSent) {
                res.status(500).send('Stream error');
            } else {
                res.end('\n[Error during generation]');
            }
        });

    } catch (error) {
        console.error('Error initiating generation:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to communicate with Ollama. Ensure llama3.2 is pulled.' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`PM Helper Server running at http://localhost:${PORT}`);
    console.log(`Targeting Ollama at: ${OLLAMA_URL} using model: ${MODEL_NAME}`);
});
