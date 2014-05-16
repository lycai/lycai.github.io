//  Animate all the div-box-pixels!

var mouseX = 0, mouseY = 0;
var prevCol = 0; prevRow = 0;

$(document).mousemove(animateBoxes);

function animateBoxes(event) {
    var DIV_PIXEL_X = 15, DIV_PIXEL_Y = 7;

    var $this = $("#divContainer"), mouseX = event.pageX, mouseY = event.pageY,
        offset = $this.offset(),
        width = $this.width(), height = $this.height();

    for (var lrow = Math.max(0, prevRow - 2); 
             lrow < Math.min(DIV_PIXEL_Y, prevRow + 3); lrow++) {
        for (var lcol = Math.max(0, prevCol - 2);
                 lcol < Math.min(DIV_PIXEL_X, prevCol + 3); lcol++) {
            $("#row" + lrow + "col" + lcol).animateReset();
        }
    }

    var col = Math.floor((mouseX - offset.left) / (width / DIV_PIXEL_X)),
        row = Math.floor((mouseY - offset.top) / (height / DIV_PIXEL_Y));

    for (var lrow = Math.max(0, row - 2); 
             lrow < Math.min(DIV_PIXEL_Y, row + 3); lrow++) {
        for (var lcol = Math.max(0, col - 2);
                 lcol < Math.min(DIV_PIXEL_X, col + 3); lcol++) {
            $("#row" + lrow + "col" + lcol).animateToXY(mouseX, 
                                                        mouseY);
        }
    }
    prevCol = col;
    prevRow = row;
}

$.fn.animateToXY = function(x, y) {
    this.each(function() {
        // constants
        var MAX_DIST_MULT = 2.5, DISPLACE_MULT = 0.6,
            DIST_REDU = 4, ANIM_SPD = 100;

        var $this = $(this),
            offset = $this.offset(),
            width = $this.width(), height = $this.height(),
            centerX = offset.left + width / 2,
            centerY = offset.top + height / 2,
            dist = Math.sqrt(sqrDist(x, y, centerX, centerY));

        if (dist <= width * MAX_DIST_MULT) {
            $this.stop().animate({
                left: ((width * DISPLACE_MULT) - dist / DIST_REDU) + "px",
                top: "-" + ((width * DISPLACE_MULT) - dist / DIST_REDU) + "px"
            }, ANIM_SPD);
        }
    });
};

$.fn.animateReset = function() {
    this.each(function() {
        $(this).stop().animate({
            left: "0px",
            top: "0px"
        });
    });
}

function sqrDist(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}