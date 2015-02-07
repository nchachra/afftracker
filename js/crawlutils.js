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

  /**
   * If we close the page too early, we don't give atbg a chance to collect
   * information.
   */
  collectedCookieInfo: false,

  /**
   * If a tab has an onunload event, we can't close th tab. I found no way to
   * close it using windows or tabs. The only elegant solution I found is to
   * stop browsing using this browser.
   */
  stopUsingThisBrowser: false,


  initCrawlVisitSubmission: function() {
    return new Promise(function(resolve, reject) {
      CrawlUtils.collectedCookieInfo = false;
      CrawlUtils.crawlVisitRequestsSubmission["userId"] = ATBg.userId;
      CrawlUtils.crawlVisitRequestsSubmission["crawlDescription"] = ATInit.crawlDesc;
      CrawlUtils.crawlVisitRequestsSubmission["requests"] = [];
      CrawlUtils.crawlVisitRequestsSubmission["domain"] = null;
      CrawlUtils.visitTabId = null;
      CrawlUtils.currentVisitUrl = null;
      CrawlUtils.visitSubmitted = false;
      // At the end of this time out, if the timer still exists we should
      // send the data and not wait more. Generally, I don't think this will
      // be used because memory cleanup of probableSubmissions is very good.
      CrawlUtils.crawlVisitRequestsSubmission["timer"] = setTimeout(
          CrawlUtils.visitTimerCallback, CrawlUtils.visitTimeout);
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
      console.log("Crawl has completed, no more new domains.");
      return;
    } else if (CrawlUtils.stopUsingThisBrowser) {
      console.log("This browser is hosed, stopping crawling.");
      return;
    }
    chrome.tabs.query({'windowId': chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
      console.warn("Number of tabs: ", tabs.length);
      if (tabs.length > 1) {
        console.warn("At any time, there should only be 1 tab open.");
        CrawlUtils.stopUsingThisBrowser = true;
      }
    });
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
      var domain = response.split("\n")[1].trim();
      CrawlUtils.crawlVisitRequestsSubmission["domain"] = domain;
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
    console.log("Length f submissions: ", Object.keys(ATBg.probableSubmissions).length);
    if (Object.keys(ATBg.probableSubmissions).length === 0 &&
        CrawlUtils.currentVisitUrl !== null && !CrawlUtils.visitSubmitted &&
        ATBg.submissionQueue.length === 0) {
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
   * Callback for the maximum time spent on a visit.
   */
  visitTimerCallback: function() {
    console.log('TImeout for visit; submitting visit even thuogh there are submission objects. Submission, Queue ',
        ATBg.probableSubmissions, ATBg.submissionQueue);
    CrawlUtils.submitVisit()
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
        var temp  = CrawlUtils.crawlVisitRequestsSubmission["requests"];
        console.log("Sending crawler data to affiliatetracker", temp);
        CrawlUtils.sendCrawlVisitToServer().then(function() {
          var tabId = CrawlUtils["visitTabId"];
          console.log("Closing tab: ", tabId);
          CrawlUtils.removeTab(tabId).then(function() {
            console.log("Tried to remove tab, error: ", chrome.runtime.lastError);
            console.log("Purging browser");
            CrawlUtils.purgeBrowser().then(function() {
              CrawlUtils.initCrawlVisitSubmission().then(function() {
                if (!CrawlUtils.crawlComplete) {
                  console.log("crawling next url");
                  CrawlUtils.crawlNextUrl();
                }
              });
            });
          }, function(error) {
            // Usually this happens because of onDocumentUnload events and
            // there's really no clean way of dealing with these.
            console.log("Error closing tab: ", error);
            CrawlUtils.stopUsingThisBrowser = true;
          });
        });
      });
    }
  },

  removeTab: function(tabId) {
    return new Promise(function(resolve, reject) {
      chrome.tabs.remove(tabId, function() {
        // This callback is called when the remove signal is sent to thr
        // browser, not when the tab actually closes. :'(
        resolve();
      });
    });
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
      console.log("Sending visit data to server");
      //CrawlUtils.sendXhr(data, "crawl-visit").then(function() {
          resolve();
      //});
    });
  },

  sendXhr: function(data, type) {
    return new Promise(function(resolve, reject) {
      var http = new XMLHttpRequest();
      var url = "http://affiliatetracker.ucsd.edu:5000/upload-crawl-visit";
      http.open("POST", url, true);

      //Send the proper header information along with the request
      http.setRequestHeader("Content-type", "application/json;");
      http.onreadystatechange = function() {//Call a function when the state changes.
        if(http.readyState == 4 && http.status == 200) {
          resolve();
        }
      }
      http.send(data);
    });
  },
}
