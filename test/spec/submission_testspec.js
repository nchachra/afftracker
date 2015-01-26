describe ("submission.js tests", function () {

  //setCookie
  it ("tests setCookie() wrong type", function() {
    var sub = new ATSubmission();
    expect(sub.setCookie("var=value;", "TestType")).not.toBeDefined();
  });

  //initialization
  it ("tests initialization", function() {
    var sub = new ATSubmission();
    expect(typeof sub.timestamp).toEqual("number");
  });

  //setCookie
  it("Tests setCookie() header type", function() {
    var cookie = "variable=value;";
    var sub = new ATSubmission();
    sub.setCookie(cookie, "header",["http://www.google.com"]);
    expect(sub.cookie.domain).toEqual("www.google.com");
    expect(sub.cookie.hostOnly).toBe(false);
    expect(sub.cookie.expirationDate).toBe(null);
    expect(sub.cookie.name).toEqual("variable");
  });

  it("Tests setCookie() object type", function() {
    var cookie = {"name": "variable",
      "value": "value"};
    var sub = new ATSubmission();
    sub.setCookie(cookie, "object");
    expect(sub.cookie.name).toEqual("variable");
  });

  //setAutoDestructTimer
  it("tests setAutoDestructTimer() set", function() {
    var sub = new ATSubmission();
    ATBg.probableSubmissions["testRequestId"] = "1234";
    sub.setAutoDestructTimer("testRequestId");
    expect(sub.reqLifeTimer).toBeDefined();
  });

  //prolongLife
  it ("tests prolongLife()", function() {
    var sub = new ATSubmission();
    sub.setAutoDestructTimer("testRequestId");
    sub.prolongLife(function() {});
    expect(typeof sub.reqLifeTimer).toEqual("undefined");
    expect(sub.domTimer).toBeDefined();
  });


  //determineAndSetMerchant
  it("tests determineAndSetMerchant() amazonurl", function() {
    var sub = new ATSubmission();
    var url = "";
    //sub.determineAndSetMerchant(url);
  });

});
