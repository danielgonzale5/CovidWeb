// Sends a JSON POST to this app and returns the parsed answer. Every page used to
// fire a request and wait for a Socket.IO broadcast; now each request gets its
// own answer, and nobody else sees it.
async function api(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    credentials: 'same-origin',
  });
  if (response.status === 401 && path !== '/login') {
    location.href = '/';
    throw new Error('session expired');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

// Builds a table from header labels and rows of plain values, as text only.
function buildTable(headers, rows) {
  const table = document.createElement('table');
  table.setAttribute('cellpadding', '7');
  table.setAttribute('rules', 'all');
  const head = table.insertRow();
  for (const label of headers) {
    const th = document.createElement('th');
    th.textContent = label;
    head.appendChild(th);
  }
  for (const row of rows) {
    const tr = table.insertRow();
    for (const value of row) tr.insertCell().textContent = value;
  }
  return table;
}

const STATUS_LABELS = {
  1: 'En Tratamiento Hospital',
  2: 'En UCI',
  3: 'Curado',
  4: 'En Tratamiento Casa',
  5: 'Sano',
  6: 'Muerte',
};
