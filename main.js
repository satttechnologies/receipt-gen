const CONFIG = {
  SHEET_ID: "1_9t8ZPiUR9bodz6e3oy-TXO0FMFeZ0QsqnsEdqcqSyE",                     // <-- paste your Sheet ID here
  SHEET_NAME: "RECEIPT VERIFICATOR",                   // <-- optional, e.g. "Form Responses 1" (leave blank for first sheet)
  RECEIPT_COLUMN: "Receipt Number", // <-- exact column header text
  DISPLAY_COLUMNS: ["Name", "Reason for payment", "Amount", "Date", "Status", "Mode of Payment"] // <-- other columns to show on match
};

/* Demo dataset used until CONFIG.SHEET_ID is filled in, so the UI is
   interactive out of the box. */
const DEMO_ROWS = [
  { "Receipt Number": "RCT-1001", "Name": "Ada Okafor",   "Amount": "₦45,000", "Date": "2026-08-02", "Status": "Paid" },
  { "Receipt Number": "RCT-1002", "Name": "Femi Balogun", "Amount": "₦12,500", "Date": "2026-08-05", "Status": "Paid" },
  { "Receipt Number": "RCT-1003", "Name": "Grace Umeh",   "Amount": "₦8,000",  "Date": "2026-08-09", "Status": "Refunded" }
];

const input = document.getElementById('receiptInput');
const btn = document.getElementById('verifyBtn');
const resultEl = document.getElementById('result');
const sourceTag = document.getElementById('sourceTag');
const countTag = document.getElementById('countTag');

const isConfigured = () => CONFIG.SHEET_ID.trim().length > 0;

function gvizUrl(){
  const base = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json`;
  return CONFIG.SHEET_NAME ? `${base}&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}` : base;
}

async function fetchRows(){
  if (!isConfigured()) return DEMO_ROWS;

  const res = await fetch(gvizUrl());
  const text = await res.text();
  // gviz wraps its JSON in a JS callback; strip it out
  const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
  const cols = json.table.cols.map(c => c.label || c.id);
  return json.table.rows.map(r => {
    const row = {};
    cols.forEach((col, i) => {
      row[col] = r.c[i] ? (r.c[i].f ?? r.c[i].v ?? "") : "";
    });
    return row;
  });
}

function renderPending(){
  resultEl.innerHTML = `<p class="help-text">Checking records…</p>`;
}

function renderValid(row){
  const rows = CONFIG.DISPLAY_COLUMNS
    .filter(col => row[col] !== undefined)
    .map(col => `<dt>${col}</dt><dd>${escapeHtml(String(row[col] || "—"))}</dd>`)
    .join("");

  resultEl.innerHTML = `
    <div class="stamp-box">
      <span class="stamp valid">✓ Valid receipt</span>
      <dl class="detail-grid">${rows}</dl>
    </div>`;
}

function renderInvalid(query){
  resultEl.innerHTML = `
    <div class="stamp-box">
      <span class="stamp invalid">✕ Not found</span>
      <p class="help-text" style="margin-top:12px;">No record matches “${escapeHtml(query)}”. Check the number and try again.</p>
    </div>`;
}

function renderError(){
  resultEl.innerHTML = `
    <div class="stamp-box">
      <span class="stamp invalid">⚠ Couldn't reach the sheet</span>
      <p class="help-text" style="margin-top:12px;">Make sure the Sheet ID is correct and sharing is set to "Anyone with the link – Viewer".</p>
    </div>`;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function verify(){
  const query = input.value.trim();
  if (!query) { input.focus(); return; }

  btn.disabled = true;
  renderPending();

  try{
    const rows = await fetchRows();
    countTag.textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;
    const match = rows.find(r =>
      String(r[CONFIG.RECEIPT_COLUMN] || "").trim().toLowerCase() === query.toLowerCase()
    );
    match ? renderValid(match) : renderInvalid(query);
  } catch(err){
    console.error(err);
    renderError();
  } finally {
    btn.disabled = false;
  }
}

btn.addEventListener('click', verify);
input.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });

sourceTag.textContent = isConfigured() ? "LIVE SHEET" : "DEMO DATA";