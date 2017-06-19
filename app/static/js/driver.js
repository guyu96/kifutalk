// maintains consistency between board and game tree
var Driver = function(sgfStr) {
  this.board = new Board(config.sz, constants.stars);
  this.gameTree = SGF.parse(sgfStr);

  // a layer of indicators to be drawn on top of the board
  this.indicatorLayer = []; // most recent move, next move
  // a layer of markers to be drawn on top of the board
  this.markerLayer = []; // triangle, square, etc.

  // note: each board position can have at most 1 indicator AND 1 marker

  for (var i = 0; i < config.sz; i++) {
    var iRow = [];
    var mRow = [];
    for (var j = 0; j < config.sz; j++) {
      iRow.push('');
      mRow.push('');
    }
    this.indicatorLayer.push(iRow);
    this.markerLayer.push(mRow);
  }

  this.updateIndicatorLayer();
};

// helper function to clear a layer
// also returns a copy of the layer before it is cleared
Driver.prototype.clearLayer = function(layer) {
  var copy = [];
  for (var i = 0; i < config.sz; i++) {
    var row = []
    for (var j = 0; j < config.sz; j++) {
      row.push(layer[i][j]);
      layer[i][j] = '';
    }
    copy.push(row);
  }

  return copy;
}

// update indicator layer
// called when board/gameTree state changes
Driver.prototype.updateIndicatorLayer = function() {
  // clear the old layer first
  this.clearLayer(this.indicatorLayer);

  // next play variations
  // represented as numbers (e.g. first variation = 1)
  var plays = this.gameTree.nextVar.play;
  for (var i = 0; i < plays.length; i++) {
    this.indicatorLayer[plays[i].row][plays[i].col] = (i+1).toString();
  }

  // most recent move
  var history = this.board.history;
  if (history.length > 0) {
    // skip all passes
    var i = history.length - 1;
    while (i >= 0 && history[i] === 'p') {
      i--;
    }
    // if there exists a most recent move
    if (i >= 0) {
      var row = history[i].pos[0];
      var col = history[i].pos[1];
      this.indicatorLayer[row][col] = 'r' + history[i].player;
    }
  }
};

// helper function that executes an action
Driver.prototype.execAction = function(action) {
  switch(action.prop) {
    // add black stone
    case 'AB':
      var row = utils.l2n(action.value[1]);
      var col = utils.l2n(action.value[0]);
      this.board.add(row, col, 'b');
      break;
    // add white stone
    case 'AW':
      var row = utils.l2n(action.value[1]);
      var col = utils.l2n(action.value[0]);
      this.board.add(row, col, 'w');
      break;
    // black or white plays
    case 'B':
    case 'W':
      if (this.board.toPlay.toUpperCase() !== action.prop) {
        console.error('SGF error: wrong player');
      } else if (action.value === '' || action.value === 'tt') {
        this.board.pass();
      } else {
        var row = utils.l2n(action.value[1]);
        var col = utils.l2n(action.value[0]);
        // illegal play
        if (!this.board.play(row, col)) {
          return false;
        }
      }
      break;
    // add markers
    case 'TR':
      var row = utils.l2n(action.value[1]);
      var col = utils.l2n(action.value[0]);
      this.markerLayer[row][col] = 't';
      break;
    case 'CR':
      var row = utils.l2n(action.value[1]);
      var col = utils.l2n(action.value[0]);
      this.markerLayer[row][col] = 'c';
      break;
    case 'SQ':
      var row = utils.l2n(action.value[1]);
      var col = utils.l2n(action.value[0]);
      this.markerLayer[row][col] = 's';
      break;
    case 'MA':
      var row = utils.l2n(action.value[1]);
      var col = utils.l2n(action.value[0]);
      this.markerLayer[row][col] = 'x';
      break;
    default:
      console.log('unknown sgf tag: ' + action.prop);
  }
  // action execution successful
  return true;
};

// helper function that undoes an action
Driver.prototype.undoAction = function(action) {
  switch (action.prop) {
    // remove a stone
    case 'AB':
    case 'AW':
      var row = utils.l2n(action.value[1]);
      var col = utils.l2n(action.value[0]);
      this.board.remove(row, col);
      break;
    // undo a move
    case 'B':
    case 'W':
      if (this.board.toPlay.toUpperCase() !== action.prop) {
        this.board.undo();
      } else {
        console.error('SGF error: wrong player');
      }
      break;
    case 'TR':
    case 'CR':
    case 'SQ':
    case 'MA':
      var row = utils.l2n(action.value[1]);
      var col = utils.l2n(action.value[0]);
      this.markerLayer[row][col] = '';
      break;
    default:
      console.log('unknown sgf tag: ' + action.prop);
  }
};

// advance to the next node in game tree
Driver.prototype.next = function(childIndex) {
  // backup and clear markerLayer
  var markerBackup = this.clearLayer(this.markerLayer);

  if (this.gameTree.next(childIndex)) {
    var node = this.gameTree.currentNode;
    // execute actions
    for (var i = 0; i < node.actions.length; i++) {
      // if action execution failed
      if (!this.execAction(node.actions[i])) {
        // undo all previous actions (in reverse order)
        for (var j = i-1; j >= 0; j--) {
          this.undoAction(node.actions[j]);
        }
        console.error('Action invalid: ', node.actions[i]);
        this.gameTree.prev();

        // restore marker layer in case of failure
        this.markerLayer = markerBackup;
        return false;
      }
    }

    this.updateIndicatorLayer();
    return true;
  }

  // restore marker layer in case of failure
  this.markerLayer = markerBackup;
  return false;
};

// move to the previous node in game tree
Driver.prototype.prev = function() {
  // backup and clear markerLayer
  var markerBackup = this.clearLayer(this.markerLayer);

  var node = this.gameTree.currentNode;
  if (this.gameTree.prev()) {
    // undo actions
    node.actions.forEach(function(action) {
      this.undoAction(action);
    }, this);

    this.updateIndicatorLayer();
    return true;
  }

  // restore marker layer in case of failure
  this.markerLayer = markerBackup;
  return false;
};

// play a move on board
// add corresponding node to game tree
Driver.prototype.play = function(row, col) {
  // backup and clear markerLayer
  var markerBackup = this.clearLayer(this.markerLayer);

  var player = this.board.toPlay.toUpperCase();
  if (!this.board.play(row, col)) {
    // restore marker layer in case of failure
    this.markerLayer = markerBackup;
    return false
  }
  this.gameTree.play(player, row, col);
  this.updateIndicatorLayer();
  return true;
};

// pass
Driver.prototype.pass = function() {
  // backup and clear markerLayer
  var markerBackup = this.clearLayer(this.markerLayer);

  var player = this.board.toPlay.toUpperCase();
  if (this.gameTree.pass(player)) {
    this.board.pass();
    this.updateIndicatorLayer();
    return true;
  }

  // restore marker layer in case of failure
  this.markerLayer = markerBackup;
  return false;
};

// delete the current node
Driver.prototype.delete = function() {
  // backup and clear markerLayer
  var markerBackup = this.clearLayer(this.markerLayer);

  var node = this.gameTree.currentNode;
  if (this.gameTree.delete()) {
    node.actions.forEach(function(action) {
      this.undoAction(action);
    }, this);
    this.updateIndicatorLayer();
    return true;
  }

  // restore marker layer in case of failure
  this.markerLayer = markerBackup;
  return false;
};

Driver.prototype.addStone = function(row, col, stone) {
  // first check that stone can be added to board
  if (this.board.add(row, col, stone)) {
    // then modify game tree
    if (this.gameTree.addStone(row, col, stone)) {
      return true;
    }
    // game tree modification failed
    this.board.remove(row, col);
    return false;
  }
  return false;
};

Driver.prototype.addMarker = function(row, col, marker) {
  // first check that marker layer is empty at (row, col)
  if (this.markerLayer[row][col] === '') {
    // then modify game tree
    if (this.gameTree.addMarker(row, col, marker)) {
      this.markerLayer[row][col] = marker;
      return true;
    }
    // game tree modification failed
    return false;
  }
  return false;
};

// navigate to a node specified by its ID
Driver.prototype.navigateTo = function(nodeID) {
  // first go to root
  while (this.gameTree.currentNode !== this.gameTree.root) {
    this.prev();
  }
  // dfs to find node
  var node = null;
  var dfs = function(root) {
    if (root.id === nodeID) {
      node = root;
    } else {
      root.children.forEach(function(child) {
        dfs(child);
      });
    }
  };
  dfs(this.gameTree.currentNode);
  // node does not exist
  if (!node) {
    return false;
  }
  // node exists, backtrack to find the path
  var path = [];
  while (node !== this.gameTree.root) {
    path.push(node);
    node = node.parent;
  }
  // navigate to node
  for (var i = path.length-1; i >= 0; i--) {
    // get childIndex
    var children = this.gameTree.currentNode.children;
    for (var j = 0; j < children.length; j++) {
      if (children[j] === path[i]) {
        break;
      }
    }
    // go to that child
    this.next(j);
  }
  return true;
};

// create a deep clone of itself
Driver.prototype.clone = function() {
  var currentNodeID = this.gameTree.currentNode.id;
  var sgfStr = SGF.print(this.gameTree.root);
  // if currentNode has no valid ID
  if (currentNodeID <= -1) {
    return new Driver(sgfStr);
  }
  // advance to node with currentNodeID
  var driver = new Driver(sgfStr);
  driver.navigateTo(currentNodeID);
  return driver;
};
