import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronLeft, ArrowLeft } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

const Privacy: React.FC = () => {
  useSEO({
    title: 'Privacy Policy | Investing Atti',
    description: 'Privacy Policy and data protection terms for Investing Atti, your AI-powered stock research and education platform.',
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
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Privacy Policy</h1>
          <p className="text-xs text-slate-500 font-mono">Last Updated: June 19, 2026</p>
        </header>

        {/* Semantic Content */}
        <article className="space-y-6 text-sm text-slate-350 leading-relaxed font-normal">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-200">1. Information We Collect</h2>
            <p>
              We collect information to provide a better stock analysis and education experience. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account Information:</strong> When you register, we collect credentials, usernames, and email addresses.</li>
              <li><strong>OAuth Data:</strong> If you sign in using Google or Microsoft, we receive basic public profile information.</li>
              <li><strong>Usage Data:</strong> We track ticker searches and watchlists to personalize your research dash.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-200">2. How We Use Information</h2>
            <p>
              Your data is utilized to deliver and improve our platform features:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Generating personalized watchlists and market reports.</li>
              <li>Restoring your active session state when you browse between pages.</li>
              <li>Sending necessary security alerts or system notifications.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-200">3. Data Security & Retention</h2>
            <p>
              We implement industry-standard encryption and security measures to protect your credentials. We do not sell, trade, or distribute your personal data to third parties. Your portfolio data remains strictly confidential.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-200">4. Third-Party Integrations</h2>
            <p>
              Investing Atti connects to third-party APIs (such as Alpaca for market data) to synthesize charts and reports. These integrations do not receive your personal account details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-200">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@investingatti.com" className="text-brand-400 hover:underline">support@investingatti.com</a>.
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

export default Privacy;
