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
import { actionForCombo, effectiveShortcuts, emitShortcut, eventToCombo } from './core/shortcuts';
import { TauriBridge } from './core/bridge/tauriBridge';

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

    // Keyboard shortcuts (user-configurable in Settings)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsRulesOpen(false);
        setIsExportOpen(false);
        setIsApplyAllOpen(false);
        return;
      }

      const combo = eventToCombo(e);
      if (!combo) return;
      const action = actionForCombo(effectiveShortcuts(settingsStore.state.shortcuts), combo);
      if (!action) return;

      // Let text inputs keep their native undo/redo.
      if ((action === 'undo' || action === 'redo') && e.target instanceof HTMLInputElement) return;

      e.preventDefault();
      switch (action) {
        case 'save': editorStore.saveCurrentDocument(); break;
        case 'undo': editorStore.undo(); break;
        case 'redo': editorStore.redo(); break;
        case 'export': setIsExportOpen(true); break;
        case 'applyAll': setIsApplyAllOpen(true); break;
        case 'openSettings': setIsSettingsOpen(true); break;
        case 'generateRewrites': editorStore.generateRewritesForSelected(); break;
        default: emitShortcut(action); // open, newDocument, toggleRaw: handled by their components
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

  // System-wide summon hotkey: re-register whenever the saved combo changes.
  const summonCombo = effectiveShortcuts(settingsStore.state.shortcuts).summon;
  useEffect(() => {
    let active = true;
    TauriBridge.setSummonShortcut(summonCombo).catch((err: any) => {
      if (active) editorStore.showError(`Could not register the system-wide shortcut: ${err?.message || err}`);
    });
    return () => {
      active = false;
    };
  }, [summonCombo]);

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
