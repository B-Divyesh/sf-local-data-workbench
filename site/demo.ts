import './site.css';

type Order = [string, string, string, string];
const orders: Order[] = [
  ['1001', 'North', 'shipped', '124.50'], ['1002', 'West', 'pending', '88.00'],
  ['1003', 'North', 'shipped', '241.25'], ['1004', 'South', 'cancelled', '61.00'], ['1005', 'West', 'shipped', '199.99']
];
const BUILD_ID = import.meta.env.VITE_BUILD_ID ?? 'source checkout';
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.1.4';
const $ = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
};
let visible = [...orders];

function render(): void {
  $('#sample-rows').innerHTML = visible.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join('')}</tr>`).join('');
  $('#demo-status').textContent = `Showing ${visible.length} sample order${visible.length === 1 ? '' : 's'}. Nothing is saved.`;
}
function filter(): void {
  const status = $<HTMLSelectElement>('#status-filter').value;
  visible = status === 'all' ? [...orders] : orders.filter((row) => row[2] === status);
  render();
}
function csvCell(value: string): string { return `"${value.replaceAll('"', '""')}"`; }
function exportSample(): void {
  const csv = [['order_id', 'region', 'status', 'amount'], ...visible].map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a'); link.href = url; link.download = 'monthly-orders-filtered.csv'; link.click(); URL.revokeObjectURL(url);
  $('#demo-status').textContent = `Exported ${visible.length} sample order${visible.length === 1 ? '' : 's'} as CSV. Nothing is saved.`;
}
$('#apply-filter').addEventListener('click', filter);
$('#export-sample').addEventListener('click', exportSample);
$('#reset-demo').addEventListener('click', () => { $<HTMLSelectElement>('#status-filter').value = 'all'; visible = [...orders]; render(); });
document.querySelectorAll<HTMLElement>('[data-build-id]').forEach((element) => { element.textContent = `${APP_VERSION} · ${BUILD_ID}`; });
render();
