// Note that the console logs here show in the console for the page, along
// with other page errors.

/**
 * Request handler content script. When background script needs to interact
 * with the page DOM, it calls the event for this listener.
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getAffiliateDom") {
        var response = AffiliateDomCS.getAffiliateDom(request);
        // This check is necessary because every tab has this
        // content script in it and is listening for this message. Sender
        // merely identifies an extension, but not the tabId...
        // TODO: find a way to optimize.
        if(response) {
          sendResponse(response);
        }
    } else if (request.method == "highlightAffiliateDom") {
      AffiliateDomCS.highlightElement(request);
      sendResponse({});
    } else
      sendResponse({}); // snub them.
});
