var colors = {
  'bg': '#F1C070',
  'line': '#623F16',
  'star': '#623F16',
  'b': '#464646',
  'w': '#F8F8F8',
  'n': '#E87566'
};

var config = {
  'lw': 1, // line width
  'sp': 30, // spacing relative to line width
  'er': 0.3, // click error range (see function c2b)
  'st': 0.5, // stone radius relative to spacing
  'mk': 0.3, // stone marker radius relative to spacing
  'mw': 2.5, // stone marker width relative to line width
  'sr': 0.1, // star point radius relative to spacing
  'nx': 0.2 // next move marker radius relative to spacing
};

// convert board coordinates to canvas coordinates
function b2c(i, spacing, lineWidth) {
  return (i + 1) * spacing + i * lineWidth;
}

// convert canvas cordinates to board coordinates
function c2b(x, spacing, lineWidth) {
  var offset = (x - spacing) % (spacing + lineWidth);
  var bc = Math.floor((x - spacing) / (spacing + lineWidth));
  var error = config.er * spacing;
  if (offset < error)
    return bc;
  if (spacing - offset < error)
    return bc + 1;
  return -1;
}

// handle click event
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

// render a board object
function renderBoard(board, canvas, ctx) {
  var spacing = config.sp;
  var lineWidth = config.lw;
  var size = board.size;
  var grid = board.grid;
  var stars = board.stars;

  var px = (size+1) * spacing + size * lineWidth; 
  var i, j, x, y;
  var stone;

  // set canvas dimensions
  // size+1 spaces, size lines
  canvas.width = px;
  canvas.height = px;

  // draw background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, px, px);

  // draw grid
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = colors.line;
  ctx.beginPath();
  x = spacing;
  y = spacing;
  for (i = 0; i < size; i++) {
    // draw vertical line
    ctx.moveTo(x + i*(spacing+lineWidth), y);
    ctx.lineTo(x + i*(spacing+lineWidth), size*(spacing+lineWidth));
    // draw horizontal line
    ctx.moveTo(x, y + i*(spacing+lineWidth));
    ctx.lineTo(size*(spacing+lineWidth), y + i*(spacing+lineWidth));
  }
  ctx.stroke();

  // draw star points
  ctx.fillStyle = colors.star;
  ctx.beginPath();
  stars.forEach(function(star) {
    x = b2c(star[1], spacing, lineWidth);
    y = b2c(star[0], spacing, lineWidth);
    ctx.moveTo(x, y);
    ctx.arc(x, y, spacing*config.sr, 0, 2*Math.PI, false);
  });
  ctx.fill();

  // draw stones/markers
  for (i = 0; i < size; i++) {
    for (j = 0; j < size; j++) {
      if (grid[i][j] !== '.') {
        ctx.beginPath();
        ctx.fillStyle = colors[grid[i][j]];

        // find canvas coordinates
        x = b2c(j, spacing, lineWidth);
        y = b2c(i, spacing, lineWidth);
        ctx.moveTo(x, y);

        // draw stone/markers
        switch (grid[i][j]) {
          // stones
          case 'b':
          case 'w':
            ctx.arc(x, y, config.st*spacing, 0, 2*Math.PI, false);
            ctx.fill();
            break;
          // marker indicating next moves
          case 'n':
            ctx.arc(x, y, config.nx*spacing, 0, 2*Math.PI, false);
            ctx.fill();
            break;
        }
      }
    }
  }
  ctx.closePath();

  // mark the most recently placed stone
  if (board.history.length > 0) {
    var lastMove = board.history[board.history.length - 1];
    ctx.strokeStyle = lastMove.player === 'b' ? colors.w : colors.b;
    // move to canvas coordinate
    x = b2c(lastMove.pos[1], spacing, lineWidth);
    y = b2c(lastMove.pos[0], spacing, lineWidth);
    ctx.moveTo(x, y);
    // mark
    ctx.beginPath();
    ctx.lineWidth = config.mw * config.lw;
    ctx.arc(x, y, config.mk*spacing, 0, 2*Math.PI, false);
    ctx.stroke();
  }
}
