describe("atbg.js tests", function () {

  //queueForSubmission
  it("tests queueForSubmission, can successfully add to queue", function() {
    var someObj = {"a": 1, "b": 2};
    ATBg.queueForSubmission(someObj);
    expect(ATBg.submissionQueue.length).toEqual(1);
    ATBg.submissionQueue.pop();
  });

  //sendCookiesToServer
  it("tests sendCookiesToServer, successfully frees up memory", function() {
    ATBg.queueForSubmission({"testing": 1});
    expect(ATBg.submissionQueue.length).toEqual(1);
    ATBg.sendCookiesToServer();
    expect(ATBg.submissionQueue.length).toEqual(0);
  });

  //getSubmissionForRequest
  it("tests getSubmissionForRequest(), with valid requestid", function() {
    //setup
    ATBg.probableSubmissions["requestid"] = {"test": 1};
    expect(ATBg.getSubmissionForRequest("requestid")).not.toBe(null);
    //cleanup
    delete ATBg.probableSubmissions["requestid"];
  });

  it("tests getSubmissionForRequest(), with invalid requestid", function() {
    expect(ATBg.getSubmissionForRequest("requestid")).toBe(null);
  });

  //domTimerCallback
  it("tests domTimerCallback, successfully queues up", function() {
    var someObj = {"a": 1, "b": 2};
    ATBg.domTimerCallback(someObj);
    expect(ATBg.submissionQueue.length).toEqual(1);
    ATBg.submissionQueue.pop();
  });

  //expressInterestInTab
  it("tests expressInterestInTab, create new entry of interest", function() {
    ATBg.tabsOfInterest = {};
    expect(Object.keys(ATBg.tabsOfInterest).length).toEqual(0);
    var tabId = "test";
    var sub = {"1": 1};
    ATBg.expressInterestInTab(tabId, sub);
    expect(Object.keys(ATBg.tabsOfInterest).length).toEqual(1);
    sub = {"2": 2};
    ATBg.expressInterestInTab(tabId, sub);
    expect(Object.keys(ATBg.tabsOfInterest).length).toEqual(1);
    expect(ATBg.tabsOfInterest[tabId].subObjects.length).toEqual(2);
    var tabId = "newtest";
    ATBg.expressInterestInTab(tabId, sub);
    expect(Object.keys(ATBg.tabsOfInterest).length).toEqual(2);
  });

});
