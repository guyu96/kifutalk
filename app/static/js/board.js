// go board class declaration
var Board = function (size, stars, toPlay) {
  this.size = size; // board dimension
  this.stars = stars; // star point indices

  this.grid = []; // 2d array representation of board
  for (var i = 0; i < size; i++) {
    var row = [];
    for (var j = 0; j < size; j++) {
      // empty location on board represented as '.'
      row.push('.');
    }
    this.grid.push(row);
  }

  this.prevGrid = null; // previous board configuration, used for KO checking
  this.toPlay = toPlay? toPlay: 'b'; // black plays first

  // a list of moves played, along with the stones captured by each move
  this.history = [];
};

// remove all markers from board
Board.prototype.removeMarkers = function() {
  for (var i = 0; i < this.size; i++) {
    for (var j = 0; j < this.size; j++) {
      if (this.grid[i][j] !== 'b' && this.grid[i][j] !== 'w') {
        this.grid[i][j] = '.';
      } 
    }
  }
}

// add stone to board
Board.prototype.add = function(row, col, type) {
  if (!this.isValidLocation(row, col)) {
    console.log('Invalid location');
    return false
  }

  if (constants.st.indexOf(type) === -1) {
    console.log('Invalid stone');
    return false;
  }

  if (this.grid[row][col] !== '.') {
    console.log("Can't add stone at occupied spot");
    return false;
  }
  
  this.grid[row][col] = type;
  return true;
};

// remove a stone or marker from board
Board.prototype.remove = function(row, col) {
  if (!this.isValidLocation(row, col)) {
    console.log('Invalid location');
  } else {
    this.grid[row][col] = '.';
  }
}

// check if row, col are valid
Board.prototype.isValidLocation = function(row, col) {
  if (row < 0 || row >= this.size)
    return false;
  if (col < 0 || col >= this.size)
    return false;
  return true;
};

// get a size-by-size array of false
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

  constants.dir.forEach(function(d) {
    this.chainAtHelper(row+d[0], col+d[1], color, chain, visitedFlags);
  }, this);
};

// find a chain of stones of the same color
Board.prototype.chainAt = function(row, col) {
  if (!this.isValidLocation(row, col))
    return [];

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
  if (this.isValidLocation(row, col) && !flags[row][col])
    if (this.grid[row][col] !== 'b' && this.grid[row][col] !== 'w') {
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
    constants.dir.forEach(function(d) {
      lib += this.libertyHelper(row+d[0], col+d[1], flags);
    }, this);
  }
  return lib;
};

// return chains (if any) captured by placing stone at row, col
Board.prototype.getCapture = function(row, col, stone) {
  if (!this.isValidLocation(row, col)) {
    console.error('out of bounds');
    return [];
  }
  if (this.grid[row][col] === 'b' || this.grid[row][col] === 'w') {
    console.error('error checking capture: illegal move at occupied location');
    return [];
  }

  var capture = [];
  var chain, lib, r, c;
  constants.dir.forEach(function(d) {
    r = row + d[0];
    c = col + d[1];
    if (this.isValidLocation(r, c)) {
      // neighboring location must have stone of opposite color
      if (this.grid[r][c] !== '.' && this.grid[r][c] !== stone) {
        // check for capture
        chain = this.chainAt(r, c);
        lib = this.countLiberty(chain);
        // if lib = 1, then stone will capture
        if (lib == 1)
          capture.push(chain);
      }
    }
  }, this);
  return capture;
}


// playing a move at row, col
Board.prototype.play = function(row, col) {
  if (!this.isValidLocation(row, col)) {
    console.error('Out of bounds error');
    return false;
  }

  if (this.grid[row][col] === 'b' || this.grid[row][col] === 'w') {
    console.error('Cannot play on an occupied spot');
    return false;
  }

  // construct a copy of the current board state
  var gridCopy = [];
  var i, j;
  for (i = 0; i < this.size; i++) {
    var row_copy = [];
    for (j = 0; j < this.size; j++) {
      row_copy.push(this.grid[i][j]);
    }
    gridCopy.push(row_copy);
  }

  // remove captured stones and place the move
  var captures = this.getCapture(row, col, this.toPlay);
  var grid = this.grid;
  captures.forEach(function(capChain) {
    capChain.forEach(function(cap) {
      grid[cap[0]][cap[1]] = '.';
    })
  });
  this.grid[row][col] = this.toPlay;

  // suicide move
  if (this.countLiberty(this.chainAt(row, col)) === 0) {
    this.grid = gridCopy;
    console.error('Suicide move is illegal');
    return false;
  }
  // check for KO
  if (this.prevGrid) {
    var identicalFlag = true;
    for (i = 0; i < this.size; i++) {
      for (j = 0; j < this.size; j++) {
        if (this.prevGrid[i][j] !== this.grid[i][j])
          identicalFlag = false;
      }
    }
    // KO error
    if (identicalFlag) {
      this.grid = gridCopy;
      console.error('Cannot retake KO immediately');
      return false;
    }
  }
  // legal move
  this.history.push({
    'player': this.toPlay,
    'pos': [row, col],
    'cap': captures
  });
  this.prevGrid = gridCopy;
  this.toPlay = (this.toPlay === 'b') ? 'w' : 'b';
  return true;
}

// pass
Board.prototype.pass = function() {
  // switch player
  this.toPlay = (this.toPlay === 'b') ? 'w' : 'b';
  // add pass entry to history
  this.history.push('p');
}

// undo the move from grid
Board.prototype.undoHelper = function(move, grid) {
  // remove move from grid
  grid[move.pos[0]][move.pos[1]] = '.';

  // restore captured stones
  var capColor = move.player === 'b' ? 'w': 'b';
  move.cap.forEach(function(capChain) {
    capChain.forEach(function(c) {
      grid[c[0]][c[1]] = capColor;
    })
  });
}

// undo the most recent move
Board.prototype.undo = function() {
  // if there is no move to undo
  if (this.history.length === 0) {
    return;
  }

  // remove last move from grid
  var lastMove = this.history.pop();
  // if last move is pass
  if (lastMove === 'p') {
    this.toPlay = (this.toPlay === 'b') ? 'w' : 'b';
  // not pass
  } else {
    this.undoHelper(lastMove, this.grid);
    // reset toPlay
    this.toPlay = lastMove.player;

    // restore prevGrid
    if (this.history.length === 0) {
      this.prevGrid = null;
    } else if (this.history[this.history.length - 1] !== 'p') {
      this.undoHelper(this.history[this.history.length - 1], this.prevGrid);
    }
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
