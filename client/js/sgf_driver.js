// convert letter coordinate to number
function l2n(ch) {
  // 'A' has ASCII code 65
  return ch.toUpperCase().charCodeAt(0) - 65;
}

// where each SGF tag is implemented
var triggers = {
  'AB': function(action, sd) {
    sd.board.addStone(l2n(action.value[0]), l2n(action.value[1]), 'b');
  },
  'AW': function(action, sd) {
    sd.board.addStone(l2n(action.value[0]), l2n(action.value[1]), 'w');
  },
  'C': function(action, sd) {
    sd.comment = action.value;
  }
}

var SGFDriver = function(sgfStr) {
  // parse sgfStr into a game tree
  this.gameTreeRoot = new Node(null);
  parse(sgfStr, this.gameTreeRoot, 0);

  // initialize new empty board
  this.board = new Board(19, stars);

  // initialize current move and current comment
  this.move = this.gameTreeRoot;
  this.comment = '';

  // set the game up
  this.setup();
}

// set the game up by reading the root's child
SGFDriver.prototype.setup = function() {
  // the root's (only) child contains the game's information
  this.move = this.move.children[0];

  this.move.actions.forEach(function(action) {
    if (triggers[action.prop]) {
      triggers[action.prop](action, this);
    } else {
      console.log('unknown sgf prop name: ' + action.prop);
    }
  }, this);

  // render the board when set-up is done
  renderBoard(this.board, canvas, ctx);
}
