var afftracker_loader = {

  // TODO: a better way to do this is to use message passing and share with background
  amazon_sites: ["amazon.com", "amazon.de", "amazon.at", "amazon.ca", "amazon.cn",
                    "amazon.fr", "amazon.it", "amazon.co.jp", "amazon.es", "amazon.co.uk",
                    "joyo.com",
                    "amazonsupply.com",
                    "javari.co.uk", "javari.de", "javari.fr", "javari.jp",
                    "buyvip.com"],


  /**
   * Pulls the stored values from storage and populates the DOM.
   *
   * @public
   */
  populateDom: function() {
    var divEl = document.getElementById("merchant-info");
    this.amazon_sites.forEach(function(merchant, index) {
      var index = 0;
      var store_key = "AffiliateTracker_" + merchant;
      chrome.storage.sync.get(store_key, function(result) {
        var store_info = result[store_key];
        var cookie_name = 'UserPref';
        // TODO: need to be comprehensive. Save it in the storage object itself.
        var cookie_url = "http://www." + merchant;
        chrome.cookies.get({"url": cookie_url, "name": cookie_name},
            function(cookie) {
          if (store_info && cookie && cookie.value == store_info.cookie) {
            index++;
            var tableEl = document.createElement('table');
            // Every table's first cell is the icon img.
            var icon_img = document.createElement('img');
            // TODO: add different icons for different amazon sites
            icon_img.src = "icons/" +  merchant.split(".")[0] + "_icon.png";
            var icon_cell = document.createElement('td');
            icon_cell.appendChild(icon_img);
            var row = document.createElement('tr');
            row.appendChild(icon_cell);
            info_cell = document.createElement('td');
            info_cell.innerHTML = "Your visit to <span style='font-weight:bold;'>" + store_info.origin + "</span> will earn <span style='font-weight:bold;'>" + store_info.affiliate + "</span> a commission on your next purchase from <span style='font-weight:bold;'>" + merchant + "</span>";
            row.appendChild(info_cell);
            tableEl.appendChild(row);
            // Change background color for even numbered rows.
            if (index % 2 === 0) {
              tableEl.setAttribute("style", "background-color: #E6E6E6;");
            }
            divEl.appendChild(tableEl);
          }
        /**
        } else if (merchant == 'hostgator') {
          cookie_name = 'GatorAffiliate';
          cookie_url = "http://tracking.hostgator.com";
        }
        */
      });
    });
  });
  }
};


// This should really be done with the event registration API? The alternate
// to the following.
document.addEventListener('DOMContentLoaded', function () {
  afftracker_loader.populateDom();
});
