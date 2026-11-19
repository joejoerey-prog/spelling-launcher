import React from 'react';

export interface ThreePaneLayoutProps {
  leftPane: React.ReactNode;
  centerPane: React.ReactNode;
  rightPane: React.ReactNode;
}

export const ThreePaneLayout: React.FC<ThreePaneLayoutProps> = ({
  leftPane,
  centerPane,
  rightPane,
}) => {
  return (
    <main className="flex-1 flex overflow-hidden divide-x divide-white/10 bg-slate-900">
      {/* Pane 1: Source Document Editor (Left) */}
      <section className="w-[40%] min-w-[320px] flex flex-col overflow-hidden bg-slate-900">
        {leftPane}
      </section>

      {/* Pane 2: Suggestions & Rewriting (Center) */}
      <section className="w-[32%] min-w-[300px] flex flex-col overflow-hidden bg-slate-900">
        {centerPane}
      </section>

      {/* Pane 3: Accepted Preview & Export (Right) */}
      <section className="w-[28%] min-w-[260px] flex flex-col overflow-hidden bg-slate-850">
        {rightPane}
      </section>
    </main>
  );
};
