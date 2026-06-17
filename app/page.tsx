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
  ExternalLink,
  Copy,
  Check,
  Plus,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/pkce';
import { OPENROUTER_AUTH_URL, fetchModels, streamChatCompletions, type OpenRouterModel, type ChatMessage } from '@/lib/openrouter';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export default function ZBotPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.0-flash-001');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const storedKey = localStorage.getItem('openrouter_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      loadModels();
    }

    const savedConvs = localStorage.getItem('zbot_conversations');
    if (savedConvs) {
      const parsed = JSON.parse(savedConvs);
      setConversations(parsed);
      if (parsed.length > 0) {
        setCurrentConvId(parsed[0].id);
      }
    } else {
      createNewConversation();
    }
  }, []);

  // Sync Conversations to LocalStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('zbot_conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [conversations, currentConvId]);

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

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Math.random().toString(36).substring(7),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConvId(newConv.id);
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newConvs = conversations.filter(c => c.id !== id);
    setConversations(newConvs);
    if (currentConvId === id) {
      if (newConvs.length > 0) {
        setCurrentConvId(newConvs[0].id);
      } else {
        createNewConversation();
      }
    }
  };

  const handleLogin = async () => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    localStorage.setItem('code_verifier', codeVerifier);

    const callbackUrl = window.location.origin + window.location.pathname.replace(/\/$/, '') + '/auth/callback/';
    const authUrl = `${OPENROUTER_AUTH_URL}?callback_url=${encodeURIComponent(callbackUrl)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = authUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('openrouter_api_key');
    setApiKey(null);
  };

  const currentConv = conversations.find(c => c.id === currentConvId);
  const messages = currentConv?.messages || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !apiKey || isLoading || !currentConvId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    // Update conversation with user message
    setConversations(prev => prev.map(c => {
      if (c.id === currentConvId) {
        return {
          ...c,
          messages: [...c.messages, userMsg],
          title: c.messages.length === 0 ? input.substring(0, 30) + (input.length > 30 ? '...' : '') : c.title,
          updatedAt: Date.now()
        };
      }
      return c;
    }));

    setInput('');
    setIsLoading(true);

    try {
      const assistantMsgId = (Date.now() + 1).toString();
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };

      setConversations(prev => prev.map(c => {
        if (c.id === currentConvId) {
          return { ...c, messages: [...c.messages, assistantMsg] };
        }
        return c;
      }));

      const chatMessages: ChatMessage[] = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const stream = streamChatCompletions(apiKey, selectedModel, chatMessages);

      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk;
        setConversations(prev => prev.map(c => {
          if (c.id === currentConvId) {
            return {
              ...c,
              messages: c.messages.map(m =>
                m.id === assistantMsgId ? { ...m, content: fullContent } : m
              )
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Error: Failed to connect to OpenRouter. Please check your API key or connection.',
        timestamp: Date.now()
      };
      setConversations(prev => prev.map(c => {
        if (c.id === currentConvId) {
          return { ...c, messages: [...c.messages, errorMsg] };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-4 font-sans selection:bg-blue-500/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-[#111] rounded-3xl border border-white/5 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] p-10 text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-600/20">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">ZBot</h1>
          <p className="text-white/40 mb-10 leading-relaxed">
            Experience the next generation of AI chat.
            Connect your OpenRouter account to access hundreds of models with full BYOK support.
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
          >
            <span className="relative z-10">Get Started with OpenRouter</span>
            <ExternalLink className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center gap-4 text-white/20">
            <span className="text-xs font-medium tracking-widest uppercase">Open Source & Private</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white selection:bg-blue-100 selection:text-blue-900 overflow-hidden font-sans">
      {/* Navigation Overlay for Mobile */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-4 left-4 z-50 p-2.5 bg-white border border-gray-200 rounded-xl shadow-lg md:hidden"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 300 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className={cn(
          "bg-[#f9f9f9] border-r border-gray-100 flex flex-col relative z-40 shrink-0 h-full",
          !isSidebarOpen && "pointer-events-none border-none"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">ZBot</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors md:hidden"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-4 mb-4">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-3 p-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Recent Chats</label>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setCurrentConvId(conv.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 text-sm rounded-xl transition-all group relative",
                currentConvId === conv.id
                  ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-100"
                  : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-900"
              )}
            >
              <MessageSquare className={cn("w-4 h-4 shrink-0", currentConvId === conv.id ? "text-blue-500" : "text-gray-400")} />
              <span className="truncate pr-6">{conv.title}</span>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-600 rounded-md transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          ))}
        </div>

        <div className="p-4 mt-auto border-t border-gray-100 space-y-2">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Settings className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900">BYOK Settings</p>
                <p className="text-[10px] text-gray-400 truncate">Manage keys & limits</p>
              </div>
            </div>
            <a
              href="https://openrouter.ai/settings/byok"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-100 rounded-lg transition-all"
            >
              Configure Keys
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Top Header */}
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors hidden md:block"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 font-semibold text-gray-900 group">
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 appearance-none cursor-pointer pr-6 py-1 text-sm font-bold text-gray-800"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
              </div>
              {isFetchingModels && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full text-[10px] font-bold text-blue-600 uppercase tracking-wider">
               <Sparkles className="w-3 h-3" />
               Pro Access
             </div>
          </div>
        </header>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">
            {messages.length === 0 ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">How can I help you today?</h2>
                <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Start a new conversation with ZBot. Your BYOK settings are automatically handled via OpenRouter.
                </p>
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                  {['Write a React component', 'Explain quantum computing', 'Debug a Python script', 'Draft a professional email'].map((hint) => (
                    <button
                      key={hint}
                      onClick={() => setInput(hint)}
                      className="p-4 text-left text-sm text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition-all"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-6 group",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm transition-transform group-hover:scale-105",
                      message.role === 'user' ? "bg-gray-900 text-white" : "bg-blue-600 text-white"
                    )}>
                      {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={cn(
                      "flex flex-col gap-2 min-w-0 max-w-[85%]",
                      message.role === 'user' ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "rounded-3xl text-base leading-relaxed px-6 py-4 relative",
                        message.role === 'user'
                          ? "bg-gray-100 text-gray-800 rounded-tr-none"
                          : "bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm"
                      )}>
                        {message.content ? (
                          <div className="prose prose-sm max-w-none prose-slate prose-headings:font-bold prose-a:text-blue-600 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                code({ className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const isInline = !className;
                                  return !isInline && match ? (
                                    <div className="relative group/code rounded-xl overflow-hidden my-6 border border-white/10 shadow-lg">
                                      <div className="absolute right-3 top-3 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                        <CopyButton text={String(children).replace(/\n$/, '')} />
                                      </div>
                                      <div className="px-4 py-2 bg-[#282c34] text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                                        {match[1]}
                                      </div>
                                      <SyntaxHighlighter
                                        {...props}
                                        style={oneDark}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{ margin: 0, padding: '1.5rem', fontSize: '13px', background: '#282c34' }}
                                      >
                                        {String(children).replace(/\n$/, '')}
                                      </SyntaxHighlighter>
                                    </div>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex gap-1.5 py-2">
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 bg-blue-600 rounded-full" />
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-2 h-2 bg-blue-600 rounded-full" />
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-2 h-2 bg-blue-600 rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} className="h-10" />
          </div>
        </div>

        {/* Floating Input Area */}
        <div className="shrink-0 p-6 md:pb-10 md:pt-4 bg-white md:bg-transparent">
          <form
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition duration-1000" />
            <div className="relative bg-white border border-gray-200 rounded-[2rem] shadow-2xl shadow-gray-200/50 overflow-hidden ring-1 ring-gray-100 flex items-end p-2 pr-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Message ZBot..."
                rows={1}
                className="w-full resize-none bg-transparent border-none focus:ring-0 py-4 px-6 max-h-48 text-gray-800 placeholder-gray-400 text-base"
                style={{ height: 'auto', minHeight: '60px' }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                  "shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                  isLoading || !input.trim()
                    ? "bg-gray-100 text-gray-300"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-4 text-center text-[10px] text-gray-400 font-medium tracking-wide">
              ZBot uses OpenRouter to access hundreds of models. Response quality varies by model.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 bg-[#3e4451] hover:bg-[#4b5263] text-gray-300 rounded-lg border border-white/5 transition-all shadow-sm flex items-center gap-1.5"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      <span className="text-[10px] font-bold uppercase tracking-tight">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
