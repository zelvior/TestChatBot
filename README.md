# ZBot - Advanced Chatbot with OpenRouter OAuth & BYOK

ZBot is a powerful, multi-interface AI chatbot supporting both web and terminal. It features secure OpenRouter OAuth PKCE and Bring Your Own Key (BYOK) support, making it ideal for self-hosting and private use.

## Features

- **Web Interface**: Modern, responsive UI built with Next.js 15, Tailwind CSS, and Lucide icons.
- **Terminal Interface**: Powerful CLI for chatting directly from your terminal.
- **Secure Auth**: Uses OpenRouter OAuth with PKCE (Proof Key for Code Exchange) — no server needed.
- **BYOK Support**: Automatically respects your OpenRouter BYOK settings.
- **Streaming**: Real-time response streaming for a smooth experience.
- **GitHub Pages Ready**: Optimized for static deployment with sub-path support.

---

## Full Setup Guide (0 to Full)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A [GitHub](https://github.com/) account (for deployment)
- An [OpenRouter](https://openrouter.ai/) account

### 2. Local Installation
1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd chatbot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the web version**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

**Alternatively (Zero Setup):**
Just open `index.html` directly in your browser. No installation or build required!

4. **Run the terminal version**:
   ```bash
   npm run cli
   ```
   - If you have an API key: `OPENROUTER_API_KEY=sk-or-... npm run cli`
   - If not, it will launch an OAuth flow in your browser to log you in securely.

### 3. Customization
- **Name**: To change the name from "ZBot", search and replace "ZBot" in `app/page.tsx`, `scripts/cli.ts`, and this `README.md`.
- **Default Model**: Change the `selectedModel` state in `app/page.tsx` or the `defaultModel` variable in `scripts/cli.ts`.

### 4. Deployment to GitHub Pages
ZBot is designed to be deployed as a static site. No backend server is required!

1. **Push your code to a GitHub repository**.
2. **Configure GitHub Pages**:
   - Go to your repository on GitHub.
   - Click on **Settings** > **Pages**.
   - Under **Build and deployment > Source**, select **GitHub Actions**.
3. **Trigger the Deployment**:
   - The included `.github/workflows/nextjs.yml` will automatically build and deploy ZBot whenever you push to the `main` branch.
   - You can also trigger it manually from the **Actions** tab.
4. **Access your Bot**:
   - Once the action completes, your bot will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## Terminal Commands
Inside the CLI:
- `/model <slug>`: Switch to a different model (e.g., `/model anthropic/claude-3.5-sonnet`).
- `/exit`: Quit the application.

## Single-File Version
For the ultimate "no-touch" experience, ZBot is available as a single, self-contained `index.html` file.
- **How to use**: Just download `index.html` and open it in any modern browser.
- **Why**: Perfect for quick use without installing Node.js or setting up a build pipeline.
- **OAuth Support**: Works out of the box with OpenRouter's PKCE flow.

## Technologies
- **Frontend**: Next.js 15, Tailwind CSS 4, Lucide React
- **CLI**: Node.js, ts-node
- **API**: OpenRouter (OAuth PKCE)
- **CI/CD**: GitHub Actions
