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
      if (window !== window.top) {
        // #TODO
        // The resource is in a frame. Let's put the parent's size too. Note
        // that if the parent frame containing images is hidden, the parent
        // will not be highlighted. This is because of cross-origin policy. The
        // best bet is to return this message, and let the background script
        // send another message to highlight parent frame with the given src url.
        elProperties["parentFrame"] = {
          "innerWidth": window.innerWidth,
          "innerHeight": window.innerHeight,
          "url": window.location.href,
        }
      }
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
    info.tagName = el.tagName;
    info.outerHTML = el.outerHTML;
    var style = '';
    var computedStyle = getComputedStyle(el);
    ["margin", "left", "top", "right", "bottom", "position", "zIndex",
      "visibility", "display"].forEach(function(property) {
        if (computedStyle.hasOwnProperty(property) &&
          typeof computedStyle[property] !== "undefined") {
          style = style + property + ":" + computedStyle[property] + "; ";
        }
      });
    info.style = style;
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
  highlightElements: function(request) {
    var nodeList = AffiliateDomCS.getMatchingNodelist(request);
    var len = nodeList.length;
    for (i = 0; i < len; i++) {
      var el = nodeList[i];
      AffiliateDomCS.highlightElement(el, request.frameType);
    }
  },

  /**
   * Highlights given element.
   *
   * @param{object} el Element
   * @param{string} type One of {"sub_frame", "image"}
   */
  highlightElement: function(el, type) {
    var hidden = false;
    if (el.hidden === true || el.style.display === "none" ||
                el.style.visibility === "false") {
      hidden = true;
    }
    var info = "Affiliate Cookie Info: " +
        " Node type: " + el.tagName +
        "; Dimensions: " + el.width + "," + el.height +
        "; Visibility: " + hidden;

    switch(type) {
      case "sub_frame":
        // For frames, there are often errors with increasing size. We are
        // able to set the property of the parent though, so if we
        // succeeded in that, leave.
        if (el.parentNode.className.indexOf("aff-zoom") !== -1) {
          return;
        }
        break;
      case "image":
        break;
      default:
        console.error("Wrong type supplied to highlightELement()");
        return;
    }
    if (el.className.indexOf("aff-zoom") == -1) {
      // We haven't already highlighted this element
      var parent = el.parentNode;
      var newParentDiv = AffiliateDomCS.getNewParentForEl(info);
      parent.replaceChild(newParentDiv, el);
      newParentDiv.appendChild(el);
    }
  },

  /**
   * Returns a <div> that contains an icon image tag. The final structure we
   * want is <div><img><el></div>.
   *
   * @param{string} info Caption for the icon image/tooltip etc.
   */
  getNewParentForEl: function(info) {
    var div = document.createElement("div");
    div.className = "aff-zoom aff-icon"
    var icon = AffiliateDomCS.getZoomIconEl(info);
    div.appendChild(icon);
    return div;
  },


  /**
   * Creates an img node with the zoom icon. Associates an onHover handler for
   * the icon which displays the magnified version of the provided element.
   *
   * @param{object} el DOM element that should be zoomed into on hover.
   * @return{object} Zoom icon image element.
   */
  getZoomIconEl: function(info) {
    var figure = document.createElement("figure");

    var icon = document.createElement('img');
    icon.src =  chrome.extension.getURL("icons/zoomicon.png");
    icon.className = "aff-zoom aff-icon";
    icon.title = info;
    icon.alt = info;

    var infoNode = document.createTextNode("AffTracker");
    var figCaption = document.createElement("figcaption");
    figCaption.appendChild(infoNode);
    figCaption.className = "figure-caption";

    figure.appendChild(icon);
    figure.appendChild(figCaption);
    return figure;
  },
}
