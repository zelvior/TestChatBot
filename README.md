# Advanced Chatbot with OpenRouter OAuth & BYOK

A multi-interface AI chatbot supporting both web and terminal, featuring secure OpenRouter OAuth PKCE and Bring Your Own Key (BYOK) support.

## Features

- **Web Interface**: Modern, responsive UI built with Next.js, Tailwind CSS, and Lucide icons.
- **Terminal Interface**: Powerful CLI for chatting directly from your terminal.
- **Secure Auth**: Uses OpenRouter OAuth with PKCE (Proof Key for Code Exchange) — no server needed.
- **BYOK Support**: Automatically respects your OpenRouter BYOK settings.
- **Streaming**: Real-time response streaming for a smooth experience.
- **GitHub Pages Ready**: Optimized for static deployment with sub-path support.

## Getting Started

### Web Interface

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Build for production (Static Export)**:
   ```bash
   npm run build
   ```
   The static files will be in the `out/` directory.

### Terminal Interface

Run the chatbot directly in your terminal:

```bash
npm run cli
```

The CLI will look for an `OPENROUTER_API_KEY` environment variable. If not found, it will launch an interactive OAuth login flow in your browser.

## Deployment

### GitHub Pages

This project is configured for easy deployment to GitHub Pages. A GitHub Actions workflow is included in `.github/workflows/nextjs.yml`.

To deploy:
1. Push this repository to GitHub.
2. Go to **Settings > Pages**.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. The site will automatically build and deploy on every push to the `main` branch.

## Technologies

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **CLI**: Node.js, [ts-node](https://typestrong.org/ts-node/)
- **API**: [OpenRouter](https://openrouter.ai/)
- **Deployment**: [GitHub Actions](https://github.com/features/actions), [GitHub Pages](https://pages.github.com/)
