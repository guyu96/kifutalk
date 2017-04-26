var exceptions = (function() {
  var createCustomException = function(name) {
    return function(code, message) {
      this.prototype = new Error();
      this.prototype.constructor = name;
      this.code = code;
      this.message = message;
    }
  }

  return {
    ParsingError: createCustomException('ParsingError')
  };
});
