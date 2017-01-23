// convert letter coordinate to number
function l2n(ch) {
  // 'A' has ASCII code 65
  return ch.toUpperCase().charCodeAt(0) - 65;
}


// implements game playback on a board
var SGFDriver = function(sgfStr) {
  // parse sgfStr into a game tree
  this.root = new Node(null);
  parse(sgfStr, this.root, 0);

  // initialize new empty board
  this.board = new Board(19, stars);

  // initialize current move and current comment
  this.move = this.root;
  this.comment = '';

  // set the game up
  this.setup();
  this.bind();
}

// display possible next moves as red markers
SGFDriver.prototype.displayNext = function() {
  var i, action;
  this.move.children.forEach(function(child) {
    for (i = 0; i < child.actions.length; i++) { 
      action = child.actions[i];
      if (action.prop === 'B' || action.prop === 'W') {
        if (this.board.toPlay.toUpperCase() !== action.prop) {
          console.log('SGF error: wrong player');
        }
        this.board.add(l2n(action.value[0]), l2n(action.value[1]), 'n');
        break;
      }
    }
  }, this);
}

// render board and info
SGFDriver.prototype.render = function() {
  this.board.removeMarkers();
  this.displayNext();
  renderBoard(this.board, canvas, ctx);
  document.querySelector('#comment-display p').textContent = this.comment;
}

// set the game up by reading the root's child
SGFDriver.prototype.setup = function() {
  // the root's (only) child contains the game's information
  this.move = this.move.children[0];

  this.move.actions.forEach(function(action) {
    this.execAction(action);
  }, this);

  this.render();
}

// Add event listeners to buttons
SGFDriver.prototype.bind = function() {
  var sd = this;

  document.onkeydown = function(e) {
    if (e.keyCode == '37') {
       sd.prev();
    }
    else if (e.keyCode == '39') {
       sd.next();
    }
  }

  document.querySelector('#next').addEventListener('click', function() {
    sd.next();
  });

  document.querySelector('#prev').addEventListener('click', function() {
    sd.prev();
  });
};

// helper function that executes an action
// an action is the same as a SGF tag
SGFDriver.prototype.execAction = function(action) {
  switch(action.prop) {
    // add black stone
    case 'AB':
      this.board.add(l2n(action.value[0]), l2n(action.value[1]), 'b');
      break;
    // add white stone
    case 'AW':
      this.board.add(l2n(action.value[0]), l2n(action.value[1]), 'w');
      break;
    // read comment
    case 'C':
      this.comment = action.value;
      break;
    // black or white plays
    case 'B':
    case 'W':
      if (this.board.toPlay.toUpperCase() !== action.prop) {
        console.log('SGF error: wrong player');
      } else {
        this.board.play(l2n(action.value[0]), l2n(action.value[1]));
      }
      break;
    default:
      console.log('unknown sgf tag: ' + action.prop);
  }
};

// complete actions in current move and move to the next one
// if there are multiple possible next moves, choose children[childIndex]
SGFDriver.prototype.next = function(childIndex) {
  // check if the game has reached the end
  if (this.move.children.length === 0) {
    console.log('The end has been reached');
    return;
  }

  childIndex = childIndex === undefined? 0: childIndex;
  this.move = this.move.children[childIndex];

  this.comment = '';
  this.move.actions.forEach(function(action) {
    this.execAction(action);
  }, this);

  this.render();
}

// go to the parent node in the game tree and undo changes in board
SGFDriver.prototype.prev = function() {
  if (this.move === this.root.children[0]) {
    // check if already at the beginning
    console.log('Already at the beginning');
    return;
  }

  this.move = this.move.parent;
  this.board.undo();

  // restore past comment
  this.comment = '';
  this.move.actions.forEach(function(action) {
    if (action.prop === 'C') {
      this.comment = action.value;
    } 
  }, this);

  this.render();
}
