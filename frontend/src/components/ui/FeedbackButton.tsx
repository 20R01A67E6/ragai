"use client";
import { useState } from "react";
import { MessageSquare, X, Star, Send, CheckCircle } from "lucide-react";

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    setSubmitted(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setRating(0);
      setFeedback("");
      setSubmitted(false);
    }, 200);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => handleClose(), 2500);
  };

  const canSubmit = rating > 0 || feedback.trim().length > 0;

  return (
    <>
      {/* Backdrop — only in DOM when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={handleClose}
        />
      )}

      {/* Modal panel — only in DOM when open */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-900">Share feedback</p>
              <p className="text-xs text-gray-500 mt-0.5">Help us improve RAGaii</p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Close feedback"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {submitted ? (
            <div className="px-5 py-8 text-center animate-fade-in">
              <div className="flex justify-center mb-3">
                <div className="bg-green-50 rounded-full p-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <p className="font-semibold text-gray-900 mb-1">Thanks for the feedback!</p>
              <p className="text-sm text-gray-500">We read every submission.</p>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-4">
              {/* Star rating */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">How are you finding RAGaii?</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${
                          (hovered || rating) >= star
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What's working? What could be better?"
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none transition-shadow"
              />

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Send feedback
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trigger button — always in DOM, never blocks clicks when closed */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg flex items-center justify-center pointer-events-auto transition-all duration-200 ${
          isOpen
            ? "bg-gray-700 hover:bg-gray-800"
            : "bg-purple-700 hover:bg-purple-800 hover:scale-110"
        }`}
        aria-label={isOpen ? "Close feedback" : "Share feedback"}
      >
        {isOpen
          ? <X className="h-5 w-5 text-white" />
          : <MessageSquare className="h-5 w-5 text-white" />
        }
      </button>
    </>
  );
}
