import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

const Terms: React.FC = () => {
  useSEO({
    title: 'Terms of Service | Investing Atti',
    description: 'Terms of Service and financial disclaimers for Investing Atti, your AI-powered stock research and education platform.',
    robots: 'index, follow',
  });

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
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Terms of Service</h1>
          <p className="text-xs text-slate-500 font-mono">Last Updated: June 19, 2026</p>
        </header>

        {/* Semantic Content */}
        <article className="space-y-6 text-sm text-slate-350 leading-relaxed font-normal">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-200">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Investing Atti platform, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-250 text-amber-400">⚠️ 2. Financial Disclaimer (Not Financial Advice)</h2>
            <p className="border-l-2 border-amber-500/30 pl-3 bg-amber-500/5 py-2.5 rounded-r-xl">
              <strong>Investing Atti is an educational and research platform. All contents, ratings, signals, support/resistance lines, and AI-generated insights are for educational purposes only.</strong> We do not operate as registered investment advisors, broker-dealers, or financial planners. Past performance does not guarantee future results. Make investment decisions at your own risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-200">3. Use of Platform & Accounts</h2>
            <p>
              You are responsible for safeguarding your account credentials. You agree to use the platform in compliance with applicable federal and local trading regulations. We reserve the right to terminate accounts that misuse API feeds or violate platform security policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-200">4. Service Modifications & Limits</h2>
            <p>
              Our stock tracking and analytical reports are generated using external APIs. While we strive for maximum accuracy and minimal latency, we do not guarantee uninterrupted data flows. Some features may be rate-limited to maintain system integrity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-200">5. Limitation of Liability</h2>
            <p>
              In no event shall Investing Atti or its developers be held liable for any direct, indirect, incidental, or consequential losses resulting from financial trades or the use of reports and signals hosted on our platform.
            </p>
          </section>
        </article>

        {/* Footer info */}
        <footer className="pt-8 border-t border-slate-850 text-center text-xs text-slate-550">
          <p>© {new Date().getFullYear()} Investing Atti. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Terms;
