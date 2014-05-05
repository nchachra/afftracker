var RequestHandlerCS = {

  /**
   * The HTML tags that the Chrome reported Frame Type refers to.
   */
  frameTagMap: {"image": "img",
                "sub_frame": "iframe"},


  /**
   * Returns attributes for the DOM element that corresponds to affiliate
   * URL. Attributes include size and visibility of the element. As a side
   * effect, the function also highlights the DOM element for the user.
   *
   * @param{object} request The request object with arguments from background
   *    script.
   * @return{object} The response object. Returns null if the frame type is
   *    not recognized.
   */
  getAffiliateDom: function(request) {
      if (!RequestHandlerCS.frameTagMap.hasOwnProperty(request.frameType)) {
        return null;
      }
      var nodeList = document.querySelectorAll(
          RequestHandlerCS.frameTagMap[request.frameType] +
          "[src='" + request.url + "']");
      // Convert nodelist to array.
      var imgEls = Array.prototype.slice.call(nodeList);
      var response = [];
      imgEls.forEach(function(imgEl, index) {
        // highlightElement(imgEl); TODO
        response.push({"height": imgEl.height,
                       "width": imgEl.width,
                       "naturalWidth": imgEl.naturalWidth,
                       "naturalHeight": imgEl.naturalHeight,
                       "title": imgEl.title,
                       "innerHTML": imgEl.innerHTML,
                       "outerHTML": imgEl.outerHTML,
                       "hidden": imgEl.hidden});
      });
      return response;
  },
}


/**
 * Request handler content script. When background script needs to interact
 * with the page DOM, it calls the event for this listener.
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getAffiliateDom") {
      var response = RequestHandlerCS.getAffiliateDom(request);
      sendResponse(response);
    }
    else
      sendResponse({}); // snub them.
});
