document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement | null;
  const enableBlurInput = document.getElementById('enableBlur') as HTMLInputElement | null;
  const enableAdLibsInput = document.getElementById('enableAdLibs') as HTMLInputElement | null;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement | null;
  const statusMsg = document.getElementById('statusMsg') as HTMLElement | null;

  // Load current values
  chrome.storage.sync.get(['apiUrl', 'enableBlur', 'enableAdLibs'], (items) => {
    if (apiUrlInput) apiUrlInput.value = items['apiUrl'] || 'http://127.0.0.1:8787';
    if (enableBlurInput) enableBlurInput.checked = items['enableBlur'] !== false;
    if (enableAdLibsInput) enableAdLibsInput.checked = items['enableAdLibs'] !== false;
  });

  // Save values
  saveBtn?.addEventListener('click', () => {
    const apiUrl = apiUrlInput?.value.trim() || 'http://127.0.0.1:8787';
    const enableBlur = enableBlurInput ? enableBlurInput.checked : true;
    const enableAdLibs = enableAdLibsInput ? enableAdLibsInput.checked : true;

    chrome.storage.sync.set(
      {
        apiUrl,
        enableBlur,
        enableAdLibs,
      },
      () => {
        if (statusMsg) {
          statusMsg.textContent = 'Settings saved successfully.';
          setTimeout(() => {
            statusMsg.textContent = '';
          }, 2000);
        }
      }
    );
  });
});
