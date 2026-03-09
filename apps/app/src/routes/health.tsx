import { createFileRoute } from '@tanstack/react-router';

import { healthQueryOptions, useHealth } from '../hooks/use-health';

export const Route = createFileRoute('/health')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(healthQueryOptions),
  component: HealthPage,
});

function HealthPage() {
  const { data } = useHealth();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm border border-gray-200 rounded-xl p-6 space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">API Health</h1>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {data.status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Timestamp</span>
            <span className="text-sm text-gray-700 font-mono">{data.timestamp}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
