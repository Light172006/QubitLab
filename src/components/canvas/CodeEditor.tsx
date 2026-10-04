import Editor from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import { Download, Copy, AlertCircle, CheckCircle, RadioTower, Info } from 'lucide-react';
import { ErrorBoundary } from '../common/ErrorBoundary';

// qubitlab-light custom theme definition
const QUBITLAB_LIGHT_THEME = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '#111827', background: '#FFFFFF' }, // body text
    { token: 'comment', foreground: '#4B5563' }, // comments
    { token: 'keyword', foreground: '#1F497D' }, // keywords (from, import, h, x, etc.)
    { token: 'type', foreground: '#1F497D' }, // QuantumCircuit
    { token: 'number', foreground: '#0070C0' }, // numbers
    { token: 'delimiter', foreground: '#4B5563' }, // brackets, parens, commas
    { token: 'string', foreground: '#0550AE' }, // strings
    { token: 'operator', foreground: '#4B5563' }, // =, .
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#111827',
    'editor.lineHighlightBackground': '#F3F4F6',
    'editorLineNumber.foreground': '#9CA3AF',
    'editorLineNumber.activeForeground': '#111827',
    'editorCursor.foreground': '#1F497D',
    'editor.selectionBackground': '#DBEAFE',
    'editor.selectionHighlightBackground': '#BFDBFE',
    'editor.wordHighlightBackground': '#E5E7EB',
    'editor.findMatchBackground': '#FEF3C7',
    'editor.findMatchHighlightBackground': '#FDE68A',
    'editorError.foreground': '#A93A37',
    'editorWarning.foreground': '#92400E',
    'editorInfo.foreground': '#1F497D',
    'minimap.errorHighlight': '#A93A37',
    'minimap.warningHighlight': '#92400E',
    'scrollbarSlider.background': '#D1D5DB',
    'scrollbarSlider.hoverBackground': '#9CA3AF',
    'scrollbarSlider.activeBackground': '#6B7280',
  },
} as const;

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  syncStatus: 'synced' | 'code-only' | 'error';
  errors: Array<{ line: number; code: string; message: string }>;
  onSync: () => void;
}

export function CodeEditor({ code, onChange, syncStatus, errors, onSync }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const theme = 'qubitlab-light';
  const [monacoMounted, setMonacoMounted] = useState(false);
  const [fallbackActive, setFallbackActive] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    // Could add toast here if needed
  };

  const handleQasm = () => {
    // Simple QASM generation from Qiskit code
    const qasm = code
      .split('\n')
      .filter(line => line.trim().startsWith('qc.'))
      .map(line => {
        const match = line.trim().match(/qc\.(\w+)\(([^)]*)\)/);
        if (!match) return '';
        const [, method, args] = match;
        const qasmMethod = method === 'cx' ? 'cx' : method === 'cz' ? 'cz' : method;
        return `${qasmMethod} ${args.replace(/\s+/g, '')};`;
      })
      .filter(Boolean)
      .join('\n');
    const fullQasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[${code.match(/QuantumCircuit\((\d+)/)?.[1] || 2}];\n${qasm}`;
    navigator.clipboard.writeText(fullQasm);
  };

  const hasContent = code.trim().length > 0;

  // Parse errors become Monaco markers on the line they name. The session
  // (editor, monaco, model) is captured on mount: the component ref does
  // not expose getMonaco()/getModel().
  useEffect(() => {
    const session = editorRef.current;
    if (session?.model) {
      const markers = errors.map((e) => ({
        startLineNumber: e.line,
        startColumn: 1,
        endLineNumber: e.line,
        endColumn: 100,
        message: e.message,
        severity: session.monaco.MarkerSeverity.Error,
      }));
      session.monaco.editor.setModelMarkers(session.model, 'qiskit', markers);
    }
  }, [errors]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = { editor, monaco, model: editor.getModel?.() ?? null };
    setMonacoMounted(true);

    // Register custom theme
    monaco.editor.defineTheme('qubitlab-light', QUBITLAB_LIGHT_THEME);

    // Register Qiskit language
    monaco.languages.register({ id: 'qiskit' });
    monaco.languages.setMonarchTokensProvider('qiskit', {
      tokenizer: {
        root: [
          [/from\s+qiskit\s+import/, 'keyword'],
          [/QuantumCircuit/, 'type'],
          [/\b(h|x|z|s|t|cx|cz|measure)\b/, 'keyword'],
          [/\d+/, 'number'],
          [/[(),[\]]/, 'delimiter'],
          [/#.*$/, 'comment'],
        ],
      },
    });

    // Ctrl/Cmd+Enter to sync
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSync();
    });
  };

  // Fallback timer - swap in a textarea only if Monaco has not mounted
  // within 3s (e.g. the CDN is unreachable).
  useEffect(() => {
    if (monacoMounted) return;
    const timer = setTimeout(() => {
      setFallbackActive(true);
      console.warn('Monaco editor failed to mount within 3s, falling back to textarea');
    }, 3000);
    return () => clearTimeout(timer);
  }, [monacoMounted]);

  return (
    <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text">Code Editor</span>
          <span className={`px-2 py-0.5 text-label font-medium rounded-full ${
            syncStatus === 'synced' ? 'bg-green-tint text-green' :
            syncStatus === 'code-only' ? 'bg-orange-tint text-accent-text-orange' :
            'bg-danger-tint text-danger'
          }`}>
            {syncStatus === 'synced' && <CheckCircle className="w-3 h-3 inline mr-1" />}
            {syncStatus === 'code-only' && <RadioTower className="w-3 h-3 inline mr-1" />}
            {syncStatus === 'error' && <AlertCircle className="w-3 h-3 inline mr-1" />}
            {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1).replace('-', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={syncStatus === 'synced'}
            className="px-3 py-1.5 text-sm bg-navy text-white rounded-lg hover:bg-navy/90 disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed transition-colors"
            title={syncStatus === 'synced' ? 'Canvas already matches this code' : 'Sync to canvas'}
          >
            <RadioTower className="w-4 h-4 inline mr-1" />
            Sync
          </button>
          <button
            onClick={handleCopy}
            disabled={!hasContent}
            className={`px-3 py-1.5 text-sm border border-gray-200 rounded-lg transition-colors ${
              hasContent ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
            }`}
            title={hasContent ? 'Copy code' : 'No code to copy'}
          >
            <Copy className="w-4 h-4 inline mr-1" />
            Copy
          </button>
          <button
            onClick={handleQasm}
            disabled={!hasContent}
            className={`px-3 py-1.5 text-sm border border-gray-200 rounded-lg transition-colors ${
              hasContent ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
            }`}
            title={hasContent ? 'Copy OpenQASM' : 'No code to export'}
          >
            <Download className="w-4 h-4 inline mr-1" />
            QASM
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 relative">
        {fallbackActive ? (
          <textarea
            aria-label="code"
            className="w-full h-full p-4 font-mono text-sm text-text bg-white border-0 resize-none focus:outline-none"
            value={code}
            onChange={(e) => handleEditorChange(e.target.value)}
            placeholder="Editor unavailable (basic mode)"
            spellCheck={false}
          />
        ) : (
          <ErrorBoundary
            fallback={() => (
              <textarea
                aria-label="code"
                className="w-full h-full p-4 font-mono text-sm text-text bg-white border-0 resize-none focus:outline-none"
                value={code}
                onChange={(e) => handleEditorChange(e.target.value)}
                placeholder="Editor unavailable (basic mode)"
                spellCheck={false}
              />
            )}
          >
            <Editor
              height="100%"
              defaultLanguage="qiskit"
              theme={theme}
              value={code}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'off',
                renderLineHighlight: 'line',
                padding: { top: 12, bottom: 12 },
                renderWhitespace: 'selection',
              }}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-label font-medium rounded-full ${
            syncStatus === 'synced' ? 'bg-green-tint text-green' :
            syncStatus === 'code-only' ? 'bg-orange-tint text-accent-text-orange' :
            'bg-danger-tint text-danger'
          }`}>
            {syncStatus === 'synced' && <CheckCircle className="w-2.5 h-2.5 inline mr-1" />}
            {syncStatus === 'code-only' && <Info className="w-2.5 h-2.5 inline mr-1" />}
            {syncStatus === 'error' && <AlertCircle className="w-2.5 h-2.5 inline mr-1" />}
            {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1).replace('-', ' ')}
          </span>
          <span className="text-muted" aria-live="polite">
            {syncStatus === 'synced' && 'Canvas matches code'}
            {syncStatus === 'code-only' && 'Uses features outside the canvas subset'}
            {syncStatus === 'error' && errors.length > 0 && `Line ${errors[0].line}: ${errors[0].message}`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-muted">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+Enter</kbd>
          <span>Sync</span>
        </div>
      </div>
    </div>
  );
}
