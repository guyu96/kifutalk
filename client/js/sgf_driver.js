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

// set the game up by reading the root's child
SGFDriver.prototype.setup = function() {
  // the root's (only) child contains the game's information
  this.move = this.move.children[0];

  this.move.actions.forEach(function(action) {
    this.execAction(action);
  }, this);

  renderBoard(this.board, canvas, ctx);
  document.querySelector('#comment-display p').textContent = this.comment;
}

// Add event listeners to buttons
SGFDriver.prototype.bind = function() {
  document.querySelector('#next').addEventListener('click', function() {
    this.next();
  }.bind(this));

  document.querySelector('#prev').addEventListener('click', function() {
    this.prev();
  }.bind(this));
};

// helper function that executes an action
// an action is the same as a SGF tag
SGFDriver.prototype.execAction = function(action) {
  switch(action.prop) {
    // add black stone
    case 'AB':
      this.board.addStone(l2n(action.value[0]), l2n(action.value[1]), 'b');
      break;
    // add white stone
    case 'AW':
      this.board.addStone(l2n(action.value[0]), l2n(action.value[1]), 'w');
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
  renderBoard(this.board, canvas, ctx);
  document.querySelector('#comment-display p').textContent = this.comment;
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
  renderBoard(this.board, canvas, ctx);

  // restore past comment
  this.comment = '';
  this.move.actions.forEach(function(action) {
    if (action.prop === 'C') {
      this.comment = action.value;
    } 
  }, this);
  document.querySelector('#comment-display p').textContent = this.comment;
}