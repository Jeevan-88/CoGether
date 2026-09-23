import React, { useState, useEffect } from 'react';
import CodeSandbox from './CodeSandbox';
import AiInterviewModal from './AiInterviewModal';
import { API_URL } from '../../../config/api.js';

const API_BASE = API_URL;

const STEPS = [
  { id: 'LEARN', label: '1. Learn', icon: '📖' },
  { id: 'VISUALIZE', label: '2. Visualize', icon: '👁️' },
  { id: 'INTERACT', label: '3. Interact', icon: '⚡' },
  { id: 'PRACTICE', label: '4. Practice', icon: '✍️' },
  { id: 'PROBLEMS', label: '5. Problems (4)', icon: '🧩' },
  { id: 'QUEST', label: '6. Quest Brief', icon: '🛡️' },
  { id: 'SANDBOX', label: '7. Sandbox', icon: '💻' },
  { id: 'AI_TUTOR', label: '8. AI Tutor', icon: '🤖' },
  { id: 'INTERVIEW', label: '9. Viva Defense', icon: '🎙️' },
  { id: 'MASTERY', label: '10. Mastery', icon: '🏆' }
];

export default function LessonStage({
  nodeId,
  subject,
  onNodeComplete,
  onBackToRoadmap
}) {
  const [nodeData, setNodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState('LEARN');
  const [completedSteps, setCompletedSteps] = useState(new Set(['LEARN']));

  // Problem tracker
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const [solvedProblems, setSolvedProblems] = useState(new Set());

  // Interactive toggle state (Step 3)
  const [interactiveMode, setInteractiveMode] = useState('semantic');

  // AI Viva modal state
  const [showVivaModal, setShowVivaModal] = useState(false);
  const [vivaPassed, setVivaPassed] = useState(false);

  // AI Tutor chat state
  const [tutorMessages, setTutorMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello Engineer! I am your AI Faculty Tutor for HTML Architecture. Ask me anything about document anatomy, semantic structure, or test case debugging!'
    }
  ]);
  const [tutorInput, setTutorInput] = useState('');

  useEffect(() => {
    async function loadNode() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/v1/costudy/nodes/${nodeId}`);
        const data = await res.json();
        if (data.success) {
          setNodeData(data);
        }
      } catch (err) {
        console.error('Failed to load node details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (nodeId) {
      loadNode();
    }
  }, [nodeId]);

  const markStepDone = (stepId) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
  };

  const handleProblemPassed = (probId, score) => {
    setSolvedProblems((prev) => {
      const next = new Set([...prev, probId]);
      if (next.size >= (nodeData?.problems?.length || 4)) {
        markStepDone('PROBLEMS');
      }
      return next;
    });
  };

  const handleVivaSuccess = (evalResult) => {
    setVivaPassed(true);
    markStepDone('INTERVIEW');
    markStepDone('MASTERY');
    setActiveStep('MASTERY');

    // Notify backend
    fetch(`${API_BASE}/api/v1/costudy/nodes/${nodeId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'COMPLETED',
        score: 100,
        masteryPct: 100
      })
    }).catch((e) => console.error(e));

    if (onNodeComplete) {
      onNodeComplete(nodeId, evalResult);
    }
  };

  const handleSendTutor = () => {
    if (!tutorInput.trim()) return;
    const userQ = tutorInput.trim();
    setTutorMessages((prev) => [...prev, { role: 'user', text: userQ }]);
    setTutorInput('');

    // Pre-computed intelligent tutoring responses for key HTML concepts
    setTimeout(() => {
      let reply = "Great question! In modern web engineering, valid semantic structures ensure accessibility across screen readers, optimal search engine crawlability, and maintainable component architectures.";
      const lower = userQ.toLowerCase();
      if (lower.includes('doctype') || lower.includes('<!doctype')) {
        reply = "<!DOCTYPE html> instructs the browser to render the document in 'Standards Mode' rather than legacy Quirks Mode, ensuring consistent cross-browser CSS box-model interpretation.";
      } else if (lower.includes('semantic') || lower.includes('div')) {
        reply = "While a <div> has zero inherent meaning, semantic elements like <header>, <nav>, <main>, <article>, and <footer> convey semantic landmarks directly to browser accessibility APIs and search crawlers.";
      } else if (lower.includes('meta') || lower.includes('viewport')) {
        reply = "<meta name='viewport' content='width=device-width, initial-scale=1.0'> is crucial for responsive design; without it, mobile browsers will assume a fixed 980px desktop canvas and zoom out.";
      }
      setTutorMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    }, 600);
  };

  if (loading) {
    return (
      <div className="cs-lesson-stage" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>Loading Learning Stage...</div>
      </div>
    );
  }

  const { node, lesson, problems = [], quest } = nodeData || {};
  const currentProblem = problems[activeProblemIndex] || problems[0];

  return (
    <div className="cs-lesson-stage">
      {/* 10-Step Progress Stepper Ribbon */}
      <div className="cs-stepper-ribbon">
        <button
          onClick={onBackToRoadmap}
          style={{
            background: '#FAF7EE',
            border: '1.5px solid #0B0B0B',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            marginRight: '6px'
          }}
        >
          ← Roadmap
        </button>

        {STEPS.map((s, idx) => {
          const isActive = activeStep === s.id;
          const isDone = completedSteps.has(s.id);

          return (
            <div
              key={s.id}
              className={`cs-step-tab ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => setActiveStep(s.id)}
            >
              <span className="cs-step-number">{idx + 1}</span>
              <span>{s.icon} {s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Main Content Area based on Step */}
      <div className="cs-stage-body">
        {/* STEP 1: LEARN (Editorial Theory Article) */}
        {activeStep === 'LEARN' && (
          <div className="cs-stage-split-left" style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div className="cs-lesson-article">
              <span className="cs-quest-tag">STEP 01 / CONCEPTUAL STUDY</span>
              <h1>{lesson?.title || node?.title}</h1>
              <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 700, marginBottom: '20px' }}>
                Estimated Study Time: ~{lesson?.reading_time_minutes || 8} minutes • Practical Architecture
              </div>

              {/* Key Takeaways Card */}
              <div className="cs-lesson-takeaway-card">
                <h3>⚡ Key Architectural Takeaways</h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {lesson?.key_takeaways?.map((t, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{t}</li>
                  ))}
                </ul>
              </div>

              <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#222' }}>
                <p>
                  At the core of the World Wide Web is the <strong>HyperText Markup Language (HTML)</strong>.
                  HTML is not a programming language with execution loops; it is a declarative structural document schema.
                  It instructs user agents—such as web browsers, screen readers, web scrapers, and accessibility engines—how
                  to parse and construct the in-memory <strong>Document Object Model (DOM)</strong> tree.
                </p>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: '24px' }}>
                  The Standards-Compliant Document Anatomy
                </h3>
                <p>
                  Every valid modern web document begins with the <code>&lt;!DOCTYPE html&gt;</code> preamble, signaling HTML5 standards.
                  Within the root <code>&lt;html lang="en"&gt;</code> element, two fundamental branches exist:
                </p>
                <ol style={{ paddingLeft: '20px' }}>
                  <li><strong>The &lt;head&gt; (Metadata Room):</strong> Machine-readable metadata, character encoding (UTF-8), viewport constraints, and document title. Nothing inside the head is painted directly to the browser screen.</li>
                  <li><strong>The &lt;body&gt; (Rendered Canvas):</strong> The user-facing tree of elements painted onto the screen and navigated by human eyes and accessibility devices.</li>
                </ol>

                <div className="cs-code-snippet">
{`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Enterprise Portal</title>
  </head>
  <body>
    <header>
      <h1>Document Engineering</h1>
    </header>
    <main>
      <p>Semantic document architecture in action.</p>
    </main>
  </body>
</html>`}
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="cs-node-action-btn"
                  onClick={() => {
                    markStepDone('LEARN');
                    setActiveStep('VISUALIZE');
                  }}
                >
                  Proceed to Step 2: Visualize Tree →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: VISUALIZE (Interactive DOM Tree Diagram) */}
        {activeStep === 'VISUALIZE' && (
          <div className="cs-stage-split-left" style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div className="cs-lesson-article">
              <span className="cs-quest-tag">STEP 02 / DOM VISUALIZATION</span>
              <h1>Interactive Document Object Model (DOM) Tree</h1>
              <p style={{ color: '#444' }}>
                When the browser parser reads your HTML markup byte-by-byte, it tokens each tag and constructs a node hierarchy:
              </p>

              <div
                style={{
                  background: '#FAF7EE',
                  border: '2.5px solid #0B0B0B',
                  borderRadius: '8px',
                  padding: '24px',
                  margin: '20px 0',
                  boxShadow: '4px 4px 0 #0B0B0B'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                  <div style={{ background: '#0B0B0B', color: '#CCFF00', padding: '6px 16px', borderRadius: '4px', fontWeight: 900 }}>
                    Document Root: &lt;html lang="en"&gt;
                  </div>
                  <div style={{ width: '2px', height: '20px', background: '#0B0B0B' }} />
                  <div style={{ display: 'flex', gap: '60px' }}>
                    {/* Head Branch */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: '#FF3366', color: '#FFF', padding: '6px 14px', borderRadius: '4px', fontWeight: 800 }}>
                        &lt;head&gt; (Metadata)
                      </div>
                      <div style={{ fontSize: '0.75rem', background: '#FFF', border: '1px solid #0B0B0B', padding: '4px 8px', borderRadius: '4px' }}>
                        &lt;meta charset="UTF-8"&gt;
                      </div>
                      <div style={{ fontSize: '0.75rem', background: '#FFF', border: '1px solid #0B0B0B', padding: '4px 8px', borderRadius: '4px' }}>
                        &lt;meta name="viewport"&gt;
                      </div>
                      <div style={{ fontSize: '0.75rem', background: '#FFF', border: '1px solid #0B0B0B', padding: '4px 8px', borderRadius: '4px' }}>
                        &lt;title&gt;Page Title&lt;/title&gt;
                      </div>
                    </div>

                    {/* Body Branch */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: '#CCFF00', color: '#0B0B0B', padding: '6px 14px', borderRadius: '4px', fontWeight: 900, border: '1.5px solid #0B0B0B' }}>
                        &lt;body&gt; (Render Canvas)
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ fontSize: '0.75rem', background: '#FFF', border: '1px solid #0B0B0B', padding: '4px 8px', borderRadius: '4px' }}>
                          &lt;header&gt;
                        </div>
                        <div style={{ fontSize: '0.75rem', background: '#FFF', border: '1px solid #0B0B0B', padding: '4px 8px', borderRadius: '4px' }}>
                          &lt;main&gt;
                        </div>
                        <div style={{ fontSize: '0.75rem', background: '#FFF', border: '1px solid #0B0B0B', padding: '4px 8px', borderRadius: '4px' }}>
                          &lt;footer&gt;
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  className="cs-node-action-btn"
                  onClick={() => {
                    markStepDone('VISUALIZE');
                    setActiveStep('INTERACT');
                  }}
                >
                  Proceed to Step 3: Interactive Sandbox →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INTERACT (Semantic vs Non-Semantic Toggle) */}
        {activeStep === 'INTERACT' && (
          <div className="cs-stage-split-left" style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div className="cs-lesson-article">
              <span className="cs-quest-tag">STEP 03 / INTERACTIVE SIMULATOR</span>
              <h1>Semantic HTML vs Non-Semantic "Div Soup"</h1>
              <p style={{ color: '#444' }}>
                Toggle between modern Semantic tags and old-school div soup to see how accessibility engines and screen readers perceive your layout:
              </p>

              <div style={{ display: 'flex', gap: '10px', margin: '16px 0' }}>
                <button
                  className={`cs-sandbox-tab ${interactiveMode === 'semantic' ? 'active' : ''}`}
                  onClick={() => setInteractiveMode('semantic')}
                >
                  ✓ Modern Semantic Markup
                </button>
                <button
                  className={`cs-sandbox-tab ${interactiveMode === 'divs' ? 'active' : ''}`}
                  onClick={() => setInteractiveMode('divs')}
                >
                  ✗ Legacy "Div Soup"
                </button>
              </div>

              {interactiveMode === 'semantic' ? (
                <div style={{ background: '#E8F5E9', border: '2px solid #2E7D32', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontWeight: 900, color: '#2E7D32', marginBottom: '8px' }}>
                    Accessibility Score: 100 / 100 • Clean Landmark Structure
                  </div>
                  <div className="cs-code-snippet">
{`<header>
  <nav><a href="/">Home</a></nav>
</header>
<main>
  <article>
    <h1>Clean Semantic Web</h1>
  </article>
</main>
<footer>© 2026 CoGether</footer>`}
                  </div>
                </div>
              ) : (
                <div style={{ background: '#FFEBEE', border: '2px solid #C62828', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontWeight: 900, color: '#C62828', marginBottom: '8px' }}>
                    Accessibility Score: 25 / 100 • Zero Screen Reader Landmarks Found
                  </div>
                  <div className="cs-code-snippet">
{`<div class="header">
  <div class="nav"><a href="/">Home</a></div>
</div>
<div class="content">
  <div class="card">
    <div class="title">Div Soup Example</div>
  </div>
</div>
<div class="footer">© 2026 CoGether</div>`}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  className="cs-node-action-btn"
                  onClick={() => {
                    markStepDone('INTERACT');
                    setActiveStep('PRACTICE');
                  }}
                >
                  Proceed to Step 4: Warmup Practice →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PRACTICE (Guided Warmup) */}
        {activeStep === 'PRACTICE' && (
          <div style={{ flex: 1, display: 'flex' }}>
            <div className="cs-stage-split-left">
              <div className="cs-lesson-article">
                <span className="cs-quest-tag">STEP 04 / GUIDED PRACTICE</span>
                <h1>Warmup: Document Construction</h1>
                <p>
                  Before tackling the graded 4 problems, test your skills by constructing a standard document skeleton with an accessible heading and paragraph.
                </p>
                <div className="cs-lesson-takeaway-card">
                  <h3>Goal:</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    Ensure the live browser preview renders your name, an <code>&lt;h1&gt;</code> title, and proper semantic tags.
                  </p>
                </div>
                <button
                  className="cs-node-action-btn"
                  onClick={() => {
                    markStepDone('PRACTICE');
                    setActiveStep('PROBLEMS');
                  }}
                >
                  Ready for Graded Problems →
                </button>
              </div>
            </div>
            <div className="cs-stage-split-right">
              <CodeSandbox
                initialCode={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Warmup Practice</title>
</head>
<body>
  <h1>Welcome to CoStudy World</h1>
  <p>Warm up your HTML skills here.</p>
</body>
</html>`}
              />
            </div>
          </div>
        )}

        {/* STEP 5: 3-4 CODING PROBLEMS (Automated Evaluation) */}
        {activeStep === 'PROBLEMS' && (
          <div style={{ flex: 1, display: 'flex' }}>
            <div className="cs-stage-split-left">
              <div className="cs-problems-accordion">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>
                    Graded Problems ({solvedProblems.size}/{problems.length} Solved)
                  </h2>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#666' }}>
                    Automated Test Suite Runner
                  </span>
                </div>

                {problems.map((prob, idx) => {
                  const isSolved = solvedProblems.has(prob.id);
                  const isCurrent = idx === activeProblemIndex;

                  return (
                    <div
                      key={prob.id}
                      className={`cs-prob-card ${isCurrent ? 'active' : ''} ${isSolved ? 'passed' : ''}`}
                      onClick={() => setActiveProblemIndex(idx)}
                    >
                      <div className="cs-prob-top">
                        <span className="cs-prob-title">
                          Problem {idx + 1}: {prob.title.replace(/^Problem \d+:\s*/, '')}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isSolved ? '#E8F5E9' : '#FAF7EE',
                            color: isSolved ? '#2E7D32' : '#0B0B0B',
                            border: '1px solid #0B0B0B'
                          }}
                        >
                          {isSolved ? '✓ PASSED' : `${prob.points} XP`}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#555', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                        {prob.description}
                      </p>
                      <div style={{ fontSize: '0.72rem', color: '#777', fontWeight: 700 }}>
                        Difficulty: {prob.difficulty} • {prob.test_cases?.length || 2} Test Cases
                      </div>
                    </div>
                  );
                })}

                {solvedProblems.size >= problems.length && (
                  <button
                    className="cs-node-action-btn"
                    style={{ marginTop: '12px' }}
                    onClick={() => {
                      markStepDone('PROBLEMS');
                      setActiveStep('QUEST');
                    }}
                  >
                    All Problems Passed! Proceed to Quest →
                  </button>
                )}
              </div>
            </div>

            {/* Right: Code Sandbox wired to active problem */}
            <div className="cs-stage-split-right">
              {currentProblem && (
                <CodeSandbox
                  key={currentProblem.id}
                  initialCode={currentProblem.starter_code || ''}
                  activeProblem={currentProblem}
                  onTestPassed={handleProblemPassed}
                />
              )}
            </div>
          </div>
        )}

        {/* STEP 6: QUEST BRIEF */}
        {activeStep === 'QUEST' && (
          <div className="cs-stage-split-left" style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div className="cs-lesson-article">
              <span className="cs-quest-tag">STEP 06 / ENTERPRISE SCENARIO</span>
              <h1>{quest?.title || 'Web Design Studio: Enterprise Portal'}</h1>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FF3366', marginBottom: '16px' }}>
                ROLE ASSIGNMENT: {quest?.theme_name || 'Senior Frontend Architect'}
              </div>

              <div className="cs-lesson-takeaway-card">
                <h3>📋 Enterprise Architectural Brief</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {quest?.brief || 'Architect an enterprise document structure adhering to WCAG 2.1 AA accessibility guidelines.'}
                </p>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 900 }}>Key Acceptance Criteria:</h3>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.5, color: '#444' }}>
                {quest?.objective || 'Deliver complete semantic fidelity without obsolete presentation markup.'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  className="cs-node-action-btn"
                  onClick={() => {
                    markStepDone('QUEST');
                    setActiveStep('SANDBOX');
                  }}
                >
                  Open Dedicated Live Sandbox →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: FULL LIVE SANDBOX */}
        {activeStep === 'SANDBOX' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 24px', background: '#FAF7EE', borderBottom: '1.5px solid #0B0B0B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>
                STEP 07 / UNCONSTRAINED DOCUMENT ENGINEERING SANDBOX
              </span>
              <button
                className="cs-node-action-btn"
                onClick={() => {
                  markStepDone('SANDBOX');
                  setActiveStep('AI_TUTOR');
                }}
              >
                Proceed to Step 8: AI Faculty Tutor →
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <CodeSandbox
                initialCode={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Enterprise Document Engineering</title>
</head>
<body>
  <header>
    <h1>Acme Global Architecture</h1>
    <nav><a href="#overview">Overview</a></nav>
  </header>
  <main>
    <article>
      <h2>Semantic Compliance</h2>
      <p>Building high-performance accessible web applications.</p>
    </article>
  </main>
  <footer>
    <p>© 2026 CoGether Engineering</p>
  </footer>
</body>
</html>`}
              />
            </div>
          </div>
        )}

        {/* STEP 8: AI TUTOR */}
        {activeStep === 'AI_TUTOR' && (
          <div className="cs-stage-split-left" style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div className="cs-lesson-article">
              <span className="cs-quest-tag">STEP 08 / 1-ON-1 TUTORING</span>
              <h1>Interactive AI Faculty Tutor</h1>
              <p style={{ color: '#444' }}>
                Ask questions or resolve any confusion with our dedicated engineering mentor before taking your viva examination defense:
              </p>

              <div
                style={{
                  background: '#FFF',
                  border: '2px solid #0B0B0B',
                  borderRadius: '8px',
                  padding: '16px',
                  minHeight: '260px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginBottom: '16px'
                }}
              >
                {tutorMessages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: m.role === 'user' ? '#CCFF00' : '#FAF7EE',
                      border: '1.5px solid #0B0B0B',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      lineHeight: 1.4,
                      fontWeight: 600
                    }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="cs-search-input"
                  style={{ flex: 1, padding: '10px 14px' }}
                  placeholder="e.g. Why should I use <header> instead of <div class='header'>?"
                  value={tutorInput}
                  onChange={(e) => setTutorInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTutor()}
                />
                <button
                  className="cs-node-action-btn"
                  onClick={handleSendTutor}
                >
                  Send
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  className="cs-node-action-btn"
                  onClick={() => {
                    markStepDone('AI_TUTOR');
                    setActiveStep('INTERVIEW');
                    setShowVivaModal(true);
                  }}
                >
                  Proceed to Step 9: AI Viva Defense →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 9: VIVA DEFENSE LAUNCHER */}
        {activeStep === 'INTERVIEW' && (
          <div className="cs-stage-split-left" style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div className="cs-lesson-article" style={{ textAlign: 'center', padding: '48px 36px' }}>
              <span className="cs-quest-tag">STEP 09 / ORAL DEFENSE</span>
              <div style={{ fontSize: '3.5rem', margin: '12px 0' }}>🎙️</div>
              <h1>AI Viva Voce Examination</h1>
              <p style={{ maxWidth: '520px', margin: '0 auto 24px auto', color: '#444' }}>
                Demonstrate your practical and conceptual mastery to our AI evaluator. You will answer 3 core viva questions regarding HTML document architecture and accessibility.
              </p>

              <button
                className="cs-viva-submit-btn"
                style={{ fontSize: '1rem', padding: '12px 28px' }}
                onClick={() => setShowVivaModal(true)}
              >
                {vivaPassed ? 'Review Viva Examination Results' : 'Begin Viva Voce Defense →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 10: MASTERY & UNLOCKS */}
        {activeStep === 'MASTERY' && (
          <div className="cs-stage-split-left" style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div className="cs-lesson-article" style={{ textAlign: 'center', padding: '48px 36px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🏆</div>
              <span className="cs-quest-tag">STEP 10 / MASTERY ACHIEVED</span>
              <h1 style={{ margin: '10px 0' }}>HTML Architecture Mastered!</h1>
              <p style={{ maxWidth: '540px', margin: '0 auto 20px auto', color: '#444', fontSize: '0.95rem' }}>
                Congratulations! You have completed all 10 stages of the learning loop: Theory, Visual DOM parsing, Interactive simulator, 4 Graded Coding Problems, Enterprise Quest, and Viva defense.
              </p>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#CCFF00',
                  border: '2.5px solid #0B0B0B',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  boxShadow: '4px 4px 0 #0B0B0B',
                  marginBottom: '28px'
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>🔓</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>ROADWAY UNLOCKED</div>
                  <div style={{ fontSize: '0.78rem', color: '#333' }}>Path to CSS Building (Web District) is now accessible!</div>
                </div>
              </div>

              <div>
                <button
                  className="cs-node-action-btn"
                  style={{ fontSize: '0.95rem', padding: '10px 24px' }}
                  onClick={onBackToRoadmap}
                >
                  Return to Building Roadmap →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Viva Examination Modal */}
      {showVivaModal && (
        <AiInterviewModal
          lessonId={lesson?.id}
          subjectId={subject?.id}
          onClose={() => setShowVivaModal(false)}
          onMasteryAchieved={handleVivaSuccess}
        />
      )}
    </div>
  );
}
