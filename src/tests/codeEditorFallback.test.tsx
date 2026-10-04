import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

let autoMount = false;

const fakeModel = { id: 'model-1' };
const fakeEditor = { addCommand: vi.fn(), getModel: vi.fn(() => fakeModel) };
const fakeMonaco = {
  KeyMod: { CtrlCmd: 2048 },
  KeyCode: { Enter: 3 },
  editor: { defineTheme: vi.fn(), setModelMarkers: vi.fn() },
  languages: { register: vi.fn(), setMonarchTokensProvider: vi.fn() },
  MarkerSeverity: { Error: 8 },
};

vi.mock('@monaco-editor/react', () => ({
  default: (props: any) => {
    if (autoMount) props.onMount(fakeEditor, fakeMonaco);
    return <div data-testid="monaco" />;
  },
}));

import { CodeEditor } from '../components/canvas/CodeEditor';

function renderEditor(code = 'qc.h(0)') {
  return render(
    <CodeEditor code={code} onChange={vi.fn()} syncStatus="synced" errors={[]} onSync={vi.fn()} />
  );
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  autoMount = false;
  fakeEditor.addCommand.mockClear();
  fakeMonaco.editor.setModelMarkers.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CodeEditor fallback', () => {
  it('waits for Monaco instead of showing the textarea immediately', () => {
    renderEditor();
    expect(screen.getByTestId('monaco')).toBeTruthy();
    expect(screen.queryByLabelText('code')).toBeNull();
  });

  it('falls back to a textarea when Monaco has not mounted within 3s', async () => {
    renderEditor('qc.h(0)');

    await advance(2999);
    expect(screen.queryByLabelText('code')).toBeNull();

    await advance(1);
    const textarea = screen.getByLabelText('code') as HTMLTextAreaElement;
    expect(textarea.value).toBe('qc.h(0)');
  });

  it('keeps the editor in basic mode off when Monaco mounts', async () => {
    autoMount = true;
    const onSync = vi.fn();
    render(
      <CodeEditor
        code="qc.h(0)"
        onChange={vi.fn()}
        syncStatus="code-only"
        errors={[]}
        onSync={onSync}
      />
    );

    await advance(5000);
    expect(screen.queryByLabelText('code')).toBeNull();
    expect(fakeEditor.addCommand).toHaveBeenCalled();
  });

  it('pushes error line markers into the mounted model', () => {
    autoMount = true;
    const onSync = vi.fn();
    const { rerender } = render(
      <CodeEditor
        code="qc.h(0)"
        onChange={vi.fn()}
        syncStatus="error"
        errors={[{ line: 2, code: 'E1', message: 'Unknown gate' }]}
        onSync={onSync}
      />
    );
    rerender(
      <CodeEditor
        code="qc.h(0)"
        onChange={vi.fn()}
        syncStatus="error"
        errors={[{ line: 2, code: 'E1', message: 'Unknown gate' }]}
        onSync={onSync}
      />
    );

    const calls = fakeMonaco.editor.setModelMarkers.mock.calls;
    const last = calls[calls.length - 1] as [unknown, string, any[]];
    expect(last[0]).toBe(fakeModel);
    expect(last[1]).toBe('qiskit');
    expect(last[2]).toHaveLength(1);
    expect(last[2][0]).toMatchObject({
      startLineNumber: 2,
      message: 'Unknown gate',
      severity: fakeMonaco.MarkerSeverity.Error,
    });
  });

  it('syncs on Ctrl/Cmd+Enter from the mounted editor', () => {
    autoMount = true;
    const onSync = vi.fn();
    render(
      <CodeEditor
        code="qc.h(0)"
        onChange={vi.fn()}
        syncStatus="code-only"
        errors={[]}
        onSync={onSync}
      />
    );

    const calls = fakeEditor.addCommand.mock.calls;
    const [, handler] = calls[calls.length - 1] as [number, () => void];
    expect(handler).toBeTypeOf('function');
    handler();
    expect(onSync).toHaveBeenCalledTimes(1);
  });
});
