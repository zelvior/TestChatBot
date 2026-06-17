import * as http from 'http';
import { URL } from 'url';
import * as readline from 'readline';
import open from 'open';
import {
  OPENROUTER_AUTH_URL,
  exchangeCodeForKey,
  fetchModels,
  streamChatCompletions,
  type ChatMessage
} from '../lib/openrouter';
import { generateCodeVerifier, generateCodeChallenge } from '../lib/pkce-node';

const PORT = 4321;
const CALLBACK_URL = `http://localhost:${PORT}`;

async function authenticate(): Promise<string> {
  const envKey = process.env.OPENROUTER_API_KEY;
  if (envKey) {
    console.log('Using API key from OPENROUTER_API_KEY environment variable.');
    return envKey;
  }

  console.log('No API key found. Starting OAuth flow...');

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = `${OPENROUTER_AUTH_URL}?callback_url=${encodeURIComponent(CALLBACK_URL)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const code = url.searchParams.get('code');

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication successful!</h1><p>You can close this window and return to the terminal.</p>');

        server.close();

        try {
          const data = await exchangeCodeForKey(code, codeVerifier);
          resolve(data.key);
        } catch (err) {
          reject(err);
        }
      } else {
        res.writeHead(400);
        res.end('Authorization code missing');
      }
    });

    server.listen(PORT, () => {
      console.log(`Opening browser for authentication...`);
      console.log(`If it doesn't open, visit: ${authUrl}`);
      open(authUrl);
    });
  });
}

async function main() {
  try {
    const apiKey = await authenticate();
    console.log('\n--- ZBot CLI ---');

    await fetchModels();
    const defaultModel = 'google/gemini-2.0-flash-001';
    let selectedModel = defaultModel;

    console.log(`Connected. Using model: ${selectedModel}`);
    console.log('Type "/model <slug>" to change model, "/exit" to quit.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    const messages: ChatMessage[] = [];

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();

      if (input === '/exit') {
        rl.close();
        return;
      }

      if (input.startsWith('/model ')) {
        const newModel = input.split(' ')[1];
        if (newModel) {
          selectedModel = newModel;
          console.log(`Model changed to: ${selectedModel}\n`);
        }
        rl.prompt();
        return;
      }

      if (!input) {
        rl.prompt();
        return;
      }

      messages.push({ role: 'user', content: input });

      process.stdout.write('\nAssistant: ');

      let assistantContent = '';
      try {
        const stream = streamChatCompletions(apiKey, selectedModel, messages);
        for await (const chunk of stream) {
          process.stdout.write(chunk);
          assistantContent += chunk;
        }
        process.stdout.write('\n\n');
        messages.push({ role: 'assistant', content: assistantContent });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`\nError: ${errorMessage}\n`);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('Goodbye!');
      process.exit(0);
    });

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
