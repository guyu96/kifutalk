// go board class declaration
var Board = function (size, stars) {
  this.size = size;
  this.stars = stars;

  this.grid = [];
  for (var i = 0; i < size; i++) {
    var row = [];
    for (var j = 0; j < size; j++) {
      row.push('.'); // empty location on board
    }
    this.grid.push(row);
  }

  for (var i = 0; i < stars.length; i++) {
    var row = stars[i][0];
    var col = stars[i][1];
    this.grid[row][col] = '*';
  }
};


// print board to page for debugging purposes
Board.prototype.printToPage = function() {
  document.open();
  document.write('<pre>');
  for (var i = 0; i < this.size; i++) {
    document.write(this.grid[i].join(''));
    document.write('\n');
  }
  document.write('</pre>');
  document.close();
};

// add stone (or marker) to board
Board.prototype.addStone = function(row, col, type) {
  // row and col are 0-indexed
  if (type === 'b' || type === 'w')
    this.grid[row][col] = type;
  else
    // @todo handle marker stones.
    console.log('Invalid type');
};

// check if row, col are valid
Board.prototype.isValidLocation = function(row, col) {
  if (row < 0 || row >= this.size)
    return false;
  if (col < 0 || col >= this.size)
    return false;
  return true;
};

// get a size-x-size array of false
Board.prototype.getFlags = function() {
  var flags = [];
  for (var i = 0; i < this.size; i++) {
    flags.push([]);
    for (var j = 0; j < this.size; j++)
      flags[i].push(false);
  }
  return flags;
};

// dfs routine to help find chains
Board.prototype.chainAtHelper = function(row, col, color, chain, visitedFlags) {
  if (!this.isValidLocation(row, col))
    return
  if (this.grid[row][col] !== color)
    return
  if (visitedFlags[row][col])
    return

  chain.push([row, col]);
  visitedFlags[row][col] = true;

  this.chainAtHelper(row+1, col, color, chain, visitedFlags);
  this.chainAtHelper(row-1, col, color, chain, visitedFlags);
  this.chainAtHelper(row, col+1, color, chain, visitedFlags);
  this.chainAtHelper(row, col-1, color, chain, visitedFlags);
};

// find a chain of stones of the same color
Board.prototype.chainAt = function(row, col) {
  var color = this.grid[row][col];
  if (color !== 'b' && color !== 'w')
    return [];

  var visitedFlags = this.getFlags();

  var chain = [];
  this.chainAtHelper(row, col, color, chain, visitedFlags);

  return chain;
};

// help count liberty
Board.prototype.libertyHelper = function(row, col, flags) {
  if (this.isValidLocation(row, col))
    if (this.grid[row][col] === '.' && !flags[row][col]) {
      flags[row][col] = true;
      return 1;
    }
  return 0;
};

// count the liberty of a stone chain
Board.prototype.countLiberty = function(chain) {
  var flags = this.getFlags();
  var lib = 0;
  for (var i = 0; i < chain.length; i++) {
    var row = chain[i][0];
    var col = chain[i][1];
    if (flags[row][col]) {
      console.log('oopsie');
      continue;
    }
    // if not counted previously then proceed
    lib += this.libertyHelper(row+1, col, flags);
    lib += this.libertyHelper(row-1, col, flags);
    lib += this.libertyHelper(row, col+1, flags);
    lib += this.libertyHelper(row, col-1, flags);
  }
  return lib;
};


var test = function () {
  var stars = [
    [3, 3], [3, 9], [3, 15],
    [9, 3], [9, 9], [9, 15],
    [15, 3], [15, 9], [15, 15]
  ];
  var board = new Board(19, stars);

  board.addStone(3, 3, 'b');
  board.addStone(3, 4, 'b');
  board.addStone(4, 4, 'b');
  board.addStone(5, 4, 'b');
  board.addStone(4, 5, 'w');

  board.printToPage();
};

test();
