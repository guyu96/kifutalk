var GameTree = function(root, nextNodeID) {
  // root of the game tree
  this.root = root;

  // integer ID used to identify nodes in the game tree
  // increments when new node is added
  // does NOT decrement when node is deleted
  this.nextNodeID = nextNodeID;

  // the current active node in the game tree
  this.currentNode = root;

  // all valid next variations
  this.nextVar = {};
  this.updateNextVariations();

  // set first node with valid variations
  this.setFirstNode();

  // read game information
  this.gameInfo = {
    'PB': '', // black player
    'BR': '', // black rank
    'PW': '', // white player
    'WR': '', // white rank
    'KM': '', // komi
    'RE': '' // game result
  };
  for (var prop in this.gameInfo) {
    this.gameInfo[prop] = this.findValueByProp(prop);
  }

  // set to true when adding stones
  // group all stones added in one session into one node
  this.addStoneActive = false;
};

// update the next valid variations
// valid variations contain B, W (pass included), AB or AW
// the next valid variations will be visualized on board and control
GameTree.prototype.updateNextVariations = function() {
  this.nextVar = {
    // only 1 pass variation is possible
    // nextVar.pass refers to the index of pass in children[]
    'pass': -1,
    'play': [],
    'add': []
  };

  for (var i = 0; i < this.currentNode.children.length; i++) {
    var child = this.currentNode.children[i];
    for (var j = 0; j < child.actions.length; j++) {
      var prop = child.actions[j].prop;
      var val = child.actions[j].value;
      if (prop === 'B' || prop === 'W') {
        // a pass variation, anything other than -1 indicates that there is a pass
        if (val === '' || val === 'tt') {
          this.nextVar.pass = i;
        // a play variation contains play location and index in children[]
        } else {
          this.nextVar.play.push({
            'row': utils.l2n(val[1]),
            'col': utils.l2n(val[0]),
            'index': i
          });
        }
        break;
      } else if (prop === 'AB' || prop === 'AW') {
        // an add variation simply contains its index in children[]
        this.nextVar.add.push({
          'index': i
        });
        break;
      }
    }
  }
};

// check if there exists a valid next variation
GameTree.prototype.hasValidNextVar = function() {
  var nv = this.nextVar;
  if (nv.pass !== -1 || nv.play.length || nv.add.length) {
    return true;
  }
  return false;
}

// set and go to the first node that has a valid nextVar
GameTree.prototype.setFirstNode = function() {
  while (!this.atEnd() && !this.hasValidNextVar()) {
    this.next();
  }
  this.firstNode = this.currentNode;
}

// find value of a given property using DFS (assume prop is unique)
// used to extract game information
GameTree.prototype.findValueByProp = function(prop) {
  var value = '';

  // dfs helper
  var helper = function(node) {
    for (var i = 0; i < node.actions.length; i++) {
      if (node.actions[i].prop === prop) {
        value = node.actions[i].value;
        break;
      }
    }

    if (value === '') {
      node.children.forEach(function(child) {
        if (value === '') {
          helper(child);
        }
      });
    }
  }

  helper(this.root);
  return value;
};

// check if at the end of a particular variation
GameTree.prototype.atEnd = function() {
  return this.currentNode.children.length === 0;
};

// check if at beginning of game tree
GameTree.prototype.atBeginning = function() {
  return this.currentNode === this.root;
};

// check if at the first (valid) node of the game tree
GameTree.prototype.atFirstNode = function() {
  return this.currentNode === this.firstNode;
}

// advance to the next node in game tree
GameTree.prototype.next = function(childIndex) {
  if (this.atEnd()) {
    console.error('The end has been reached');
    return false;
  }

  childIndex = childIndex === undefined ? 0: childIndex;
  if (childIndex && childIndex >= this.currentNode.children.length) {
    console.error('Variation does not exist');
    return false;
  }

  this.currentNode = this.currentNode.children[childIndex];
  this.updateNextVariations();
  this.addStoneActive = false;
  return true;
};

// move to the previous node in game tree
GameTree.prototype.prev = function() {
  if (this.atBeginning()) {
    console.error('Already at the beginning');
    return false;
  }
  this.currentNode = this.currentNode.parent;
  this.updateNextVariations();
  this.addStoneActive = false;
  return true;  
};

// add a play node to game tree and advance to it
GameTree.prototype.play = function(player, row, col) {
  // construct play node
  var playNode = new Node(this.currentNode);
  playNode.addAction(
    player,
    utils.n2l(col) + utils.n2l(row)
  );
  playNode.id = this.nextNodeID;
  this.nextNodeID++;

  // attach play node
  this.currentNode.addChild(playNode);
  this.currentNode = playNode;
  this.updateNextVariations();
  this.addStoneActive = false;
  return true;
};

// delete the current node
GameTree.prototype.delete = function() {
  // cannot delete root of game tree
  if (this.currentNode === this.root) {
    return false;
  }

  var node = this.currentNode;
  this.currentNode = this.currentNode.parent;
  var children = this.currentNode.children;

  // detach node
  node.parent = null;
  var i;
  for (i = 0; i < children.length; i++) {
    if (children[i] === node) {
      break;
    }
  }
  children.splice(i, 1);

  this.updateNextVariations();
  this.addStoneActive = false;
  return true;
};

// pass (skip a turn)
GameTree.prototype.pass = function(player) {
  if (this.nextVar.pass !== -1) {
    this.next(this.nextVar.pass);
  } else {
    // construct pass node
    var passNode = new Node(this.currentNode);
    passNode.addAction(
      player,
      ''
    );
    passNode.id = this.nextNodeID;
    this.nextNodeID++;

    // attach pass node
    this.currentNode.addChild(passNode);
    this.currentNode = passNode;
    this.updateNextVariations();
  }
  this.addStoneActive = false;
  // return a boolean to futureproof possible pass failures
  // current all passes should succeed
  return true;
};

// add black and white stones
GameTree.prototype.addStone = function(row, col, stone) {
  // check for unknown stone types
  if (constants.st.indexOf(stone) === -1) {
    console.log('unknown stone: ' + stone);
    return false;
  }

  // continue adding stones
  if (this.addStoneActive) {
    this.currentNode.addAction(
      'A' + stone.toUpperCase(),
      utils.n2l(col) + utils.n2l(row)
    );
  // start new stone-adding session
  } else {
    this.addStoneActive = true;
    // create new node
    var addNode = new Node(this.currentNode);
    addNode.addAction(
      'A' + stone.toUpperCase(),
      utils.n2l(col) + utils.n2l(row)
    );
    addNode.id = this.nextNodeID;
    this.nextNodeID++;
    // attach add node
    this.currentNode.addChild(addNode);
    this.currentNode = addNode;
    this.updateNextVariations();
  }

  return true;
};

// add markers
GameTree.prototype.addMarker = function(row, col, marker) {
  // check for unknown marker types
  if (!constants.mk.hasOwnProperty(marker)) {
    return false;
  }
  markerSGF = constants.mk[marker];

  // markers are always added to the current node
  this.currentNode.addAction(
    markerSGF,
    utils.n2l(col) + utils.n2l(row)
  );

  return true;
};

GameTree.prototype.infoString = function() {
  return {
    'blackPlayer': this.gameInfo.PB? this.gameInfo.PB: 'Anonymous',
    'whitePlayer': this.gameInfo.PW? this.gameInfo.PW: 'Anonymous',
    'blackRank': this.gameInfo.BR? this.gameInfo.BR: '?',
    'whiteRank': this.gameInfo.WR? this.gameInfo.WR: '?',
    'komi': this.gameInfo.KM? this.gameInfo.KM: '?',
    'result': this.gameInfo.RE? this.gameInfo.RE: '?'
  };
};
