// maintain consistency between canvas and driver
var BoardCanvas = function(canvas, ctx, driver) {
  this.canvas = canvas;
  this.ctx = ctx;
  this.driver = driver;

  // set canvas size in pixels
  // this is twice as large as it should be for clarity
  var px = (config.sz + 1) * config.canvas.sp + config.sz * config.canvas.lw;
  this.canvas.width = px;
  this.canvas.height = px;
  var realPX = config.canvas.px + 'px';
  this.canvas.style.width = realPX;
  this.canvas.style.height = realPX;

  // calculate scale factor
  this.scale = px / config.canvas.px;

  // first render
  this.render();
};

BoardCanvas.prototype.drawBackground = function() {
  this.ctx.fillStyle = config.colors.bg;
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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

BoardCanvas.prototype.drawIndicators = function() {
  var indicators = this.driver.indicatorLayer;
  var size = config.sz;
  var spacing = config.canvas.sp;
  var lw = config.canvas.lw;

  for (var i = 0; i < size; i++) {
    for (var j = 0; j < size; j++) {
      if (indicators[i][j] !== '') {
        // find canvas coordinates
        var x = utils.b2c(j, spacing, lw);
        var y = utils.b2c(i, spacing, lw);
        this.ctx.moveTo(x, y);
        this.ctx.beginPath();
        switch (indicators[i][j]) {
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
          // next moves indicators (represented as numbers)
          default:
            var varNum = indicators[i][j];
            // draw brackground
            var squareRadius = config.canvas.nx * spacing;
            this.ctx.fillStyle = config.colors.n;
            this.ctx.rect(x-squareRadius, y-squareRadius, 2*squareRadius, 2*squareRadius);
            this.ctx.fill();
            // draw variation number
            if (varNum.length === 1) {
              this.ctx.font = '700 30px monospace';
            } else if (varNum.length === 2) {
              this.ctx.font = '700 25px monospace';
            // more than 100 variations at a node? probably not gonna happen.
            } else {
              this.ctx.font = '700 20px monospace';
            }
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = config.colors['w'];
            this.ctx.fillText(varNum, x, y+(squareRadius/2));
            break;
            console.log('Unknown marker: ' + indicators[i][j]);
        }
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

        this.ctx.strokeStyle = config.colors['mk'][
          this.driver.board.grid[i][j]
        ];
        this.ctx.lineWidth = config.canvas.mw * lw;

        switch (markers[i][j]) {
          // triangle
          case 't':
            var p1x = x+1, p1y = y+1 - spacing/2;
            var p2x = x+1 + spacing*3/8, p2y = y+1 + spacing/4;
            var p3x = x+2 - spacing*Math.sqrt(3)/4, p3y = y+1 + spacing/4;
            this.ctx.moveTo(p1x, p1y);
            this.ctx.lineTo(p2x, p2y);
            this.ctx.moveTo(p2x, p2y);
            this.ctx.lineTo(p3x, p3y);
            this.ctx.moveTo(p3x, p3y);
            this.ctx.lineTo(p1x, p1y);
            break;
          // square
          case 's':
            var side = spacing / Math.sqrt(2);
            this.ctx.strokeRect(x+1 - side/2, y+1 - side/2, side-2, side-2);
            break;
          // TODO: draw circile and X
        }

        this.ctx.stroke();
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
  this.drawIndicators();
  this.drawMarkers();
};

// render without markers/indicators
BoardCanvas.prototype.simpleRender = function() {
  this.drawBackground();
  this.drawGrid();
  this.drawStarPoints();
  this.drawStones();
}

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

BoardCanvas.prototype.addStone = function(row, col, stone) {
  if (this.driver.addStone(row, col, stone)) {
    this.render();
    return true;
  }
  return false;
};

BoardCanvas.prototype.addMarker = function(row, col, marker) {
  if (this.driver.addMarker(row, col, marker)) {
    this.render();
    return true;
  }
  return false;
};
