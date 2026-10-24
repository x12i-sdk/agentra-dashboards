import assert from 'node:assert/strict';
import { createAgentraCountex, userBehaviorMap } from '@x12i/agentra-countex';
const scope = { tenantId: 'fixture-tenant', accountId: 'fixture-account', environment: 'dev' };
const events = [1, 2].map(index => ({ scope, event: { id: 'event-' + index, type: 'report.generated', createdAt: new Date().toISOString() },
  actor: { id: 'fixture-user', type: 'user' }, product: { app: 'example', feature: 'reports' }, classification: { status: 'success' },
}));
const counters = createAgentraCountex([userBehaviorMap]);
await counters.init();
await counters.ingestBatch(events);
await counters.flush();
import { AgentraQueryEngine } from '@x12i/agentra-query';
const query = new AgentraQueryEngine({ countex: counters });
// This map emits both user and account subjects; select one subject to count its events.
const spec = { scope: scope.tenantId, counterId: userBehaviorMap.counterId, timeframe: { type: 'day', relative: '7d' }, subject: { type: 'user', ids: ['fixture-user'] }, metrics: ['report.generated'], format: 'table' };
import { AgentraDashboardEngine } from '@x12i/agentra-dashboards';
try {
  const engine = new AgentraDashboardEngine(query);
  engine.save({ id: 'fixture-dashboard', name: 'Example activity', scope: scope.tenantId, layout: { columns: 1 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    widgets: [{ id: 'reports', title: 'Reports generated', type: 'number', query: spec }],
  });
  const rendered = await engine.renderDashboard('fixture-dashboard');
  assert.equal(rendered.widgets[0].widgetId, 'reports');
  assert(rendered.widgets[0].data.rows.some(row => row.count === 2));
  console.log(rendered);
} finally { await counters.shutdown(); }
