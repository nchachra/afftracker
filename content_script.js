chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getFrame") {
      // Unfortunately we need to iterate to find a match.
      var tagNames = {"image": "img", "sub_frame": "frame"};
      var els = Array.prototype.slice.apply(document.getElementsByTagName(tagNames[request.frame_type]));
      sendResponse(els);
      for (var i = 0; i < els.length; i++) {
        if (els[i].src == url) {
          //properties["src"] = url;
          //properties["attrs"] = Array.prototype.slice.call(els[i].attributes);
          //sendResponse({"data": els[i].innerHTML});
        }
      }
    }
    else
      sendResponse({}); // snub them.
});
