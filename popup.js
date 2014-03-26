var AffiliateTrackerPopup = {

  background: chrome.extension.getBackgroundPage(),

  /**
   * Pulls the stored values from storage and populates the DOM.
   *
   * @public
   */
  populateDom: function() {
    var divEl = document.getElementById("merchant-info");
    var tableEl = document.createElement('table');
    var rowCounter = 0;
    var cookieMap = this.background.cookieMap;
    Object.keys(cookieMap).forEach(function(merchant, index) {
      var storeKey = "AffiliateTracker_" + merchant;
      chrome.storage.sync.get(storeKey, function(result) {
        var storeInfo = result[storeKey];
        if (typeof storeInfo != "undefined" && storeInfo != null) {
          var cookieName = cookieMap[merchant];
          var cookieUrl = (storeInfo.cookieDomain[0] == ".") ? "http://www." + storeInfo.cookieDomain :
                              "http://" + storeInfo.cookieDomain;
          chrome.cookies.get({"url": cookieUrl, "name": cookieName},
              function(cookie) {
            if (storeInfo && cookie && cookie.value == storeInfo.cookie) {
              // Every table's first cell is the icon img.
              var iconImg = document.createElement('img');
              if (merchant.indexOf('buyvip.com') !== -1 || merchant.indexOf('javari') !== -1) {
                iconImg.src = "icons/" +  merchant.split('.')[0] + ".png";
              } else {
                iconImg.src = "icons/" + merchant + ".png";
              }
              var iconCell = document.createElement('td');
              iconCell.appendChild(iconImg);
              var row = document.createElement('tr');
              row.appendChild(iconCell);
              infoCell = document.createElement('td');
              infoCell.innerHTML = "Your visit to <span style='font-weight:bold;'>" + storeInfo.origin + "</span> will earn <span style='font-weight:bold;'>" + storeInfo.affiliate + "</span> a commission on your next purchase from <span style='font-weight:bold;'>" + merchant + "</span>";
              row.appendChild(infoCell);
              tableEl.appendChild(row);
              // Change background color for even numbered rows.
              if (rowCounter % 2 == 0) {
                row.setAttribute("style", "background-color: #E6E6E6;");
              }
              rowCounter += 1;
            }
        });
      }
    });
  });
  divEl.appendChild(tableEl);
  }
};


// This should really be done with the event registration API? The alternate
// to the following.
document.addEventListener('DOMContentLoaded', function () {
  AffiliateTrackerPopup.populateDom();
});
