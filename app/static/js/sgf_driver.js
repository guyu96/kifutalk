// For this program to function properly, a global
// canvas and ctx must be declared before creating
// any SGFDriver instances


// convert letter coordinate to number
function l2n(ch) {
  // 'a' has ASCII code 97
  return ch.toLowerCase().charCodeAt(0) - 97;
} 

// convert number coordinate to letter
function n2l(n) {
  return String.fromCharCode(n + 97);
}

// implements game playback on a board
var SGFDriver = function(sgfStr) {
  // parse sgfStr into a game tree
  // this.root = new Node(null);
  // parse(sgfStr, this.root, 0);
  // TEMPORARY FIX FOR REVISED SGF API
  var gt = parse(sgfStr);
  this.root = gt.root;
  
  // initialize new empty board
  this.board = new Board(19, stars);

  // initialize current move and current comment
  this.move = this.root;
  this.comment = '';

  // set the game up
  this.setup();
  this.bind();
}

// get possible next moves
SGFDriver.prototype.getNext = function() {
  var nextMoves = [];
  var i, j, action;
  for (i = 0; i < this.move.children.length; i++) {
    child = this.move.children[i];
    for (j = 0; j < child.actions.length; j++) { 
      action = child.actions[j];
      if (action.prop === 'B' || action.prop === 'W') {
        if (this.board.toPlay.toUpperCase() !== action.prop) {
          console.log('SGF error: wrong player');
        // [tt] also means pass
        } else if (action.value !== '' && action.value !== 'tt') {
          nextMoves.push({
            'chdIdx': i,
            'row': l2n(action.value[1]),
            'col': l2n(action.value[0])
          });
        } else {  
          nextMoves.push('p');
        }
        break;
      }
    }
  }
  return nextMoves;
}

// render board and info
SGFDriver.prototype.render = function() {
  document.querySelector('#pass').style = '';
  this.board.removeMarkers();

  // add next-move markers
  this.getNext().forEach(function(move) {
    // handle pass
    if (move === 'p') {
      document.querySelector('#pass').style.color = 'red';
    } else {
      this.board.add(move.row, move.col, 'n');
    }
  }, this);

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

function handleClick(event) {
  var rect = canvas.getBoundingClientRect();
  var bx = c2b(event.clientX - rect.left, config.sp, config.lw);
  var by = c2b(event.clientY - rect.top, config.sp, config.lw);
  if (bx == -1 || by == -1)
    return;

  // if click position is valid
  // get placement setting
  // var placement = document.querySelector('input[name="placement"]:checked').value;
  // placement setting is ignored atm
  board.play(by, bx);
  renderBoard(board, canvas, ctx);
}

// Add event listeners to buttons
SGFDriver.prototype.bind = function() {
  var sd = this;

  document.onkeydown = function(e) {
    if (e.keyCode == '37') {
      sd.prev();
    } else if (e.keyCode == '39') {
      sd.next();
    } else if (e.keyCode == '80') {
      sd.pass();
    }
  }

  document.querySelector('#next').addEventListener('click', function() {
    sd.next();
  });

  document.querySelector('#prev').addEventListener('click', function() {
    sd.prev();
  });

  document.querySelector('#pass').addEventListener('click', function() {
    sd.pass();
  });

  // right click anywhere on board to delete last move
  canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    sd.deleteLast();
  });

  // left click chooses/adds variation
  canvas.addEventListener('click', function(e) {
    var rect = canvas.getBoundingClientRect();
    var bx = c2b(e.clientX - rect.left, config.sp, config.lw);
    var by = c2b(e.clientY - rect.top, config.sp, config.lw);
    var nextMoves, move, i;

    if (bx !== -1 && by !== -1) {
      nextMoves = sd.getNext();
      // check if the click is on an existing game tree
      for (i = 0; i < nextMoves.length; i++) {
        move = nextMoves[i];
        if (move.row === by && move.col === bx) {
          sd.next(move.chdIdx);
          return;
        }
      }
      // the click is somewhere else on the board
      if (sd.board.play(by, bx)) {
        // create a new mode (node)
        var node = new Node(sd.move);
        node.addAction(
          sd.board.toPlay === 'b' ? 'W' : 'B',
          n2l(bx)+ n2l(by) 
        );
        // add it as a child of the current move
        sd.move.addChild(node);
        sd.move = node;
        sd.render();
      }
    }
  });
};

// helper function that executes an action
// an action is the same as a SGF tag
SGFDriver.prototype.execAction = function(action) {
  switch(action.prop) {
    // add black stone
    case 'AB':
      this.board.add(l2n(action.value[1]), l2n(action.value[0]), 'b');
      break;
    // add white stone
    case 'AW':
      this.board.add(l2n(action.value[1]), l2n(action.value[0]), 'w');
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
      } else if (action.value === '' || action.value === 'tt') {
        this.board.pass();
      } else {
        if (!this.board.play(l2n(action.value[1]), l2n(action.value[0]))) {
          // illegal play
          return false;
        }
      }
      break;
    default:
      console.log('unknown sgf tag: ' + action.prop);
  }
  // action execution successful
  return true;
};

// helper function that undoes an action
SGFDriver.prototype.undoAction = function(action) {
  switch (action.prop) {
    // remove a stone
    case 'AB':
    case 'AW':
      this.board.remove(l2n(action.value[1]), l2n(action.value[0]));
      break;
    // clear comment
    case 'C':
      this.comment = '';
      break;
    // black or white plays
    case 'B':
    case 'W':
      if (this.board.toPlay.toUpperCase() !== action.prop) {
        this.board.undo();
      } else {
        console.log('SGF error: wrong player');
      }
      break;
    default:
      console.log('unknown sgf tag: ' + action.prop);
  }
}

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

  // reset comments
  var prevComment = this.comment;
  this.comment = '';

  // execute actions
  for (var i = 0; i < this.move.actions.length; i++) {
    // if action execution failed
    if (!this.execAction(this.move.actions[i])) {
      // undo all previous actions (in reverse order)
      for (var j = i-1; j >= 0; j--) {
        this.undoAction(this.move.actions[j]);
      }
      console.error('Action invalid: ', this.move.actions[i]);
      // restore move pointer and previous comment
      this.move = this.move.parent;
      this.comment = prevComment;
    }
  }

  this.render();
}

// go to the parent node in the game tree and undo changes in board
SGFDriver.prototype.prev = function() {
  if (this.move === this.root.children[0]) {
    // check if already at the beginning
    console.log('Already at the beginning');
    return;
  }

  // undo current move
  this.move.actions.forEach(function(action) {
    this.undoAction(action);
  }, this);

  this.move = this.move.parent;

  this.move.actions.forEach(function(action) {
    // restore past comment
    if (action.prop === 'C') {
      this.execAction(action);
    } 
  }, this);

  this.render();
}

// player passes
SGFDriver.prototype.pass = function() {
  // look for existing pass node
  var i, j, child, action;
  var flag = false;
  // set the flag if pass move found
  for (i = 0; i < sd.move.children.length; i++) {
    child = sd.move.children[i];
    for (j = 0; j < child.actions.length; j++) {
      action = child.actions[j];
      if (action.prop === sd.board.toPlay.toUpperCase()) {
        if (action.value === '' || action.value === 'tt') {
          flag = true;
        }
      }
      if (flag) {
        break;
      }
    }
    if (flag) {
      break;
    }
  }

  // if pass node found
  if (flag) {
    sd.next(i);
  // no pass node found, create new pass node
  } else {
    var node = new Node(sd.move);
    node.addAction(
      sd.board.toPlay === 'b' ? 'B' : 'W',
      ''
    );
    // add it as a child of the current move
    sd.move.addChild(node);
    sd.move = node;

    sd.board.pass();
  }

  sd.render();
}

// delete the last move (and all its variations)
SGFDriver.prototype.deleteLast = function() {
  var node = sd.move;
  // undo last move
  sd.prev();
  // unlink the move
  var i;
  for (i = 0; i < sd.move.children.length; i++) {
    if (sd.move.children[i] === node) {
      break;
    }
  }
  sd.move.children.splice(i, 1);
  node.parent = null;
  // rerender
  sd.render();
}
