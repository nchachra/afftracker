// Note that the console logs here show in the console for the page, along
// with other page errors.

var AffiliateDomCS = {

  /**
   * The HTML tags that the Chrome reported Frame Type refers to.
   */
  frameTagMap: {"image": "img",
                "sub_frame": "iframe",
               },

  /**
   * Returns nodelist matching the frametype and url in the request.
   *
   * @param{object} request
   * @returns{?object} List of matching nodes, null if the request is bad.
   */
  getMatchingNodelist: function(request) {
    if (!AffiliateDomCS.frameTagMap.hasOwnProperty(request.frameType)) {
      return null;
    }
    return document.querySelectorAll(
        AffiliateDomCS.frameTagMap[request.frameType] +
        "[src='" + request.url + "']");
  },


  /**
   * Returns attributes for the DOM element that corresponds to affiliate
   * URL. Attributes include size and visibility of the element. If the
   * element is in an iframe, returns the properties of the iframe as well.
   *
   * @param{object} request The request object with arguments from background
   *    script.
   * @return{object} The response object. Returns null if the frame type is
   *    not recognized.
   */
  getAffiliateDom: function(request) {
    var nodeList = AffiliateDomCS.getMatchingNodelist(request);
    var len = nodeList.length;
    var response = [];
    for (i = 0; i < len; i++) {
      var el = nodeList[i];
      var elProperties = AffiliateDomCS.getElementInfo(el,
          request.frameType);
      /**
      if (window !== window.top) {
        // It is contained in an iframe.
        var iframeInfo = AffiliateDomCS.getElementInfo(window.frameElement, "frame");
        if (iframeInfo) {
          elProperties["elParentIframe"] = iframeInfo;
        }
      }
      */
      response.push(elProperties);
    }
    return (response.length > 0 ? response : null);
  },


/**
 * Get information about size and visibility of an element.
 *
 * @param{object} el
 * @param{string} type The type of element, one of {"sub_frame", "image"}
 *
 * @returns{object} Information about element, null otherwise.
 */
  getElementInfo: function(el, type) {
    var info = null;
    switch (type) {
      case "sub_frame":
        info = {
          "clientHeight": el.clientHeight,
          "clientWidth": el.clientWidth,
        };
        break;
      case "image":
        info = {
          "naturalWidth": el.naturalWidth,
          "naturalHeight": el.naturalHeight,
          "title": el.title,
        }
        break;
      default:
        console.error("Type must be specified to get element's information");
        return info;
    }
    info.height = el.height;
    info.width = el.width;
    info.hidden = el.hidden;
    info.tagName = el.tagName;
    info.innerHTML = el.innerHTML;
    info.outerHTML = el.outerHTML;
    return info;
  },


  /**
   * Adds a magnifying glass icon next to the element provided. Also causes
   * a zoom transformation using CSS on the icon. Artificially increases the
   * size of the element to at least 10px square if it's smaller and forces
   * the visibility to visible when rendered. On hovering over the
   * corresponding magnifying icon or the element, the tooltip shows the
   * original properties.
   *
   * @param{request} object The request object that has parameters needed to
   *    find the element to be highlighted.
   */
  highlightElement: function(request) {
    var nodeList = AffiliateDomCS.getMatchingNodelist(request);
    var len = nodeList.length;
    for (i = 0; i < len; i++) {
      var el = nodeList[i];
      // If it is contained in iframe, highlight it as well. This could
      // potentially be recursive problem, for now stick to a single level
      // of depth.
      if (window != window.top) {
        var parentFrame = window.frameElement;
        if (parentFrame.className.indexOf("aff-zoom") == -1) {
          // We haven't already highlighted this parent.
          if (parentFrame.height < 100) {
            parentFrame.height = "100px";
          }
          if (parentFrame.width < 100) {
            parentFrame.width = "100px";
          }
          parentFrame.style.visibility = "visible";
          parentFrame.style.position = "absolute";
          parentFrame.style.zIndex = "10000";
          parentFrame.style.display = "block";
          var parentZoomIcon = AffiliateDomCS.getZoomIconEl(parentFrame);
          parentFrame.className = parentFrame.className + " aff-zoom";
          var parent = parentFrame.parentNode;
          parent.insertBefore(parentZoomIcon, parentFrame);
        }
      }

      el.className = el.className + " aff-zoom";
      var parent = el.parentNode;
      var zoomIconEl = AffiliateDomCS.getZoomIconEl(el);
      var infoTitle = "Affiliate Cookie Info: " +
        " Node type: " + el.tagName +
        "; Dimensions: " + el.width + "X" + el.height +
        "; Visibility: " + el.hidden;
      zoomIconEl.title = infoTitle;
      zoomIconEl.alt = infoTitle;


      if (el.width < 10) {
        el.style.width = "10px";
      }
      if (el.height < 10) {
        el.style.height = "10px";
      }
      el.style.visibility = "visible";
      el.style.position = "absolute";
      el.style.zIndex = "10000";
      el.style.display = "block";
      // TODO: do for all parents.
      parent.insertBefore(zoomIconEl, el);
      parent.style.visibility = "visible";
      parent.style.position = "absolute";
      parent.style.display = "block";
      parent.style.zIndex = "10000";
      el.title = "Node type: " + el.tagName +
        "; Dimensions: " + el.width + "X" + el.height +
        "; Visibility: " + el.hidden;
    }
    return nodeList;
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
    icon.style.width = "20px";
    icon.style.height = "20px";
    icon.style.visibility = "visible";
    icon.style.display = "block";
    return icon;
  },
}
