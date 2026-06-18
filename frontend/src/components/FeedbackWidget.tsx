import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { feedbackApi } from '../services/api';

export const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [classification, setClassification] = useState('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const addToast = useAppStore((state) => state.addToast);
  const widgetRef = useRef<HTMLDivElement>(null);

  const MEMORY_KEY = 'investingatti_feedback_prompt_dismissed';

  // Timers to trigger feedback prompt at regular intervals without irritating the user
  useEffect(() => {
    const isDismissedToday = () => {
      const val = localStorage.getItem(MEMORY_KEY);
      return val && Date.now() - Number(val) < 24 * 60 * 60 * 1000;
    };

    if (isOpen || isDismissedToday()) return;

    // Trigger initial notification bubble after 12 seconds
    const initialTimer = setTimeout(() => {
      if (!isOpen && !isDismissedToday()) {
        setShowPrompt(true);
      }
    }, 12000);

    // Regular reminder: show prompt every 90 seconds if not opened or dismissed
    const interval = setInterval(() => {
      if (isOpen || isDismissedToday()) return;
      setShowPrompt(true);
    }, 90000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isOpen]);

  // Prompt auto-dismisses after 8 seconds to prevent screen clutter
  useEffect(() => {
    if (showPrompt) {
      const dismissTimer = setTimeout(() => {
        setShowPrompt(false);
      }, 8000);
      return () => clearTimeout(dismissTimer);
    }
  }, [showPrompt]);

  // Close widget when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        if (isOpen && !isSubmitting) {
          setIsOpen(false);
          resetForm();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isSubmitting]);

  const resetForm = () => {
    setClassification('');
    setSummary('');
    setSuccess(false);
    setError(null);
  };

  const handleToggle = () => {
    if (isSubmitting) return;
    setIsOpen(!isOpen);
    setShowPrompt(false);
    if (isOpen) {
      resetForm();
    } else {
      // User opened the feedback dialog, silence prompts for today
      localStorage.setItem(MEMORY_KEY, String(Date.now()));
    }
  };

  const dismissPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPrompt(false);
    // Explicitly dismissed by the user, silence prompts for 24 hours
    localStorage.setItem(MEMORY_KEY, String(Date.now()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classification || !summary.trim() || summary.length > 4000) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await feedbackApi.submit({ classification, summary });
      setSuccess(true);
      addToast('success', 'Feedback submitted successfully. Thank you!');
      
      // Auto close after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
      addToast('error', `Feedback submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed md:bottom-6 bottom-24 md:right-6 right-4 z-50 font-sans" ref={widgetRef}>
      {/* Floating Animated Prompt Bubble */}
      {showPrompt && (
        <div className="absolute bottom-16 right-0 w-72 p-3 card-glass border border-teal-500/30 rounded-2xl shadow-xl flex items-start gap-2 animate-bounce-in z-50">
          <div 
            onClick={handleToggle}
            className="flex-1 pl-1.5 text-left cursor-pointer hover:opacity-90 transition-opacity"
          >
            <h5 className="text-xs font-bold text-teal-400 flex items-center gap-1.5 mb-1 select-none">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              Write to Us!
            </h5>
            <p className="text-[11px] text-slate-350 leading-relaxed select-none">
              How is your experience? Click here to share suggestions or report an issue. We'd love to hear from you!
            </p>
          </div>
          <button
            onClick={dismissPrompt}
            className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors self-start"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {/* Small Arrow pointing down to the FAB */}
          <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-slate-900 border-r border-b border-slate-800 rotate-45" />
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={handleToggle}
        className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${
          isOpen
            ? 'rotate-90 bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 border-slate-700/50 text-white shadow-[0_4px_16px_rgba(15,23,42,0.25)]'
            : 'bg-teal-600 dark:bg-teal-600 hover:bg-teal-500 dark:hover:bg-teal-500 border-teal-500/40 text-white shadow-[0_4px_16px_rgba(13,148,136,0.4)] glow-brand'
        }`}
        title="Write to Us"
        aria-label="Write to Us"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6 animate-pulse" />}
      </button>

      {/* Feedback Card Dialog */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 max-w-[calc(100vw-2rem)] card-glass shadow-2xl border border-slate-700/50 flex flex-col gap-4 slide-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-semibold text-slate-100  tracking-wider">
                Write to Us
              </span>
            </div>
            <button
              onClick={handleToggle}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {success ? (
            /* Success State */
            <div className="flex flex-col items-center justify-center py-6 text-center gap-3 fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              <h4 className="text-slate-200 font-semibold">Thank you for writing to us!</h4>
              <p className="text-xs text-slate-400 max-w-[250px]">
                We have registered your feedback in the system.
              </p>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 fade-in">
              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-950/30 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Classification Selector */}
              <div>
                <label className="label" htmlFor="classification">
                  Classification
                </label>
                <select
                  id="classification"
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="input bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-medium cursor-pointer"
                  required
                  disabled={isSubmitting}
                >
                  <option value="" disabled>Select classification...</option>
                  <option value="Incorrect data">Incorrect data</option>
                  <option value="Data not available">Data not available</option>
                  <option value="Fetching old data">Fetching old data</option>
                  <option value="Good to have">Good to have</option>
                  <option value="Must have">Must have</option>
                </select>
              </div>

              {/* Summary Textarea */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="label" htmlFor="summary">
                    Summary / Description
                  </label>
                  <span className={`text-[10px] font-mono ${
                    summary.length > 3800 ? 'text-red-400 font-bold' : 'text-slate-500'
                  }`}>
                    {summary.length} / 4000
                  </span>
                </div>
                <textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value.substring(0, 4000))}
                  placeholder="Describe the issue or details here..."
                  className="input min-h-[120px] resize-none bg-slate-900 border border-slate-700 text-slate-200"
                  maxLength={4000}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-700/30 pt-3">
                <button
                  type="button"
                  onClick={handleToggle}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-md hover:shadow-teal-900/40 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1.5"
                  disabled={!classification || !summary.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Send Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
