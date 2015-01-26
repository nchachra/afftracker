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
  it("tests determineAndSetMerchant() empty", function() {
    var sub = new ATSubmission();
    sub.determineAndSetMerchant();
    expect(sub.merchant).toBe(null);
  });

  it("tests determineAndSetMerchant() amazon", function() {
    var sub = new ATSubmission();
    sub.determineAndSetMerchant("www.amazon.com/asfadsfh");
    expect(sub.merchant).toEqual("amazon.com");
  });

  it("tests determineAndSetMerchant() cj", function() {
    var sub = new ATSubmission();
    sub.reqRespSeq = [
            {
                "url": "http://derpderp.com/click-0000-1111",
                "statusLine": null,
                "type": "image",
                "method": "GET"
            },
            {
                "url": "http://www.amazon.com/gp/product/doopdoop",
                "statusLine": "HTTP/1.1 200 OK",
                "type": "image",
                "method": "GET"
            },
            {
                "url": "http://www.notthisone.com/click-2222-3333",
                "statusLine": "HTTP/1.1 200 OK",
                "type": "image",
                "method": "GET"
            },
        ];
    sub.determineAndSetMerchant("www.domain.com/click-0000-1111");
    expect(sub.merchant).toEqual("commission junction (merchant: 1111)");
  });


  it("tests determineAndSetMerchant() cookie", function() {
    var sub = new ATSubmission();
    sub.cookie.name = "aw3041";
    sub.cookie.domain = ".awin1.com";
    sub.determineAndSetMerchant();
    expect(sub.merchant).toEqual("affiliate window (merchant:3041)");
  });


  it("tests determineAndSetMerchant() cookie", function() {
    var sub = new ATSubmission();
    sub.cookie.name = "aw3041";
    sub.cookie.domain = ".awin1.com";
    sub.determineAndSetMerchant("www.google.com");
    expect(sub.merchant).toEqual("affiliate window (merchant:3041)");
  });


  //determineAndSetAffiliate
  it("tests determineAndSetAffiliate() amazon", function() {
    var sub = new ATSubmission();
    sub.merchant = "amazon.at";
    sub.determineAndSetAffiliate("http://www.amazon.com/gp/product/?tag=horrible-20", "UserPref=whatver");
    expect(sub.affiliate).toEqual("horrible-20");
  });

  it("tests determineAndSetAffiliate() cj", function() {
    var sub = new ATSubmission();
    sub.merchant = "commission junction (merchant: 1111)";
    sub.reqRespSeq = [
            {
                "url": "http://derpderp.com/click-0000-1111",
                "statusLine": null,
                "type": "image",
                "method": "GET"
            },
            {
                "url": "http://www.amazon.com/gp/product/doopdoop",
                "statusLine": "HTTP/1.1 200 OK",
                "type": "image",
                "method": "GET"
            },
            {
                "url": "http://www.notthisone.com/click-2222-3333",
                "statusLine": "HTTP/1.1 200 OK",
                "type": "image",
                "method": "GET"
            },
        ];

    sub.determineAndSetAffiliate("someulr", "LCLK=blahblahblah");
    expect(sub.affiliate).toEqual("0000");
  });

  it("tests determineAndSetAffiliate() not amazon, cj, but valid", function() {
    var sub = new ATSubmission();
    sub.merchant = null;
    sub.determineAndSetAffiliate("something.com", "GatorAffiliate=0000.somename");
    expect(sub.affiliate).toEqual("somename");
  });




});
