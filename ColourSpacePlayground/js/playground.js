"use strict";

function extend(base, sub) {
    // Avoid instantiating the base class just to setup inheritance
    // Also, do a recursive merge of two prototypes, so we don't overwrite
    // the existing prototype, but still maintain the inheritance chain
    // Thanks to @ccnokes
    var origProto = sub.prototype;
    sub.prototype = Object.create(base.prototype);
    for (var key in origProto)  {
        sub.prototype[key] = origProto[key];
    }
    // The constructor property was set wrong, let's fix it
    Object.defineProperty(sub.prototype, 'constructor', {
        enumerable: false,
        value: sub
    });
}

/* Class code */

function ColourSpace(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.channel = [0, 0, 0];
    this.previousChannel = [0, 0, 0];
    this.hiddenChannel = 2;

    var self = this;
    canvas.addEventListener('click', function(event) {
        var mouseX = Math.max(0, Math.min(canvas.clientWidth, event.offsetX));
        var mouseY = Math.max(0, Math.min(canvas.clientHeight, event.offsetY));
        self.setColour2d(mouseX / (canvas.clientWidth - 1),
                         mouseY / (canvas.clientHeight - 1));
    });
}

ColourSpace.prototype = {
    setupGui: function(gui, channelFunction=null) {
        var map = {};
        for (var i = 0; i < 3; ++i) {
            gui.add(this.channel, i, 0, 255).step(1).name(this.channelNames[i]).listen();
            map[this.channelNames[i]] = i;
        }
        if (typeof channelFunction == 'function') {
            channelFunction();
        }
        gui.add(this, 'hiddenChannel', map).name("Hidden Channel");
    },
    draw: function() {
        var width = this.canvas.width;
        var height = this.canvas.height;
        var imgData = this.ctx.createImageData(width, height);

        for (var r = 0; r < height; ++r) {
            for (var c = 0; c < width; ++c) {
                var idx = r * width * 4 + c * 4;
                var colour = this.getColour2d(c / (width - 1), r / (height - 1));
                for (var i = 0; i < 3; ++i) {
                    imgData.data[idx + i] = colour[i];
                }
                imgData.data[idx + 3] = 255;  // Fully opaque alpha.
            }
        }

        this.ctx.putImageData(imgData, 0, 0);

        this.drawSelector();
    },
    drawSelector: function() {
        var width = this.canvas.width;
        var height = this.canvas.height;

        var channel2d = this.getChannel2d();
        var x = Math.round((width - 1) * (channel2d[0] / 255));
        var y = Math.round((height - 1) * (channel2d[1] / 255));

        var ctx = this.ctx;
        ctx.lineWidth = 2;

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        if (this.getRgbColour().reduce(function(a, b) { return a + b; }) < 128 * 3) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        }

        ctx.beginPath();
        ctx.moveTo(x - 6, y);
        ctx.lineTo(x - 1, y);
        ctx.moveTo(x + 6, y);
        ctx.lineTo(x + 1, y);
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x, y - 1);
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x, y + 1);
        ctx.stroke();
    },
    getRgbColour: function() {
        return this.toRgb(this.channel).map(Math.round);
    },
    getColour2d: function(x, y) {  // Takes in [0..1], [0..1], returns [R, G, B]
        var colour = this.channel.slice();
        var cur = x;
        for (var i = 0; i < 3; ++i) {
            if (i != this.hiddenChannel) {
                colour[i] = cur * 255;
                cur = y;
            }
        }
        return this.toRgb(colour).map(Math.round);
    },
    setColour2d: function(x, y) {  // Takes in [0..1], [0..1], sets channel values.
        var cur = x;
        for (var i = 0; i < 3; ++i) {
            if (i != this.hiddenChannel) {
                this.channel[i] = cur * 255;
                cur = y;
            }
        }
    },
    getChannel2d: function() {
        return [
            this.hiddenChannel != 0 ? this.channel[0] : this.channel[1],
            this.hiddenChannel != 2 ? this.channel[2] : this.channel[1]
        ];
    },
    isChanged: function() {
        var changed = this.channel.join(',') != this.previousChannel.join(',');
        this.previousChannel = this.channel.slice();
        return changed;
    }
};

function Rgb(canvas) {
    ColourSpace.call(this, canvas);
    this.channelNames = ["Red", "Green", "Blue"];
}

Rgb.prototype = {
    toRgb: function(colour) {
        return colour;
    },
    setRgbColour: function(colour) {
        for (var i = 0; i < 3; ++i) {
            this.channel[i] = colour[i];
        }
        this.previousChannel = this.channel.slice();
    }
};

extend(ColourSpace, Rgb);

function Cmy(canvas) {
    ColourSpace.call(this, canvas);
    this.key = 0;
    this.prevKey = 0;
    this.channelNames = ["Cyan", "Magenta", "Yellow"];
}

Cmy.prototype = {
    setupGui: function(gui) {
        var self = this;
        ColourSpace.prototype.setupGui.call(this, gui, function() {
            gui.add(self, 'key', 0, 255).step(1).name("Key").listen();
        });
    },
    toRgb: function(colour) {
        var c = colour.slice();
        for (var i = 0; i < 3; ++i) {
            c[i] = 255 - colour[i] - this.key;
            if (c[i] < 0) c[i] = 0;
        }
        return c;
    },
    setRgbColour: function(colour) {
        for (var i = 0; i < 3; ++i) {
            this.channel[i] = 255 - colour[i];
            if (this.channel[i] < this.key) this.key = this.channel[i];
        }
        for (var j = 0; j < 3; ++j) {
            this.channel[j] -= this.key;
        }
        this.previousChannel = this.channel.slice();
    },
    isChanged: function() {
        // var changed = this.prototype.isChanged() || this.prevKey != this.key;  // TODO: Doesn't work. Why?
        var changed = this.channel.join(',') != this.previousChannel.join(',') || this.prevKey != this.key;
        this.previousChannel = this.channel.slice();
        this.prevKey = this.key;
        return changed;
    }
};

extend(ColourSpace, Cmy);

function Hsv(canvas) {
    ColourSpace.call(this, canvas);
    this.channelNames = ["Hue", "Saturation", "Value"];
}

Hsv.prototype = {
    setupGui: function(gui) {
        gui.add(this.channel, 0, 0, 255).step(1).name("Hue").listen();
        gui.add(this.channel, 1, 0, 255).step(1).name("Saturation").listen();
        gui.add(this.channel, 2, 0, 255).step(1).name("Value").listen();
        gui.add(this, 'hiddenChannel', {Hue: 0, Saturation: 1, Value: 2}).name("Hidden Channel");
    },
    toRgb: function(colour) {
        var s = colour[1] / 255;
        var v = colour[2] / 255;
        var c = s * v;  // Chroma
        var h_ = colour[0] / 256 * 6;
        var x = c * (1 - Math.abs(h_ % 2 - 1));
        var r = 0, g = 0, b = 0;
        if (h_ < 1) {
            r = c;
            g = x;
        } else if (h_ < 2) {
            r = x;
            g = c;
        } else if (h_ < 3) {
            g = c;
            b = x;
        } else if (h_ < 4) {
            g = x;
            b = c;
        } else if (h_ < 5) {
            r = x;
            b = c;
        } else if (h_ < 6) {
            r = c;
            b = x;
        }
        var m = v - c;
        return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    },
    setRgbColour: function(colour) {
        var r = colour[0], g = colour[1], b = colour[2];
        var M = Math.max(r, g, b), m = Math.min(r, g, b);

        var c = M - m;  // Chroma
        var h_ = 0;
        if (c == 0) {
        } else if (M == r) {
            h_ = (g - b) / c % 6;
            if (h_ < 0) h_ += 6;
        } else if (M == g) {
            h_ = (b - r) / c + 2;
        } else {  // M == b
            h_ = (r - g) / c + 4;
        }

        this.channel[0] = (h_ * 60) / 360 * 255;
        this.channel[1] = M == 0 ? 0 : c / M * 255;
        this.channel[2] = M;

        this.previousChannel = this.channel.slice();
    }
};

extend(ColourSpace, Hsv);

function Yuv(canvas) {
    ColourSpace.call(this, canvas);
    this.channelNames = ["Y", "Cb", "Cr"];
}

Yuv.prototype = {
    toRgb: function(colour) {
        var clamp = function(x) {
            if (x < 0) return 0;
            if (x > 255) return 255;
            return x;
        };
        var y = (colour[0] - 16) * 1.164;
        var u = colour[1] - 128;
        var v = colour[2] - 128;
        return [
            clamp(y + 1.596 * v),
            clamp(y - 0.392 * u - 0.813 * v),
            clamp(y + 2.017 * u)
        ];
    },
    setRgbColour: function(colour) {
        var r = colour[0];
        var g = colour[1];
        var b = colour[2];

        this.channel[0] = 0.257 * r + 0.504 * g + 0.098 * b + 16;
        this.channel[1] = -0.148 * r - 0.291 * g + 0.439 * b + 128;
        this.channel[2] = 0.439 * r - 0.368 * g - 0.071 * b + 128;

        this.previousChannel = this.channel.slice();
    }
};

extend(ColourSpace, Yuv);


/* Setup code */
var rgbCanvas = document.querySelector("#rgb canvas");
var rgb = new Rgb(rgbCanvas);
var cmyCanvas = document.querySelector("#cmy canvas");
var cmy = new Cmy(cmyCanvas);
var hsvCanvas = document.querySelector("#hsv canvas");
var hsv = new Hsv(hsvCanvas);
var yuvCanvas = document.querySelector("#yuv canvas");
var yuv = new Yuv(yuvCanvas);

var colour = [50, 75, 100];

var colourSpaces = [
    rgb,
    cmy,
    hsv,
    yuv
];

function updateDisplay(colour) {
    var hexString = '#' + colour.map(function(x) {
        return ('0' + x.toString(16)).slice(-2);
    }).join('');
    document.getElementById("display").style.backgroundColor = hexString;
    document.getElementById("colour").innerText = hexString;

    document.querySelectorAll("#title, #colour").forEach(function(x) {
        if (colour.reduce(function(a, b) { return a + b; }) < 128 * 3) {
            x.classList.add("inverted");
        } else {
            x.classList.remove("inverted");
        }
    });
}

window.onload = function() {
    updateDisplay(colour);

    var gui = new dat.GUI({ autoplace: false });
    var div = document.getElementById("controls");
    div.appendChild(gui.domElement);

    gui.addFolder("RGB").open();
    rgb.setupGui(gui);
    rgb.setRgbColour(colour);
    gui.addFolder("CMY").open();
    cmy.setupGui(gui);
    cmy.setRgbColour(colour);
    gui.addFolder("HSV").open();
    hsv.setupGui(gui);
    hsv.setRgbColour(colour);
    gui.addFolder("YCbCr").open();
    yuv.setupGui(gui);
    yuv.setRgbColour(colour);

    for (var i = 0; i < colourSpaces.length; ++i) {
        var space = colourSpaces[i];
        space.setRgbColour(colour);
    }
};

function draw() {
    if (typeof draw.frame == 'undefined') {
        draw.frame = 0;
    }
    if (typeof draw.frameskip == 'undefined') {
        draw.frameskip = 2;
    }
    var newColour = null;
    var changedSpace = 0;
    for (var i = 0; i < colourSpaces.length; ++i) {
        if (colourSpaces[i].isChanged()) {
            newColour = colourSpaces[i].getRgbColour();
            changedSpace = i;
        }
    }
    for (var j = 0; j < colourSpaces.length; ++j) {
        if (newColour !== null && j !== changedSpace) {
            colourSpaces[j].setRgbColour(newColour);
        }
        if (j % draw.frameskip != draw.frame % draw.frameskip && j != changedSpace) continue;
        colourSpaces[j].draw();
    }

    if (newColour !== null) updateDisplay(newColour);

    draw.frame = (draw.frame + 1) % draw.frameskip;
    window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);
