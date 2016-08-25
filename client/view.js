var drawStone = function (ctx, x, y, radius, stoneColor, text, font, textColor) {
	ctx.fillStyle = stoneColor;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI*2, true);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = textColor;
	ctx.textAlign = "center";
	ctx.font = font;
	ctx.fillText(text, x, y+(radius/4), radius);
}

var canvas = document.getElementById('board');
var ctx = canvas.getContext('2d');

ctx.fillStyle = "rgb(200,0,0)";
ctx.fillRect(10, 10, 20, 20);

ctx.fillStyle = "rgba(0,0,200,0.5)";
ctx.fillRect(20, 20, 20, 20);

drawStone(ctx, 100, 100, 20, "rgb(0,0,0)", "1", "bold 20px serif", "rgb(200,0,0)");