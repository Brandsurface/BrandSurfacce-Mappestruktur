// toast.js — injected into the active tab to show a floating result message.
(async () => {
  document.getElementById('__bs_toast__')?.remove();

  const { __bs_toast_data: data } = await chrome.storage.local.get('__bs_toast_data');
  if (!data || Date.now() - data.ts > 10000) return;

  const isOk = data.type === 'ok';

  const wrap = document.createElement('div');
  wrap.id = '__bs_toast__';
  wrap.style.cssText =
    'position:fixed;top:20px;right:20px;z-index:2147483647;' +
    'display:flex;align-items:flex-start;gap:9px;' +
    'padding:13px 16px;border-radius:10px;' +
    'font:600 13px/1.5 system-ui,-apple-system,sans-serif;' +
    'color:#fff;pointer-events:none;max-width:320px;word-break:break-word;' +
    (isOk ? 'background:#16a34a;' : 'background:#dc2626;') +
    'box-shadow:0 4px 20px rgba(0,0,0,.3);opacity:1;transition:opacity .5s;';

  const icon = document.createElement('span');
  icon.textContent = isOk ? '✓' : '✕';
  icon.style.cssText = 'flex-shrink:0;font-size:15px;line-height:1.5;';

  const text = document.createElement('span');
  text.textContent = data.message;

  wrap.appendChild(icon);
  wrap.appendChild(text);
  document.body.appendChild(wrap);

  setTimeout(() => {
    wrap.style.opacity = '0';
    setTimeout(() => wrap.remove(), 520);
  }, isOk ? 3000 : 5000);
})();
