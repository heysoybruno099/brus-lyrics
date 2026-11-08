chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['apiUrl', 'enableBlur', 'enableAdLibs'], (items) => {
    const defaults: Record<string, any> = {};
    if (!items['apiUrl']) defaults['apiUrl'] = 'http://127.0.0.1:8787';
    if (items['enableBlur'] === undefined) defaults['enableBlur'] = true;
    if (items['enableAdLibs'] === undefined) defaults['enableAdLibs'] = true;

    if (Object.keys(defaults).length > 0) {
      chrome.storage.sync.set(defaults);
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_CONFIG') {
    chrome.storage.sync.get(['apiUrl', 'enableBlur', 'enableAdLibs'], (items) => {
      sendResponse(items);
    });
    return true;
  }
});
