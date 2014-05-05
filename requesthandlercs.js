// Note that the console logs here show in the console for the page, along
// with other page errors.

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
      var len = nodeList.length;
      var response = [];
      for (i = 0; i < len; i++) {
        var el = nodeList[i];
        response.push({"height": el.height,
                       "width": el.width,
                       "naturalWidth": el.naturalWidth,
                       "naturalHeight": el.naturalHeight,
                       "title": el.title,
                       "innerHTML": el.innerHTML,
                       "outerHTML": el.outerHTML,
                       "hidden": el.hidden});
      }
      return response;
  },


  /**
   * Adds a magnifying glass icon next to the element provided. Also associates
   * an onhover() handler for this icon which shows a zoomed in version of the
   * element.
   *
   * @param{request} object The request object that has parameters needed to
   *    find the element to be highlighted.
   */
  highlightElement: function(request) {
    if (!RequestHandlerCS.frameTagMap.hasOwnProperty(request.frameType)) {
      return null;
    }
    var nodeList = document.querySelectorAll(
      RequestHandlerCS.frameTagMap[request.frameType] +
      "[src='" + request.url + "']");
    var len = nodeList.length;
    for (i = 0; i < len; i++) {
      var el = nodeList[i];
      var zoomIconEl = RequestHandlerCS.getZoomIconEl(el);
      var parent = el.parentNode;
      parent.insertBefore(zoomIconEl, el);
      // TODO add a higlighting class to el.
    }
  },


  /**
   * Creates an img node with the zoom icon. Associates an onHover handler for
   * the icon which displays the magnified version of the provided element.
   *
   * @param{object} el DOM element that should be zoomed into on hover.
   * @return{object} Zoom icon image element.
   */
  getZoomIconEl: function(el) {
    var icon = document.createElement('img');
    icon.src =  chrome.extension.getURL("icons/zoomicon.png");
    icon.style.width = "30px";
    icon.style.height = "30px";
    console.log(icon);
    return icon;
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
    } else if (request.method == "highlightAffiliateDom") {
      RequestHandlerCS.highlightElement(request);
      sendResponse({});
    } else
      sendResponse({}); // snub them.
});
