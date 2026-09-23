import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../../config/api.js';

const API_BASE = API_URL;

/**
 * Live Interactive Code Sandbox & Automated Test Runner
 * Provides real DOM preview iframe and problem evaluation.
 */
export default function CodeSandbox({
  initialCode = '',
  activeProblem = null,
  onTestPassed = null
}) {
  const [code, setCode] = useState(initialCode);
  const [previewDoc, setPreviewDoc] = useState(initialCode);
  const [testResults, setTestResults] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'editor', 'preview'

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      setPreviewDoc(initialCode);
    }
  }, [initialCode]);

  // Update preview on manual trigger or debounced edit
  const handleRunCode = () => {
    setPreviewDoc(code);
  };

  // Run automated problem test suite
  const handleRunTests = async () => {
    if (!activeProblem) return;
    try {
      setEvaluating(true);
      const res = await fetch(`${API_BASE}/api/v1/costudy/problems/${activeProblem.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        setTestResults(data);
        if (data.passed && onTestPassed) {
          onTestPassed(activeProblem.id, data.score);
        }
      } else {
        setTestResults({ passed: false, error: data.error });
      }
    } catch (err) {
      console.error('Test run failed:', err);
      setTestResults({ passed: false, error: 'Failed to run test runner.' });
    } finally {
      setEvaluating(false);
    }
  };

  const handleResetCode = () => {
    if (activeProblem?.starter_code) {
      setCode(activeProblem.starter_code);
      setPreviewDoc(activeProblem.starter_code);
    }
    setTestResults(null);
  };

  return (
    <div className="cs-sandbox-container">
      {/* Sandbox Toolbar */}
      <div className="cs-sandbox-toolbar">
        <div className="cs-sandbox-tabs">
          <button
            className={`cs-sandbox-tab ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            Split View
          </button>
          <button
            className={`cs-sandbox-tab ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={() => setViewMode('editor')}
          >
            Code Only
          </button>
          <button
            className={`cs-sandbox-tab ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
          >
            Browser Preview
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleResetCode}
            style={{
              background: '#FFF',
              border: '1.5px solid #0B0B0B',
              borderRadius: '4px',
              padding: '5px 10px',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            ↺ Reset
          </button>

          <button
            className="cs-sandbox-run-btn"
            onClick={handleRunCode}
            style={{ background: '#FFFDE7' }}
          >
            ▶ Run Preview
          </button>

          {activeProblem && (
            <button
              className="cs-sandbox-run-btn"
              onClick={handleRunTests}
              disabled={evaluating}
            >
              {evaluating ? 'Evaluating...' : '✓ Submit & Test Code'}
            </button>
          )}
        </div>
      </div>

      {/* Editor & Preview Split Workspace */}
      <div className="cs-sandbox-editor-split">
        {(viewMode === 'split' || viewMode === 'editor') && (
          <div className="cs-code-editor-area">
            <textarea
              className="cs-code-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write your HTML and CSS markup here..."
              spellCheck={false}
            />
          </div>
        )}

        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className="cs-preview-frame-area">
            <div className="cs-preview-header">
              <span>LIVE BROWSER DOM PREVIEW (SANDBOXED IFRAME)</span>
              <span style={{ color: '#2E7D32' }}>● READY</span>
            </div>
            <iframe
              className="cs-preview-iframe"
              title="DOM Preview"
              srcDoc={previewDoc}
              sandbox="allow-scripts"
            />
          </div>
        )}
      </div>

      {/* Test Execution Results Tray */}
      {testResults && (
        <div
          style={{
            background: testResults.passed ? '#F1F8E9' : '#FFEBEE',
            borderTop: '2.5px solid #0B0B0B',
            padding: '12px 18px',
            maxHeight: '180px',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: testResults.passed ? '#2E7D32' : '#C62828' }}>
              {testResults.passed ? '🎉 ALL TEST CASES PASSED!' : '❌ TEST SUITE FAILED'}
            </span>
            <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>
              Score: {testResults.score} / {activeProblem?.points || 25} XP
            </span>
          </div>

          {testResults.testResults?.map((t) => (
            <div key={t.id} className="cs-test-case-item">
              <span style={{ fontWeight: 600 }}>{t.description}</span>
              <span className={t.passed ? 'cs-test-pass' : 'cs-test-fail'}>
                {t.passed ? '✓ PASS' : '✗ FAIL'}
              </span>
            </div>
          ))}

          {testResults.error && (
            <div style={{ color: '#C62828', fontSize: '0.8rem', marginTop: '6px' }}>
              {testResults.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
