ATBg.init();


// Every 3 seconds, send data to server if there is any.
setInterval(ATBg.sendToServer, 3000);


// We need this event to be able to highlight DOM element and get its
// attributes.
chrome.tabs.onUpdated.addListener(ATBg.tabLoadCallback);


// There is an inherent assumption that onSendHeaders is fired before
//   onHeadersReceived. It would be odd if this assumption is violated.
chrome.webRequest.onHeadersReceived.addListener(
    ATBg.responseCallback, {urls: ["<all_urls>"]}, ["responseHeaders"]);


chrome.webRequest.onSendHeaders.addListener(
    ATBg.requestCallback, {urls: ["<all_urls>"]}, ["requestHeaders"]);

