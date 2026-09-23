import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api.js';

const API_BASE = API_URL;

/**
 * AI Viva Interview Examiner Modal
 * Conducts adaptive oral/written interview testing conceptual and practical depth.
 */
export default function AiInterviewModal({
  lessonId,
  subjectId,
  onClose,
  onMasteryAchieved
}) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/v1/costudy/interview/${lessonId}`);
        const data = await res.json();
        if (data.success && data.questions) {
          setQuestions(data.questions);
          // Initialize answer map
          const initial = {};
          data.questions.forEach((q) => {
            initial[q.id] = '';
          });
          setAnswers(initial);
        }
      } catch (err) {
        console.error('Failed to load viva questions:', err);
      } finally {
        setLoading(false);
      }
    }

    if (lessonId) {
      loadQuestions();
    }
  }, [lessonId]);

  const handleAnswerChange = (qId, val) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSubmitInterview = async () => {
    try {
      setEvaluating(true);
      const answerPayload = questions.map((q) => ({
        id: q.id,
        answer: answers[q.id] || ''
      }));

      const res = await fetch(`${API_BASE}/api/v1/costudy/interview/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          lessonId,
          answers: answerPayload
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
        if (data.passed && onMasteryAchieved) {
          onMasteryAchieved(data);
        }
      }
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cs-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>🤖</span>
            <div>
              <div className="cs-modal-title">AI Faculty Viva Examination</div>
              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>
                Oral & Conceptual Defense • Passing Grade: 60%
              </div>
            </div>
          </div>
          <button className="cs-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="cs-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', fontWeight: 800 }}>
              Connecting to AI Evaluation Proctor...
            </div>
          ) : result ? (
            /* Results View */
            <div className="cs-viva-result-box">
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>
                {result.passed ? '🎖️' : '📚'}
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 8px 0' }}>
                {result.passed ? 'VIVA DEFENSE PASSED!' : 'FURTHER STUDY RECOMMENDED'}
              </h2>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: result.passed ? '#2E7D32' : '#C62828', marginBottom: '12px' }}>
                Mastery Score: {result.totalScore} / 100
              </div>
              <p style={{ maxWidth: '500px', margin: '0 auto 20px auto', fontSize: '0.9rem', color: '#444' }}>
                {result.feedback}
              </p>

              {/* Per question review */}
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {result.questionResults?.map((qr, idx) => (
                  <div key={idx} className="cs-test-case-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontWeight: 800 }}>Question {idx + 1} ({qr.score}/100)</span>
                      <span style={{ color: qr.score >= 60 ? '#2E7D32' : '#C62828', fontWeight: 800 }}>
                        {qr.score >= 60 ? 'Strong Defense' : 'Needs Terminology'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#555' }}>{qr.feedback}</div>
                  </div>
                ))}
              </div>

              {result.passed ? (
                <button
                  className="cs-viva-submit-btn"
                  style={{ background: '#CCFF00', color: '#0B0B0B', marginTop: '20px', alignSelf: 'center' }}
                  onClick={onClose}
                >
                  Claim Node Mastery & Unlock Next Landmark →
                </button>
              ) : (
                <button
                  className="cs-viva-submit-btn"
                  style={{ marginTop: '20px', alignSelf: 'center' }}
                  onClick={() => setResult(null)}
                >
                  Retry Oral Defense
                </button>
              )}
            </div>
          ) : (
            /* Questions View */
            <>
              <div style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.4 }}>
                Answer the following viva questions to demonstrate your conceptual reasoning and structural understanding. Our AI evaluator analyzes technical accuracy, keywords, and practical context.
              </div>

              {questions.map((q, idx) => (
                <div key={q.id} className="cs-interview-question-box">
                  <div className="cs-viva-prompt">
                    <span style={{ color: '#FF3366', marginRight: '6px' }}>Q{idx + 1}.</span>
                    {q.question || q.prompt}
                  </div>
                  <textarea
                    className="cs-viva-textarea"
                    placeholder="Provide your technical explanation here..."
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  />
                </div>
              ))}

              <button
                className="cs-viva-submit-btn"
                disabled={evaluating}
                onClick={handleSubmitInterview}
              >
                {evaluating ? 'Proctor is Evaluating...' : 'Submit Answers for Viva Defense →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
