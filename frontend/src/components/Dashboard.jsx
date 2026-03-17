import React from 'react';
import ChartPanel from './ChartPanel';
import LoadingPanel from './LoadingPanel';
import ErrorBanner from './ErrorBanner';

export default function Dashboard({ panels, loading, error, onRemovePanel, onDismissError }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {error && (
        <div className="mb-6">
          <ErrorBanner error={error} onDismiss={onDismissError} />
        </div>
      )}
      {loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <LoadingPanel />
        </div>
      )}
      {panels.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {panels.map((panel) => (
            <ChartPanel
              key={panel.id}
              result={panel}
              onRemove={() => onRemovePanel(panel.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
