var constants = (function() {
  // increments in row, col for each direction
  var directions = [
    [0, 1], // right
    [0, -1], // left
    [1, 0], // down
    [-1, 0] // up
  ];

  // coordinates of star points based on board size
  var stars = {
    19: [[3, 3], [3, 9], [3, 15],
         [9, 3], [9, 9], [9, 15],
         [15, 3], [15, 9], [15, 15]]
  };

  // valid stone types
  var validStones = [
    'b', // black stone
    'w' // white stone
  ];

  // valid indicators
  var validIndicators = [
    'n',  // next moves
    'rw', // most recent move (white)
    'rb' // most recent move (black)
  ];

  // valid marker types: SGF property
  var validMarkers = {
    't': 'TR', // triangle <-> TR
    'c': 'CR', // circle <-> CR
    's': 'SQ', // square <-> SQ
    'x': 'MA' // X <-> MA
  };

  // like validMarkers, but with keys and values reversed
  var validMarkerSGF = {
    'TR': 't',
    'CR': 'c',
    'SQ': 's',
    'MA': 'x'
  };

  // cursor modes that determine what clicking on the board does
  var cursor = {
    'PLAY_AND_SELECT': 1, // play a move or select a variation
    'ADD_BLACK': 2, // add a black stone
    'ADD_WHITE': 3, // add a white stone
    'MARK_TRIANGLE': 4, // make triangle mark
    'MARK_SQUARE': 5 // make square mark
  }

  return {
    dir: directions,
    stars: stars[config.sz],
    st: validStones,
    idct: validIndicators,
    mk: validMarkers,
    mkSGF: validMarkerSGF,
    cursor: cursor
  };
})();
