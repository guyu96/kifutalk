var colors = {
  'bg': '#F1C070',
  'line': '#623F16',
  'star': '#623F16',
  'b': '#464646',
  'w': '#F8F8F8'
};

// convert board coordinates to canvas coordinates
function b2c(x, spacing, lineWidth) {
  return (x + 1) * spacing + x * lineWidth;
}

// render a board object
// spacing denotes the space between grid lines
function renderBoard(board, spacing, lineWidth, canvas, ctx) {
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
    ctx.arc(x, y, lineWidth*3, 0, 2*Math.PI, false);
  });
  ctx.fill();

  // draw stones
  for (i = 0; i < size; i++) {
    for (j = 0; j < size; j++) {
      stone = grid[i][j];
      if (stone === 'b' || stone === 'w') {
        ctx.beginPath();
        ctx.fillStyle = colors[stone];
        console.log(ctx.fillStyle);
        // find canvas coordinates
        x = b2c(j, spacing, lineWidth);
        y = b2c(i, spacing, lineWidth);
        ctx.moveTo(x, y);
        // draw stone
        ctx.arc(x, y, 0.48*spacing, 0, 2*Math.PI, false);
        ctx.fill();
      }
    }
  }
}

var canvas = document.getElementById('board');
var ctx = canvas.getContext('2d');


renderBoard(board, 30, 1, canvas, ctx);
