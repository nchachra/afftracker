// Note that the console logs here show in the console for the page, along
// with other page errors.

/**
 * Request handler content script. When background script needs to interact
 * with the page DOM, it calls the event for this listener.
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getAffiliateDom") {
        var response = AffiliateDomCS.getAffiliateDom(request);
        // This check is necessary because every content script in every frame
        // is listening on this request. All but the first response are
        // ignored. Not sure why it's designed this way..
        if(response) {
          sendResponse(response);
        }
    } else if (request.method == "highlightAffiliateDom") {
      AffiliateDomCS.highlightElements(request);
      sendResponse({});
    } else
      sendResponse({}); // snub them.
});
