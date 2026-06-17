'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  LogOut,
  User,
  Bot,
  Loader2,
  Settings,
  MessageSquare,
  ChevronDown,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/pkce';
import { OPENROUTER_AUTH_URL, fetchModels, type OpenRouterModel } from '@/lib/openrouter';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.0-flash-001');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadModels = async () => {
    setIsFetchingModels(true);
    try {
      const data = await fetchModels();
      setModels(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setIsFetchingModels(false);
    }
  };

  useEffect(() => {
    const storedKey = localStorage.getItem('openrouter_api_key');
    if (storedKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApiKey(storedKey);
      loadModels();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogin = async () => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    localStorage.setItem('code_verifier', codeVerifier);

    const callbackUrl = window.location.origin + '/auth/callback';
    const authUrl = `${OPENROUTER_AUTH_URL}?callback_url=${encodeURIComponent(callbackUrl)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = authUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('openrouter_api_key');
    setApiKey(null);
    setMessages([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !apiKey || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Advanced Chatbot',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMessage]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

            const data = trimmedLine.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: last.content + content }
                  ];
                });
              }
            } catch (e) {
              console.error('Error parsing stream chunk', e, data);
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bot className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Chatbot</h1>
          <p className="text-gray-500 mb-8">
            Connect your OpenRouter account to start chatting with hundreds of AI models.
            Supports BYOK for full control over your keys and costs.
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
          >
            Sign in with OpenRouter
            <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="mt-8 pt-8 border-t border-gray-100 text-sm text-gray-400">
            Secure authentication using OpenRouter OAuth PKCE
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <Bot className="text-blue-600 w-6 h-6" />
            <span>ChatBot</span>
          </div>
          <button
            onClick={() => setMessages([])}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Model Selection
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {isFetchingModels && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating model list...
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              BYOK Settings
            </label>
            <a
              href="https://openrouter.ai/settings/byok"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all border border-transparent hover:border-blue-100"
            >
              <Settings className="w-4 h-4" />
              Manage Provider Keys
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
            <p className="mt-2 text-[10px] text-gray-400 leading-relaxed px-1">
              Your OpenRouter BYOK settings are automatically applied to all requests.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full p-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white md:bg-gray-50">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 md:hidden">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <Bot className="text-blue-600 w-5 h-5" />
            <span>ChatBot</span>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Start a conversation</h2>
              <p className="text-gray-500">
                Choose a model and send a message to begin. Your BYOK settings will be used automatically.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-4 max-w-3xl mx-auto",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                  message.role === 'user' ? "bg-blue-600" : "bg-gray-200"
                )}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className={cn(
                  "flex flex-col gap-1 min-w-0",
                  message.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                    message.role === 'user'
                      ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-500/10"
                      : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm"
                  )}>
                    {message.content || (
                      <div className="flex gap-1 py-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 bg-white md:bg-transparent">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition duration-1000" />
            <div className="relative bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden flex items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Send a message..."
                rows={1}
                className="w-full resize-none bg-transparent border-none focus:ring-0 p-4 max-h-48 text-gray-800 placeholder-gray-400 text-sm"
              />
              <div className="p-2">
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between px-1">
              <p className="text-[10px] text-gray-400">
                Press Enter to send, Shift + Enter for new line
              </p>
              <div className="flex items-center gap-3 md:hidden">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-[10px] bg-transparent border-none focus:ring-0 text-gray-500 font-medium p-0"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
