ATInit = {

  /**
    * Initialize the extension. Specifically, it relies on the userid creation
    * promise to have a userid. Only when one is created it:
    * 1) Initializes and parses the existing cookies to display in the popup.
    * 2) Sends a list of currently installed extensions to the server. We track
    *    these because extensions like adblocker affect affiliate cookies. This
    *    excludes some extensions that chrome comes with by default.
    * 3) Attaches listeners for monitoring cookies while browsing.
    */
  initialize: function(info) {

    // info.reason is an enum of {"install", "update"..} etc.
    // It appears chrome removes all listeners when an extension is updated
    // so just reattach all of them.

    // Clean up local storage before proceeding.
    ATUtils.cleanUpLocalStorage().then(function() {
      ATUtils.getUserId().then(function(userId) {
        console.assert(typeof ATBg.userId === "string",
          "Generated UserId should be a string.");
        // Every second, send data to server if there is any.
        setInterval(ATBg.sendCookiesToServer, 1000);

        ATBg.processExistingCookies();
        ATBg.processExistingExtensions();

        // We need this event to be able to highlight DOM element and get its
        // attributes.
        chrome.tabs.onUpdated.addListener(ATBg.tabLoadCallback);

       chrome.webRequest.onSendHeaders.addListener(
          ATBg.requestCallback, {urls: ["<all_urls>"]}, ["requestHeaders"]);
       // There is an inherent assumption that onSendHeaders is fired before
       //   onHeadersReceived. It would be odd if this assumption is violated.
      chrome.webRequest.onHeadersReceived.addListener(
        ATBg.responseCallback, {urls: ["<all_urls>"]}, ["responseHeaders"]);

      }, function(error) {
        //TODO:
        //Theoretically the extension can still notify user. Change this once
        //data collection is not needed for the project. Or at least notify user
        //to try reset the extension. Otherwise it'll quietly sit forever.
        console.error("Failed to generate userid!", ATBg.userId);
      });
    });
  },
}

chrome.runtime.onInstalled.addListener(ATInit.initialize);
