import { COLOR_FACES } from './constants.js';

export function renderRolling() {
  const container = document.getElementById('results');
  if (!container) return;
  container.innerHTML = '';
  const rollingPill = document.createElement('div');
  rollingPill.className = 'pill';
  rollingPill.textContent = 'Rolling...';
  container.appendChild(rollingPill);
  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent = 'Waiting for the dice to settle.';
  container.appendChild(hint);
}

export function renderResults(definition, results) {
  const container = document.getElementById('results');
  if (!container) return;
  container.innerHTML = '';
  const summary = document.createElement('div');
  summary.className = 'pill';
  const total = definition.faceColors ? `${results.length} color dice` : results.reduce((sum, value) => sum + (value.value ?? value), 0);
  summary.textContent = definition.faceColors ? `${results.length} color roll${results.length === 1 ? '' : 's'}` : `${results.length}${definition.label} • Total ${total}`;
  container.appendChild(summary);
  results.forEach((value, idx) => {
    const item = document.createElement('div');
    item.className = 'result-item';
    const dieLabel = document.createElement('span');
    dieLabel.textContent = `Die ${idx + 1}`;
    const result = document.createElement('span');
    if (definition.faceColors) {
      const colorInfo = COLOR_FACES[value.colorIndex ?? value.faceIndex ?? idx % COLOR_FACES.length];
      const chip = document.createElement('span'); chip.className = 'color-chip'; chip.style.background = colorInfo?.color || '#fff';
      result.appendChild(chip);
      const text = document.createElement('span'); text.textContent = ` ${colorInfo?.name ?? 'Color'}`;
      text.style.color = colorInfo?.color || '#f8fafc';
      result.appendChild(text);
    } else {
      result.textContent = value.value ?? value;
    }
    item.appendChild(dieLabel);
    item.appendChild(result);
    container.appendChild(item);
  });
}

export function renderError(message) {
  const container = document.getElementById('results');
  if (!container) return;
  container.innerHTML = '';
  const error = document.createElement('div');
  error.className = 'pill';
  error.style.background = 'rgba(239, 68, 68, 0.15)';
  error.style.borderColor = 'rgba(239, 68, 68, 0.5)';
  error.textContent = message;
  container.appendChild(error);
}
