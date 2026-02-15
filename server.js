const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { constructPrompt, validatePRD, constructGuidedChatPrompt, constructBrainDumpParserPrompt } = require('./prompt_template');

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

/**
 * Endpoint for Iterative Guided Chat (Collaborator)
 */
app.post('/api/chat', async (req, res) => {
    const { history } = req.body; // Array of { role: 'user'|'assistant', content: string }

    if (!history || !history.length) {
        return res.status(400).json({ error: 'Conversation history is required.' });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(' '.repeat(1024));

    try {
        const formattedHistory = history.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n');
        const prompt = constructGuidedChatPrompt(formattedHistory);

        console.log(`\n>>> [${new Date().toLocaleTimeString()}] CHAT REQUEST RECEIVED`);

        const response = await axios.post(OLLAMA_URL, {
            model: MODEL_NAME,
            prompt: prompt,
            stream: true,
            options: { temperature: 0.7 } // Higher temperature for inquisitive chat
        }, {
            responseType: 'stream',
            timeout: 300000
        });

        let buffer = '';
        response.data.on('data', chunk => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.response) res.write(json.response);
                    if (json.done) res.end();
                } catch (e) {
                    // Ignore partial JSON
                }
            }
        });

        response.data.on('end', () => {
            if (buffer.trim()) {
                try {
                    const json = JSON.parse(buffer);
                    if (json.response) res.write(json.response);
                } catch (e) { }
            }
            res.end();
        });

    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).write(`Error: ${error.message}`);
        res.end();
    }
});

/**
 * Endpoint to parse raw brain dump into structured fields
 */
app.post('/api/parse-brain-dump', async (req, res) => {
    const { brainDump } = req.body;
    if (!brainDump) return res.status(400).json({ error: 'No brain dump provided.' });

    try {
        const prompt = constructBrainDumpParserPrompt(brainDump);
        console.log(`\n>>> [${new Date().toLocaleTimeString()}] PARSE REQUEST RECEIVED`);

        const response = await axios.post(OLLAMA_URL, {
            model: MODEL_NAME,
            prompt: prompt,
            stream: false,
            options: { temperature: 0.1 } // Very low temp for JSON consistency
        });

        const content = response.data.response.trim();
        let json;
        try {
            // Find the first { and the last }
            const start = content.indexOf('{');
            const end = content.lastIndexOf('}');

            if (start !== -1 && end !== -1 && end > start) {
                const jsonStr = content.substring(start, end + 1);
                json = JSON.parse(jsonStr);
                res.json(json);
            } else {
                console.error('No JSON block found in AI response:', content);
                res.status(500).json({ error: 'AI failed to format response correctly. Please try speaking again.' });
            }
        } catch (e) {
            console.error('Failed to parse AI JSON string:', content, '\nError:', e.message);
            res.status(500).json({ error: 'AI response was malformed. Try a simpler description.' });
        }
    } catch (error) {
        console.error('Parsing error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`PM Helper Server running at http://localhost:${PORT}`);
    console.log(`Targeting Ollama at: ${OLLAMA_URL} using model: ${MODEL_NAME}`);
});
