describe ("affiliatedomcs.js tests", function () {

  var sc = AffiliateDomCS;

  //getMatchingNodelist
  it ("tests getMatchingNodelist null", function() {
    expect(sc.getMatchingNodelist({"frameType": "notatype"})).toBe(null);
  });

});
