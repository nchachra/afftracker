CrawlUtils = {

  // See: https://github.com/nicolasff/webdis
  urlSource: "http://127.0.0.1:7379/RPOP/waitingQ.raw",

  urlDestination: "http://127.0.0.1:7379/LPUSH/completedQ/",

  crawlTabId: null,

  currentUrl: null,

  uploadCrawlUrl: "http://affiliatetracker.ucsd.edu:5000/upload-crawl",

  crawlNextUrl: function() {
    var cu = CrawlUtils;
    cu.getXhrResponse(cu.urlSource).then(function(response)
      console.log("Got URL!", response);
      if (!cu.crawlTabId) {
        console.log("Creating new tab!");
        cu.currentUrl = response;
        chrome.tabs.create({"url": response}, function(tab) {
          cu.crawlTabId = tab.id;
        });
      }, function(error) {
        console.error("Failed to set location!", error);
      });
  },


  getXhrResponse: function(url) {
    // Return a new promise.
    return new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      req.open('GET', url);
      req.onload = function() {
        // This is called even on 404 etc
        // so check the status
        if (req.status == 200) {
          // Resolve the promise with the response text
          resolve(req.response);
        }
        else {
          // Otherwise reject with the status text
          // which will hopefully be a meaningful error
          reject(Error(req.statusText));
        }
      };

      // Handle network errors
      req.onerror = function() {
        reject(Error("Network Error"));
      };

      // Make the request
      req.send();
    });
  },

  completed: function(object) {
    var url = CrawlUtils.urlDestination + currentUrl;
    // Send request to server
    CrawlUtils.getXhrResponse(url).then(function(response) {
      // Send this request to server
      CrawlUtils.sendCrawlData().then(function() {
        CrawlUtils.purgeBrowser().then(function() {
          CrawlUtils.crawlNextUrl();
        });
      });
    });
  },

  purgeBrowser: function() {
    return new Promise(function(resolve, reject) {
      chrome.browsingData.remove({
          // Last hour milliseconds
          "since": (new Date()).getTime() - 60 * 60 * 1000;
        }, {
          "appcache": true,
          "cache": true,
          "cookies": true,
          "downloads": true,
          "fileSystems": true,
          "formData": true,
          "history": true,
          "indexedDB": true,
          "localStorage": true,
          "pluginData": true,
          "passwords": true,
          "webSQL": true
       }, function() {
          resolve();
     });
    });
  },

  sendCrawlData: function() {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      // TODO: refactor this to a function
      xhr.open("POST", CrawlUtils.uploadCrawlUrl);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      console.log("Sending request data: ", obj);
      var obj = {CrawlUtils.currentUrl: crawlModeRequestSubmission};
      //xhr.send(obj);
      resolve();
    });
  },
}
