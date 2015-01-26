describe ("utils.js tests", function () {

  //generateUserId
  it ("tests generateUserId() non-null value", function() {
    expect(ATUtils.generateUserId()).toBeDefined();
  });

});
