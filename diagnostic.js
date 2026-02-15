const http = require('http');

async function checkPort(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: data.trim() }));
        });
        req.on('error', () => resolve({ error: 'Connection refused' }));
        req.setTimeout(2000, () => { req.destroy(); resolve({ error: 'Timeout' }); });
    });
}

async function checkOllama() {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:11434/api/tags`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const modelExists = json.models?.some(m => m.name.includes('llama3.2'));
                    resolve({ reachable: true, model_llama3_2: modelExists });
                } catch (e) {
                    resolve({ reachable: true, error: 'Invalid JSON response from Ollama' });
                }
            });
        });
        req.on('error', () => resolve({ reachable: false }));
        req.setTimeout(2000, () => { req.destroy(); resolve({ reachable: false }); });
    });
}

async function run() {
    console.log('--- DIAGNOSTIC START ---');
    const p3008 = await checkPort(3008);
    console.log('Port 3008:', p3008);

    const ollama = await checkOllama();
    console.log('Ollama Status:', ollama);
    console.log('--- DIAGNOSTIC END ---');
}

run();
