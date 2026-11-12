import React, { useEffect, useState } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { ThreePaneLayout } from './components/layout/ThreePaneLayout';
import { StatusBar } from './components/layout/StatusBar';
import { SourceEditorPane } from './components/editor/SourceEditorPane';
import { SuggestionPane } from './components/suggestions/SuggestionPane';
import { ResultPreviewPane } from './components/preview/ResultPreviewPane';
import { SettingsModal } from './components/modals/SettingsModal';
import { RuleManagerModal } from './components/modals/RuleManagerModal';
import { ExportModal } from './components/modals/ExportModal';
import { ApplyAllModal } from './components/modals/ApplyAllModal';
import { Toast } from './components/ui/Toast';
import { editorStore } from './core/state/editorStore';
import { rulesStore } from './core/state/rulesStore';
import { settingsStore } from './core/state/settingsStore';
import { styleStore } from './core/state/styleStore';

export const App: React.FC = () => {
  const [, setTick] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isApplyAllOpen, setIsApplyAllOpen] = useState(false);

  useEffect(() => {
    // Subscribe to state updates
    const unSubEditor = editorStore.subscribe(() => setTick((t) => t + 1));
    const unSubRules = rulesStore.subscribe(() => setTick((t) => t + 1));
    const unSubSettings = settingsStore.subscribe(() => setTick((t) => t + 1));

    // Initial fetch of persisted rules & settings
    // Re-check once everything that influences the check (language, suppressed rules, learned words) is loaded.
    Promise.all([settingsStore.load(), styleStore.load(), rulesStore.fetchAll()]).then(() => {
      editorStore.refreshAllIssues();
    });

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Let text inputs keep their native undo/redo.
      const inInput = e.target instanceof HTMLInputElement;

      if (isCmdOrCtrl && (e.key === 'z' || e.key === 'y') && inInput) {
        return;
      }

      if (isCmdOrCtrl && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          editorStore.redo();
        } else {
          editorStore.undo();
        }
      } else if (isCmdOrCtrl && e.key === 'y') {
        e.preventDefault();
        editorStore.redo();
      } else if (isCmdOrCtrl && e.key === 's') {
        e.preventDefault();
        editorStore.saveCurrentDocument();
      } else if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsRulesOpen(false);
        setIsExportOpen(false);
        setIsApplyAllOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unSubEditor();
      unSubRules();
      unSubSettings();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const state = editorStore.getState;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <AppHeader
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenApplyAll={() => setIsApplyAllOpen(true)}
      />

      {/* Main 3-Pane Editor */}
      <ThreePaneLayout
        leftPane={<SourceEditorPane />}
        centerPane={<SuggestionPane />}
        rightPane={<ResultPreviewPane onOpenExport={() => setIsExportOpen(true)} />}
      />

      {/* Status Bar */}
      <StatusBar />

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <RuleManagerModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
      <ApplyAllModal
        isOpen={isApplyAllOpen}
        onClose={() => setIsApplyAllOpen(false)}
      />

      {/* Success & Error Feedback Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 max-w-md">
        <Toast
          stacked
          message={state.successMessage}
          type="success"
          onDismiss={() => editorStore.clearSuccess()}
        />
        <Toast
          stacked
          message={state.error}
          type="error"
          onDismiss={() => editorStore.clearError()}
          onRetry={state.errorSource === 'rewrite' ? () => editorStore.generateRewritesForSelected() : undefined}
        />
      </div>
    </div>
  );
};

export default App;
