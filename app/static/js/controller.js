var Controller = function(kifu, kifuComments, boardCanvas) {
  this.kifu = kifu;
  this.kifuComments = kifuComments;

  this.boardCanvas = boardCanvas;
  this.commentList = document.getElementById('comment-list');
  this.commentForm = document.getElementById('comment-form');
  this.commentInput = document.getElementById('comment-input');
  this.commentSubmit = document.getElementById('comment-submit');
  this.blackInfo = document.getElementById('black').getElementsByTagName('span')[0];
  this.whiteInfo = document.getElementById('white').getElementsByTagName('span')[0];
  this.komi = document.getElementById('komi');
  this.result = document.getElementById('result');

  this.addCanvasEventListeners();
  this.addKeyboardEventListeners();
  this.addNavigationEventListeners();
  this.addCommentEventListeners();
  this.addEditEventListeners();

  // advance to the first node that has valid next variations
  // see gametree.js for more info
  var gameTree = this.boardCanvas.driver.gameTree;
  while (!gameTree.atEnd() && !gameTree.hasValidNextVar()) {
    this.next();
  }

  // set game information
  var info = gameTree.infoString();
  this.blackInfo.textContent = info.blackPlayer + ' ' + info.blackRank;
  this.whiteInfo.textContent = info.whitePlayer + ' ' + info.whiteRank;
  this.komi.textContent = 'Komi: ' + info.komi;
  this.result.textContent = 'Result: ' + info.result;

  this.updateCommentList();
}

Controller.prototype.postComment = function(comment) {
  var kifuID = this.kifu.id;
  var nodeID = this.boardCanvas.driver.gameTree.currentNode.id;
  var self = this;

  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
    // post initiated
    if (xhr.readyState === 1) {
      // disable submit button
      self.commentSubmit.disabled = true;
    // post successful
    } else if (xhr.readyState === 4 && xhr.status === 200) {
      // add current comment to kifuComments
      var comment = JSON.parse(xhr.responseText);
      if (!self.kifuComments[nodeID]) {
        self.kifuComments[nodeID] = [comment];
      } else {
        self.kifuComments[nodeID].push(comment);
      }
      // re-enable submit button
      self.commentSubmit.disabled = false;
      // clear comment field
      self.commentInput.value = '';
      // update comment-list
      self.updateCommentList();
    }
  });

  // send post request to server
  var url = '/comment/' + kifuID + '/' + nodeID;
  var data = JSON.stringify(comment);
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send(data);
};

Controller.prototype.createCommentElement = function(comment) {
  var c = document.createElement('li');
  var author = document.createElement('span');
  var timestamp = document.createElement('span');
  var text = document.createElement('p');

  author.textContent = comment.author_username;
  timestamp.textContent = comment.timestamp;
  text.textContent = comment.content;

  c.classList.add('comment');
  author.classList.add('user');
  timestamp.classList.add('time');
  text.classList.add('text');

  c.appendChild(author);
  c.appendChild(timestamp);
  c.appendChild(text);

  return c;
};

Controller.prototype.updateCommentList = function() {
  this.commentList.innerHTML = '';
  var nodeID = this.boardCanvas.driver.gameTree.currentNode.id;
  var comments = this.kifuComments[nodeID];
  // if comments exist
  if (comments) {
    var self = this;
    comments.forEach(function(comment) {
      self.commentList.appendChild(self.createCommentElement(comment));
    });
  // if there are no comments yet
  } else {
    var noComment = document.createElement('p');
    noComment.classList.add('no-comment');
    noComment.textContent = 'No comments';
    this.commentList.appendChild(noComment);
  }
}

Controller.prototype.next = function(childIndex) {
  if (this.boardCanvas.next(childIndex)) {
    this.updateCommentList();
    return true;
  }
  return false;
};
Controller.prototype.prev = function() {
  if (this.boardCanvas.prev()) {
    this.updateCommentList();
    return true;
  }
  return false;
};
Controller.prototype.play = function(row, col) {
  if (this.boardCanvas.play(row, col)) {
    this.updateCommentList();
    return true;
  }
  return false;
};
Controller.prototype.pass = function() {
  if (this.boardCanvas.pass()) {
    this.updateCommentList();
    return true;
  }
  return false;
};
Controller.prototype.delete = function() {
  if (this.boardCanvas.delete()) {
    this.updateCommentList();
    return true;
  }
  return false;
};

// add event listeners to canvas
Controller.prototype.addCanvasEventListeners = function() {
  var bc = this.boardCanvas;
  var self = this;

  // left click plays a move or chooses a variation
  bc.canvas.addEventListener('click', function(e) {
    // get board coordinates
    var rect = bc.canvas.getBoundingClientRect();
    var bx = utils.c2b(e.clientX - rect.left, config.canvas.sp/bc.scale, config.canvas.lw);
    var by = utils.c2b(e.clientY - rect.top, config.canvas.sp/bc.scale, config.canvas.lw);

    // check for invalid coordinates
    if (bx == -1 || by == -1) {
      return;
    }

    // check if clicking on an existing variation
    var playVars = bc.driver.gameTree.nextVar.play;
    console.log(playVars);
    var index = -1;
    for (var i = 0; i < playVars.length; i++) {
      if (playVars[i].row === by && playVars[i].col === bx) {
        index = playVars[i].index;
        break;
      }
    }

    // plays a move
    if (index === -1) {
      self.play(by, bx);
    // chooses a variation
    } else {
      self.next(index);
    }
  });

  // right click deletes the current node
  this.boardCanvas.canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    self.delete();
  });
};

// enable keyboard navigation and control
Controller.prototype.addKeyboardEventListeners = function() {
  var self = this;
  document.onkeydown = function(e) {
    switch (e.keyCode) {
      // left arrow goes to parent node 
      case 37:
        self.prev();
        break;
      // right arrow goes to next node (first child)
      case 39:
        self.next();
        break;
      // 'p' passes
      case 80:
        self.pass();
        break;
    }
  }
};

// add event listeners to navigation
Controller.prototype.addNavigationEventListeners = function() {
  var self = this;
};

// add event listeners to comment-list and comment-form
Controller.prototype.addCommentEventListeners = function() {
  var self = this;
  // submit comment
  this.commentForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var formData = new FormData(self.commentForm);
    self.postComment(formData.get('comment-input'));
  });
};

// add event listeners to editting section
Controller.prototype.addEditEventListeners = function() {

};
