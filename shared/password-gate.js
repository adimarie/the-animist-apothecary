/**
 * Simple client-side password gate.
 * Checks a SHA-256 hash of the entered password against a stored hash.
 * Stores unlock state in sessionStorage so users don't re-enter per page load.
 */
export function initPasswordGate(pageId, passwordHash) {
  const storageKey = `aap-gate-${pageId}`;

  // Check if already unlocked this session
  if (sessionStorage.getItem(storageKey) === 'unlocked') {
    showContent();
    return;
  }

  // Show the gate
  const gate = document.getElementById('passwordGate');
  const content = document.getElementById('gatedContent');
  if (gate) gate.style.display = 'flex';
  if (content) content.style.display = 'none';

  // Handle form submit
  const form = document.getElementById('gateForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('gatePassword');
    const error = document.getElementById('gateError');
    const entered = input.value;

    // Hash the entered password
    const encoder = new TextEncoder();
    const data = encoder.encode(entered);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === passwordHash) {
      sessionStorage.setItem(storageKey, 'unlocked');
      showContent();
    } else {
      if (error) {
        error.textContent = 'Incorrect password. This content is available by invitation only.';
        error.style.display = 'block';
      }
      input.value = '';
      input.focus();
    }
  });

  function showContent() {
    const gate = document.getElementById('passwordGate');
    const content = document.getElementById('gatedContent');
    if (gate) gate.style.display = 'none';
    if (content) content.style.display = 'block';
  }
}
