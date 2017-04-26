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

  // valid stone/marker types
  var validStoneAndMarkers = [
    '.', // empty

    /* stones */
    'b', // black stone
    'w', // white stone

    /* markers */
    'n',  // next moves
    'rw', // white most recent move
    'rb', // black most recent move
    't', // triangle <-> TR
    'c', // circle <-> CR
    's', // square <-> SQ
    'x' // X <-> MA
  ];

  return {
    dir: directions,
    stars: stars[config.sz],
    stmk: validStoneAndMarkers
  };
})();
