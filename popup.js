var afftracker_loader = {

  /**
   * List of merchants to display.
   *
   * @private
   */
  merchants: ["amazon", "hostgator"],

  /**
   * List of specifications to render for each merchant.
   *
   * @private
   */
  specs: {"aff": "Affiliate:",
          "time": "Set at: ",
          "rsc-type": "Rendered as:",
          "referer": "Referrer:",
          "site": "Visited: "},

  /**
   * Pulls the stored values from storage and populates the DOM.
   *
   * @public
   */
  populateDom: function() {
    var divEl = document.getElementById("merchant-info");
    this.merchants.forEach(function(merchant, index) {
      var tableEl = document.createElement('table');
      var store_key = "afftracker_" + merchant;

      // Every table's first cell is the icon img.
      var icon_img = document.createElement('img');
      icon_img.src = "icons/" + merchant + "_icon.png";
      var icon_cell = document.createElement('td');
      icon_cell.setAttribute('rowspan', 5);
      icon_cell.appendChild(icon_img);

      var icon_set = false;

      for (var key in afftracker_loader.specs) {
        if (afftracker_loader.specs.hasOwnProperty(key)) {
          var row = document.createElement('tr');
          if (!icon_set) {
            row.appendChild(icon_cell);
            icon_set = true;
          }
          var spec_cell = document.createElement('td');
          spec_cell.setAttribute("style", "font-weight:bold;");
          spec_cell.innerHTML = afftracker_loader.specs[key]; //fix this

          var spec_id_cell = document.createElement('td');
          spec_id_cell.id = merchant + "-" + key;
          row.appendChild(spec_cell);
          row.appendChild(spec_id_cell);
          tableEl.appendChild(row);
        }
      };
      // Change background color for even numbered rows.
          if (index % 2 === 1) {
            tableEl.setAttribute("style", "background-color: #E6E6E6;");
          }
      divEl.appendChild(tableEl);

      chrome.storage.sync.get(store_key, function(result) {
        var store_info = result[store_key];
        if (store_info) {
          document.getElementById(merchant + "-aff").innerHTML = store_info.aff_id;
          document.getElementById(merchant + "-time").innerHTML = new Date(store_info.timestamp).toString();
          document.getElementById(merchant + "-rsc-type").innerHTML = store_info.type;
          document.getElementById(merchant + "-referer").innerHTML = store_info.referer;
          document.getElementById(merchant + "-site").innerHTML = store_info.site;
        }
      });
    });
  }
};


// This should really be done with the event registration API? The alternate
// to the following.
document.addEventListener('DOMContentLoaded', function () {
  afftracker_loader.populateDom();
});
