var utils = (function() {
  // convert letter coordinate to number
  var l2n = function(ch) {
    // 'a' has ASCII code 97
    return ch.toLowerCase().charCodeAt(0) - 97;
  } 

  // convert number coordinate to letter
  var n2l = function(n) {
    return String.fromCharCode(n + 97);
  }
  
  // convert board coordinates to canvas coordinates
  var b2c = function(i, spacing, lineWidth) {
    return (i + 1) * spacing + i * lineWidth;
  }

  // convert canvas cordinates to board coordinates
  var c2b = function(x, spacing, lineWidth) {
    var offset = (x - spacing) % (spacing + lineWidth);
    var bc = Math.floor((x - spacing) / (spacing + lineWidth));
    var error = config.canvas.er * spacing;
    if (offset < error) {
      return bc;
    } else if (spacing - offset < error) {
      return bc + 1;
    } else {
      return -1;
    }
  }

  return {
    l2n: l2n,
    n2l: n2l,
    b2c: b2c,
    c2b: c2b
  };
})();
