/**
 * At any given time we only crawl a single URL in this window. So between
 * crawl for each URL, a lot of these properties will be null, but not
 * during. This module does not guarantee that a page will load fully because
 * that is impossible to know beforehand -- some pages keep getting stuff
 * as long as the tab is open. The only invariance is that any visit
 * (complete or incomplete) will not take longer than visitTimeout.
 */
CrawlUtils = {

  /**
   * Url from where to fetch a domain to crawl using Redis.
   * See: https://github.com/nicolasff/webdis
   */
  crawlWaitingQUrl: "http://127.0.0.1:7379/RPOP/waitingQ.raw",

  /**
   * This is where we'll push a domain once we have crawled it.
   */
  crawlCompletedQUrl: "http://127.0.0.1:7379/LPUSH/completedQ/",

  /**
   * The tab id for current URL crawl. It gets associated during a visit.
   */
  visitTabId: null,

  /**
   * When visiting a page, this is set to that page.
   */
  currentVisitUrl: null,


  /**
   * The id for setinterval for submitcrawl, initialized in ATInit. We clear
   * setInterval once the entire crawl is complete for all URLs.
   */
  intervalHandle: null,


  /**
   * Crawl completed, out of domains.
   */
  crawlComplete: false,

  /**
   * Crawl submitted fr this url. We only want to submit once per url.
   */
  visitSubmitted: false,

  /**
   * We simply keep all the requests and responses to send them to server
   * here. This is used in crawl mode only. It is reset between each new visit.
   */
  crawlVisitRequestsSubmission: {},


  /**
   * The maximum time we'll wait for a page to load before submitting the data.
   * Realistically, we're done a lot sooner than this timeout.
   */
  visitTimeout: 3 * 60 * 1000,


  initCrawlVisitSubmission: function() {
    return new Promise(function(resolve, reject) {
      CrawlUtils.crawlVisitRequestsSubmission["userId"] = ATBg.userId;
      CrawlUtils.crawlVisitRequestsSubmission["requests"] = [];
      CrawlUtils.visitTabId = null;
      CrawlUtils.currentVisitUrl = null;
      CrawlUtils.visitSubmitted = false;
      // At the end of this time out, if the timer still exists we should
      // send the data and not wait more. Generally, I don't think this will
      // be used because memory cleanup of probableSubmissions is very good.
      CrawlUtils.crawlVisitRequestsSubmission["timer"] = setTimeout(
          CrawlUtils.submitVisit, CrawlUtils.visitTimeout);
      resolve();
    });
  },


  /**
   * This function doesn't do much besides just creating a new tab with the
   * next URL. Requests are pushed by ATBg and the submission is based on a
   * setInterval.
   */
  crawlNextUrl: function() {
    if (CrawlUtils.crawlComplete) {
      return;
    }
    var cu = CrawlUtils;
    cu.getXhrResponse(cu.crawlWaitingQUrl).then(function(response) {
      console.log("response: ", response);
      if (response.indexOf("$-") !== -1) {
        console.log("OUT OF DOMAINS! Chilling.");
        CrawlUtils.crawlComplete = true;
        clearTimeout(CrawlUtils.crawlVisitRequestsSubmission["timer"]);
        delete CrawlUtils.crawlVisitRequestsSubmission["timer"];
        clearInterval(CrawlUtils.intervalHandle);
        CrawlUtils.intervalHandle = null;
        return;
      }
      var domain = response.split("\n")[1];
      console.log("This is domain: ", domain);
      cu.currentVisitUrl = "http://" + domain;
      console.log("goingto: ", cu.currentVisitUrl);

      if (cu.visitTabId) {
        console.error("Tabid should be null when this is jsut initialized");
      }
      console.log("Creating new tab!");
      chrome.tabs.create({"url": cu.currentVisitUrl}, function(tab) {
        cu.visitTabId = tab.id;
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

  /**
   * Checks if the submission queue is empty yet. Webnavigatin completed and
   * request completed (or any combinatin of those two) doesn't work because
   * it never allows for enough time for the cookie to be set.
   */
  submitIfReady: function() {
    console.log("Length f submissions: ", ATBg.probableSubmissions);
    if (Object.keys(ATBg.probableSubmissions).length === 0 &&
        CrawlUtils.currentVisitUrl !== null && !CrawlUtils.visitSubmitted) {
      console.log("Submitting crawl for: ", CrawlUtils.currentVisitUrl);
      CrawlUtils.submitVisit();
    } else if (CrawlUtils.crawlComplete && CrawlUtils.visitSubmitted) {
        console.log("Entire crawl has completed and visit already submitted.");
        clearInterval(CrawlUtils.intervalHandle);
        CrawlUtils.intervalHandle = null;
        console.log("done");
    }
  },


  /**
   * Once decided the it should be submitted, this is called. This can be when
   * we believe that the page has fully loaded and we have all the data or when
   * the timer fires because we've been waiting too long.
   *
   * This function should only be called once per visit.
   */
  submitVisit: function() {
    if (!CrawlUtils.visitSubmitted) {
      CrawlUtils.visitSubmitted = true;
      // We've decided to submit crawl, remove timer.
      console.log("Clearing and deleting visit timer");
      clearTimeout(CrawlUtils.crawlVisitRequestsSubmission["timer"]);
      delete CrawlUtils.crawlVisitRequestsSubmission["timer"];
      var url = CrawlUtils.crawlCompletedQUrl + CrawlUtils.currentVisitUrl;
      // Send request to server
      CrawlUtils.getXhrResponse(url).then(function(response) {
        console.log("Put into completedQ ", response);
        // Send this request to server
        console.log("Sending crawler data to affiliatetracker");
        CrawlUtils.sendCrawlVisitToServer().then(function() {
          var tabId = CrawlUtils["visitTabId"];
          console.log("Closing tab: ", tabId);
          chrome.tabs.remove(tabId, function() {
            console.log("Purging browser");
            CrawlUtils.purgeBrowser().then(function() {
              CrawlUtils.initCrawlVisitSubmission().then(function() {
                if (!CrawlUtils.crawlComplete) {
                  console.log("crawling next url");
                  CrawlUtils.crawlNextUrl();
                }
              });
            });
          });
        });
      });
    }
  },

  purgeBrowser: function() {
    return new Promise(function(resolve, reject) {
      chrome.browsingData.remove({
          // Last hour milliseconds
          "since": (new Date()).getTime() - 60 * 60 * 1000,
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

  sendCrawlVisitToServer: function() {
    return new Promise(function(resolve, reject) {
      var data = JSON.stringify(CrawlUtils.crawlVisitRequestsSubmission);
      console.log("Sending request data: ", data);
      ATUtils.sendXhr(data, "crawl-visit");
      resolve();
    });
  },
}
