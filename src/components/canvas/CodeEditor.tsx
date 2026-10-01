import Editor from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import { Download, Copy, AlertCircle, CheckCircle, RadioTower } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  syncStatus: 'synced' | 'code-only' | 'error';
  errors: Array<{ line: number; code: string; message: string }>;
  onSync: () => void;
}

export function CodeEditor({ code, onChange, syncStatus, errors, onSync }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [theme, setTheme] = useState('vs');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'vs-dark' : 'vs');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'vs-dark' : 'vs');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const monaco = editorRef.current.getMonaco();
      const model = editorRef.current.getModel();
      if (model) {
        const markers = errors.map(e => ({
          startLineNumber: e.line,
          startColumn: 1,
          endLineNumber: e.line,
          endColumn: 100,
          message: e.message,
          severity: monaco.MarkerSeverity.Error,
        }));
        monaco.editor.setModelMarkers(model, 'qiskit', markers);
      }
    }
  }, [errors]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = { editor, monaco };

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
  };

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
            onClick={() => navigator.clipboard.writeText(code)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Copy code"
          >
            <Copy className="w-4 h-4 inline mr-1" />
            Copy
          </button>
          <button
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Export QASM (stub)"
          >
            <Download className="w-4 h-4 inline mr-1" />
            QASM
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="qiskit"
          theme={theme}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="p-3 border-t border-gray-100 bg-danger/5 max-h-32 overflow-y-auto">
          <div className="flex items-center gap-2 text-sm text-danger mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
          </div>
          <ul className="space-y-1 text-label">
            {errors.map((e, idx) => (
              <li key={idx} className="font-mono text-danger">
                Line {e.line}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}