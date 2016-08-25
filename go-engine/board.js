var Board = function (size, stars) {
	this.size = size;
	this.stars = stars;

	this.grid = [];
	for (var i = 0; i < size; i++) {
		var row = [];
		for (var j = 0; j < size; j++) {
			row.push('.'); // empty location on board
		}
		this.grid.push(row);
	}

	for (var i = 0; i < stars.length; i++) {
		var row = stars[i][0];
		var col = stars[i][1];
		this.grid[row][col] = '*';
	}
};

Board.prototype.printToConsole = function() {
	document.open();
	document.write('<pre>');
	for (var i = 0; i < this.size; i++) {
		document.write(this.grid[i].join(''));
		document.write('\n');
	}
	document.write('</pre>');
	document.close();
};

Board.prototype.addStone = function(row, col, type) {
	// row and col are 0-indexed
	if (type === 'b' || type === 'w')
		this.grid[row][col] = type;
	else
		// @todo handle marker stones.
		console.log('Invalid type');
};

Board.prototype.chainAt = function(row, col) {
		
};

var test = function () {
	var stars = [
		[3, 3], [3, 9], [3, 15],
		[9, 3], [9, 9], [9, 15],
		[15, 3], [15, 9], [15, 15]
	];
	var board = new Board(19, stars);
	board.addStone(3, 3, 'b');
	board.printToConsole();
};

test();