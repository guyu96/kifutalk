var BoardCanvas = function(canvas, ctx, driver) {
  this.canvas = canvas;
  this.ctx = ctx;
  this.driver = driver;

  // set canvas size (pixels)
  this.px = (config.sz + 1) * config.canvas.sp + config.sz * config.canvas.lw;
  this.canvas.width = this.px;
  this.canvas.height = this.px;

  // attach event listener to canvas
  this.addBoardEventListeners();
  this.addGlobalEventListeners();

  // first render
  this.render();
};

BoardCanvas.prototype.drawBackground = function() {
  this.ctx.fillStyle = config.colors.bg;
  this.ctx.fillRect(0, 0, this.px, this.px);
};

BoardCanvas.prototype.drawGrid = function() {
  this.ctx.lineWidth = config.canvas.lw;
  this.ctx.strokeStyle = config.colors.line;

  var size = config.sz;
  var spacing = config.canvas.sp;
  var lw = config.canvas.lw;
  var x = spacing, y = spacing;

  // begin drawing
  this.ctx.beginPath();
  for (var i = 0; i < config.sz; i++) {
    // draw vertical line
    this.ctx.moveTo(x + i * (spacing + lw), y);
    this.ctx.lineTo(x + i * (spacing + lw), size * (spacing + lw));
    // draw horizontal line
    this.ctx.moveTo(x, y + i * (spacing + lw));
    this.ctx.lineTo(size * (spacing + lw), y + i * (spacing + lw));
  }
  this.ctx.stroke();
  this.ctx.closePath();
};

BoardCanvas.prototype.drawStarPoints = function() {
  this.ctx.fillStyle = config.colors.star;

  var spacing = config.canvas.sp;
  var lw = config.canvas.lw;

  this.ctx.beginPath();
  constants.stars.forEach(function(star) {
    var x = utils.b2c(star[1], spacing, lw);
    var y = utils.b2c(star[0], spacing, lw);
    this.ctx.moveTo(x, y);
    this.ctx.arc(x, y, spacing * config.canvas.sr, 0, 2 * Math.PI, false);
  }, this);
  this.ctx.fill();
  this.ctx.closePath();
};

BoardCanvas.prototype.drawStones = function() {
  var grid = this.driver.board.grid;
  var size = config.sz;
  var spacing = config.canvas.sp;
  var lw = config.canvas.lw;

  for (var i = 0; i < size; i++) {
    for (var j = 0; j < size; j++) {
      if (grid[i][j] !== '.') {
        this.ctx.beginPath();
        // set stone color
        this.ctx.fillStyle = config.colors[grid[i][j]];

        // find canvas coordinates
        var x = utils.b2c(j, spacing, lw);
        var y = utils.b2c(i, spacing, lw);
        this.ctx.moveTo(x, y);

        // draw stones
        this.ctx.arc(x, y, config.canvas.st * spacing, 0, 2 * Math.PI, false);
        this.ctx.fill();
        this.ctx.closePath();
      }
    }
  }
};

BoardCanvas.prototype.drawMarkers = function() {
  var markers = this.driver.markerLayer;
  var size = config.sz;
  var spacing = config.canvas.sp;
  var lw = config.canvas.lw;

  for (var i = 0; i < size; i++) {
    for (var j = 0; j < size; j++) {
      if (markers[i][j] !== '') {
        // find canvas coordinates
        var x = utils.b2c(j, spacing, lw);
        var y = utils.b2c(i, spacing, lw);
        this.ctx.moveTo(x, y);
        this.ctx.beginPath();
        switch (markers[i][j]) {
          // next moves
          case 'n':
            this.ctx.fillStyle = config.colors.n;
            this.ctx.arc(x, y, config.canvas.nx * spacing,
                         0, 2 * Math.PI, false);
            this.ctx.fill();
            break;
          // most recent moves (black or white)
          case 'rb':
            this.ctx.strokeStyle = config.colors['w'];
            this.ctx.lineWidth = config.canvas.mw * lw;
            this.ctx.arc(x, y, config.canvas.mk * spacing,
                         0, 2 * Math.PI, false);
            this.ctx.stroke();
            break;
          case 'rw':
            this.ctx.strokeStyle = config.colors['b'];
            this.ctx.lineWidth = config.canvas.mw * lw;
            this.ctx.arc(x, y, config.canvas.mk * spacing,
                         0, 2 * Math.PI, false);
            this.ctx.stroke();
            break;
          /* todo: implement the markers below */
          // triangle
          case 't':
            break;
          // circle
          case 'c':
            break;
          // square
          case 's':
            break;
          default:
            console.log('Unknown marker: ' + markers[i][j]);
        }
        this.ctx.closePath();
      }
    }
  }
};

// render the board with helper functions above
BoardCanvas.prototype.render = function() {
  this.drawBackground();
  this.drawGrid();
  this.drawStarPoints();
  this.drawStones();
  this.drawMarkers();
};

// control functions (see gametree.js and driver.js)
// sync canvas with driver
BoardCanvas.prototype.next = function(childIndex) {
  if (this.driver.next(childIndex)) {
    this.render();
    return true;
  }
  return false;
};

BoardCanvas.prototype.prev = function() {
  if (this.driver.prev()) {
    this.render();
    return true;
  }
  return false;
};

BoardCanvas.prototype.play = function(row, col) {
  if (this.driver.play(row, col)) {
    this.render();
    return true;
  }
  return false;
};

BoardCanvas.prototype.pass = function() {
  if (this.driver.pass()) {
    this.render();
    return true;
  }
  return false;
};

BoardCanvas.prototype.delete = function() {
  if (this.driver.delete()) {
    this.render();
    return true;
  }
  return false;
};

// attach event listeners to canvas
BoardCanvas.prototype.addBoardEventListeners = function() {
  var self = this;

  // left click plays a move or chooses a variation
  this.canvas.addEventListener('click', function(e) {
    // get board coordinates
    var rect = self.canvas.getBoundingClientRect();
    var bx = utils.c2b(e.clientX - rect.left, config.canvas.sp, config.canvas.lw);
    var by = utils.c2b(e.clientY - rect.top, config.canvas.sp, config.canvas.lw);

    // check for invalid coordinates
    if (bx == -1 || by == -1) {
      return;
    }

    // check if clicking on an existing variation
    var playVars = self.driver.gameTree.nextVar.play;
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
  this.canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    self.delete();
  });
};

// attach event listeners to the entire page
// this is for keyboard control
BoardCanvas.prototype.addGlobalEventListeners = function() {
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
