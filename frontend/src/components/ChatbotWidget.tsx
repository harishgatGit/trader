import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, HelpCircle } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const KNOWLEDGE_BASE: Record<string, string> = {
  breakout: "A breakout occurs when a stock's price pushes above a major historical resistance level (ceiling). This signals that a new, strong upward trend has officially begun. Breakouts are most reliable when accompanied by high trading volume, showing institutional backing.",
  pullback: "A pullback is a temporary drop (or 'dip') in a stock's price during an active uptrend. It is a key buying setup because it allows you to enter a strong stock at a discount before the upward trend resumes.",
  confirmation: "To confirm a breakout (and avoid a 'fakeout'), look for three confirmations:\n1. **High Volume Spike**: Trading volume should be at least 1.5x to 2x higher than the 30-day average.\n2. **Candle Close**: The daily price candle must close clearly above the resistance ceiling line.\n3. **Follow-through**: The next day's price should hold above the breakout point, confirming the old ceiling has become a new support floor.",
  rsi: "Relative Strength Index (RSI(14)) is a momentum gauge scaled from 0 to 100. A reading above 70 means the stock is 'overbought' (overheated and due for a pullback). A reading below 30 means it is 'oversold' (cheap/due for a bounce).",
  ema: "Exponential Moving Average (EMA) tracks the average price over time, giving more weight to recent days. EMA(20) shows short-term support, and EMA(50) shows medium-term support. In a strong uptrend, price stays above these lines.",
  support: "Support is a price 'floor' where buying interest has historically been strong enough to stop the stock from falling further. When a stock pulls back to support, it often presents a lower-risk entry opportunity.",
  resistance: "Resistance is a price 'ceiling' where selling pressure has historically been strong enough to stop the stock from rising further. Pushing past this line is called a breakout.",
  macd: "Moving Average Convergence Divergence (MACD) is a momentum indicator. When the MACD line crosses above the signal line (bullish crossover), it indicates that upward price momentum is accelerating.",
  vwap: "Volume Weighted Average Price (VWAP) is the average price throughout the day weighted by volume. Large institutions use VWAP as a benchmark to buy or sell without moving the market.",
  bias: "The overall trend bias indicates the stock's direction. A bullish bias means the charts are in a steady uptrend, a bearish bias means a steady downtrend, and a neutral/mixed bias means sideways consolidation."
};

const SUGGESTED_QUESTIONS = [
  { text: "What is a breakout?", key: "breakout" },
  { text: "What is a pullback?", key: "pullback" },
  { text: "How to check breakout confirmation?", key: "confirmation" },
  { text: "What is RSI(14) and EMA(50)?", key: "rsi" }
];

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hi! I'm Ask ME — your AI assistant. Ask me anything about chart patterns, indicators, or how to read this stock review (e.g. what is a breakout or pullback?)",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const processResponse = (userInput: string) => {
    setIsTyping(true);
    
    // Simulate natural AI thinking delay
    setTimeout(() => {
      const lower = userInput.toLowerCase();
      let matchedResponse = '';

      // Check keywords in the input
      if (lower.includes('breakout') && lower.includes('confirm')) {
        matchedResponse = KNOWLEDGE_BASE.confirmation;
      } else if (lower.includes('breakout') || lower.includes('break out')) {
        matchedResponse = KNOWLEDGE_BASE.breakout;
      } else if (lower.includes('pullback') || lower.includes('pull back') || lower.includes('dip')) {
        matchedResponse = KNOWLEDGE_BASE.pullback;
      } else if (lower.includes('confirm') || lower.includes('check breakout')) {
        matchedResponse = KNOWLEDGE_BASE.confirmation;
      } else if (lower.includes('rsi') || lower.includes('relative strength')) {
        matchedResponse = KNOWLEDGE_BASE.rsi;
      } else if (lower.includes('ema') || lower.includes('moving average')) {
        matchedResponse = KNOWLEDGE_BASE.ema;
      } else if (lower.includes('macd')) {
        matchedResponse = KNOWLEDGE_BASE.macd;
      } else if (lower.includes('vwap')) {
        matchedResponse = KNOWLEDGE_BASE.vwap;
      } else if (lower.includes('support') || lower.includes('floor')) {
        matchedResponse = KNOWLEDGE_BASE.support;
      } else if (lower.includes('resistance') || lower.includes('ceiling')) {
        matchedResponse = KNOWLEDGE_BASE.resistance;
      } else if (lower.includes('bias') || lower.includes('outlook') || lower.includes('trend')) {
        matchedResponse = KNOWLEDGE_BASE.bias;
      } else {
        matchedResponse = "I'm specialized in explaining stock setups and metrics. Try asking about terms like 'breakout', 'pullback', 'breakout confirmation', 'RSI(14)', 'EMA(50)', or 'support/resistance'!";
      }

      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'bot',
          text: matchedResponse,
          timestamp: new Date()
        }
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    
    // Process bot answer
    processResponse(textToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText);
    }
  };

  return (
    <div className="fixed md:bottom-6 bottom-24 md:left-[264px] left-4 z-50 font-sans" ref={widgetRef}>
      
      {/* Floating Action Button (FAB) */}
      <button
        onClick={handleToggle}
        className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${
          isOpen
            ? 'rotate-90 bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 border-slate-700/50 text-white shadow-[0_4px_16px_rgba(15,23,42,0.25)]'
            : 'bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 border-indigo-500/40 text-white shadow-[0_4px_16px_rgba(79,70,229,0.4)]'
        }`}
        title="Guide Chatbot"
        aria-label="Guide Chatbot"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6 animate-pulse" />}
      </button>

      {/* Chat Card Dialog */}
      {isOpen && (
        <div className="absolute bottom-16 left-0 w-96 max-w-[calc(100vw-2rem)] h-[450px] bg-white dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col slide-up rounded-2xl overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
              <div className="text-left">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block tracking-wide">
                  Ask ME
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Learn chart setups &amp; indicators</span>
              </div>
            </div>
            <button
              onClick={handleToggle}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 dark:bg-slate-950/20">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
                >
                  <div className={`flex gap-2.5 max-w-[85%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                    {isBot && (
                      <div className="w-7 h-7 rounded-xl bg-indigo-950 border border-indigo-900/40 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-indigo-400" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed font-sans ${
                          isBot
                            ? 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-100 rounded-tl-sm whitespace-pre-line'
                            : 'bg-indigo-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className={`text-[9px] text-slate-600 ${isBot ? 'text-left pl-1' : 'text-right pr-1'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex gap-2.5 max-w-[85%] items-center">
                  <div className="w-7 h-7 rounded-xl bg-indigo-950 border border-indigo-900/40 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-3.5 py-2 rounded-2xl rounded-tl-sm text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions footer section */}
          {messages.length === 1 && !isTyping && (
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/10 shrink-0">
              <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold block mb-1.5">Common Questions:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q.key}
                    onClick={() => handleSendMessage(q.text)}
                    className="text-[10px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 border border-slate-300 dark:border-indigo-900/40 text-slate-700 dark:text-indigo-300 font-medium transition-colors cursor-pointer"
                  >
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question (e.g. what is a pullback?)..."
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isTyping}
            />
            <button
              onClick={() => handleSendMessage(inputText)}
              disabled={!inputText.trim() || isTyping}
              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
