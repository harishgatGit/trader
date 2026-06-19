import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

const Contact: React.FC = () => {
  useSEO({
    title: 'Contact Us | Investing Atti',
    description: 'Get in touch with the Investing Atti team. Send us support inquiries, feedback, or general questions.',
    robots: 'index, follow',
  });

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    
    setLoading(true);
    // Simulate API contact call
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
      setEmail('');
      setMessage('');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Back Link */}
        <Link 
          to="/landing" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-450 hover:text-brand-400 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Title Block */}
        <header className="border-b border-slate-850 pb-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Contact Us</h1>
          <p className="text-sm text-slate-450">
            Have questions about our AI analysis tools, features, or licensing? Drop us a line.
          </p>
        </header>

        {/* Semantic Content */}
        <div className="grid md:grid-cols-5 gap-8 items-start">
          {/* Contact Details */}
          <div className="md:col-span-2 space-y-5">
            <div className="card p-5 bg-surface-900 border-slate-850 space-y-4">
              <h2 className="text-sm font-extrabold text-slate-350 tracking-wider uppercase">Direct Contact</h2>
              <div className="space-y-3">
                <a 
                  href="mailto:support@investingatti.com" 
                  className="flex items-center gap-3 text-sm text-slate-300 hover:text-brand-400 transition-colors"
                >
                  <Mail className="w-4 h-4 text-brand-500" />
                  support@investingatti.com
                </a>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <MessageSquare className="w-4 h-4 text-brand-500" />
                  Response time: &lt; 24 Hours
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-3">
            {submitted ? (
              <div className="card bg-emerald-500/5 border-emerald-500/20 p-6 flex flex-col items-center text-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
                <h3 className="text-base font-bold text-slate-100">Message Received!</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  Thank you for reaching out. A support coordinator will review your ticket and reply shortly.
                </p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="btn btn-secondary text-xs mt-2 py-1.5 px-4 rounded-xl"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card bg-surface-900 border-slate-850 p-6 space-y-4">
                <div className="space-y-1">
                  <label htmlFor="contact-email" className="text-xs font-bold text-slate-400">Your Email</label>
                  <input 
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="input w-full"
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="contact-message" className="text-xs font-bold text-slate-400">Message or Question</label>
                  <textarea 
                    id="contact-message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what we can help you with…"
                    className="input w-full resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading || !email || !message}
                  className="btn btn-primary w-full py-2.5 flex items-center justify-center gap-2 rounded-xl"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Sending…' : 'Submit Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <footer className="pt-8 border-t border-slate-850 text-center text-xs text-slate-550">
          <p>© {new Date().getFullYear()} Investing Atti. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Contact;
