(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.Brushstroke = factory();
    }
}(this, function () {

    /**
     * Curve calc function for canvas 2.3.4 - (c) Epistemex 2013-2016 - www.epistemex.com - MIT License
     */

    /**
     * Calculates an array containing points representing a cardinal spline through given point array.
     * Points must be arranged as: [x1, y1, x2, y2, ..., xn, yn].
     *
     * The points for the cardinal spline are returned as a new array.
     *
     * @param {Array} points - point array
     * @param {Number} [tension=0.5] - tension. Typically between [0.0, 1.0] but can be exceeded
     * @param {Number} [numOfSeg=25] - number of segments between two points (line resolution)
     * @param {Boolean} [close=false] - Close the ends making the line continuous
     * @returns {Float32Array} New array with the calculated points that was added to the path
     */
    function getCurvePoints(points, tension, numOfSeg, close) {

        'use strict';

        // options or defaults
        tension = (typeof tension === 'number') ? tension : 0.5;
        numOfSeg = (typeof numOfSeg === 'number') ? numOfSeg : 25;

        var pts,															// for cloning point array
            i = 1,
            l = points.length,
            rPos = 0,
            rLen = (l-2) * numOfSeg + 2 + (close ? 2 * numOfSeg: 0),
            res = new Float32Array(rLen),
            cache = new Float32Array((numOfSeg + 2) * 4),
            cachePtr = 4;

        pts = points.slice(0);

        if (close) {
            pts.unshift(points[l - 1]);										// insert end point as first point
            pts.unshift(points[l - 2]);
            pts.push(points[0], points[1]); 								// first point as last point
        }
        else {
            pts.unshift(points[1]);											// copy 1. point and insert at beginning
            pts.unshift(points[0]);
            pts.push(points[l - 2], points[l - 1]);							// duplicate end-points
        }

        // cache inner-loop calculations as they are based on t alone
        cache[0] = 1;														// 1,0,0,0

        for (; i < numOfSeg; i++) {

            var st = i / numOfSeg,
                st2 = st * st,
                st3 = st2 * st,
                st23 = st3 * 2,
                st32 = st2 * 3;

            cache[cachePtr++] =	st23 - st32 + 1;							// c1
            cache[cachePtr++] =	st32 - st23;								// c2
            cache[cachePtr++] =	st3 - 2 * st2 + st;							// c3
            cache[cachePtr++] =	st3 - st2;									// c4
        }

        cache[++cachePtr] = 1;												// 0,1,0,0

        // calc. points
        parse(pts, cache, l, tension);

        if (close) {
            pts = [];
            pts.push(points[l - 4], points[l - 3],
                points[l - 2], points[l - 1], 							// second last and last
                points[0], points[1],
                points[2], points[3]); 								// first and second
            parse(pts, cache, 4, tension);
        }

        function parse(pts, cache, l, tension) {

            for (var i = 2, t; i < l; i += 2) {

                var pt1 = pts[i],
                    pt2 = pts[i+1],
                    pt3 = pts[i+2],
                    pt4 = pts[i+3],

                    t1x = (pt3 - pts[i-2]) * tension,
                    t1y = (pt4 - pts[i-1]) * tension,
                    t2x = (pts[i+4] - pt1) * tension,
                    t2y = (pts[i+5] - pt2) * tension,
                    c = 0, c1, c2, c3, c4;

                for (t = 0; t < numOfSeg; t++) {

                    c1 = cache[c++];
                    c2 = cache[c++];
                    c3 = cache[c++];
                    c4 = cache[c++];

                    res[rPos++] = c1 * pt1 + c2 * pt3 + c3 * t1x + c4 * t2x;
                    res[rPos++] = c1 * pt2 + c2 * pt4 + c3 * t1y + c4 * t2y;
                }
            }
        }

        // add last point
        l = close ? 0 : points.length - 2;
        res[rPos++] = points[l++];
        res[rPos] = points[l];

        return res;
    }


    /**
     * Brush by Akimitsu Hamamuro (http://codepen.io/akm2/pen/BonIh) - MIT License
     */

    var Brush = (function() {

        /**
         * @constructor
         * @public
         */
        function Brush(x, y, color, size, inkAmount, angle, dripping, splashing) {
            this.x = x || 0;
            this.y = y || 0;
            if (color !== undefined) this.color = color;
            if (size !== undefined) this.size = size;
            if (inkAmount !== undefined) this.inkAmount = inkAmount;
            if (angle !== undefined) this.angle = angle;
            if (dripping !== undefined) this.dripping = dripping;
            if (splashing !== undefined) this.splashing = splashing;

            this._drops = [];
            this._resetTip();
        }

        Brush.prototype = {
            _SPLASHING_BRUSH_SPEED: 75,

            angle:      0,
            x:          0,
            y:          0,
            color:      '#000',
            size:       35,
            inkAmount:  7,
            splashing:  true,
            dripping:   true,
            maxHairs:   1000,
            _latestPos: null,
            _strokeId:  null,
            _drops:     null,

            isStroke: function() {
                return Boolean(this._strokeId);
            },

            startStroke: function() {
                if (this.isStroke()) return;

                this._resetTip();

                // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
                this._strokeId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r, v;
                    r = Math.random() * 16 | 0;
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            },

            endStroke: function() {
                this._strokeId = this._latestPos = null;
            },

            render: function(ctx, x, y) {
                var isStroke = this.isStroke(),
                    dx, dy,
                    i, len;

                if (!this._latestPos) this._latestPos = {};
                this._latestPos.x = this.x;
                this._latestPos.y = this.y;
                this.x = x;
                this.y = y;

                if (this._drops.length) {
                    var drops  = this._drops,
                        drop,
                        sizeSq = this.size * this.size;

                    for (i = 0, len = drops.length; i < len; i++) {
                        drop = drops[i];

                        dx = this.x - drop.x;
                        dy = this.y - drop.y;

                        if (
                            (isStroke && sizeSq > dx * dx + dy * dy && this._strokeId !== drop.strokeId) ||
                            drop.life <= 0
                        ) {
                            drops.splice(i, 1);
                            len--;
                            i--;
                            continue;
                        }

                        drop.render(ctx);
                    }
                }

                if (isStroke) {
                    var tip = this._tip,
                        strokeId = this._strokeId,
                        dist;

                    dx = this.x - this._latestPos.x;
                    dy = this.y - this._latestPos.y;
                    dist = Math.sqrt(dx * dx + dy * dy);

                    if (this.splashing && dist > this._SPLASHING_BRUSH_SPEED) {
                        var maxNum = (dist - this._SPLASHING_BRUSH_SPEED) * 0.5 | 0,
                            r, a, sr, sx, sy;

                        ctx.save();
                        ctx.fillStyle = this.color;
                        ctx.beginPath();
                        for (i = 0, len = maxNum * Math.random() | 0; i < len; i++) {
                            r = (dist - 1) * Math.random() + 1;
                            a = Math.PI * 2 * Math.random();
                            sr = 5 * Math.random();
                            sx = this.x + r * Math.sin(a);
                            sy = this.y + r * Math.cos(a);
                            ctx.moveTo(sx + sr, sy);
                            ctx.arc(sx, sy, sr, 0, Math.PI * 2, false);
                        }
                        ctx.fill();
                        ctx.restore();

                    } else if (this.dripping && dist < this.inkAmount * 2 && Math.random() < 0.05) {
                        this._drops.push(new Drop(
                            this.x,
                            this.y,
                            (this.size + this.inkAmount) * 0.5 * ((0.25 - 0.1) * Math.random() + 0.1),
                            this.color,
                            this._strokeId
                        ));
                    }

                    for (i = 0, len = tip.length; i < len; i++) {
                        tip[i].render(ctx, dx, dy, dist);
                    }
                }
            },

            dispose: function() {
                this._tip.length = this._drops.length = 0;
            },

            _resetTip: function() {
                var tip = this._tip = [],
                    rad = this.size * 0.5,
                    x0, y0, a0, x1, y1, a1, cv, sv,
                    i, len;

                //a1  = Math.PI * 2 * Math.random();
                a1  = this.angle;
                len = rad * rad * Math.PI / this.inkAmount | 0;
                if (len < 1) len = 1;
                if (len > this.maxHairs) len = this.maxHairs;

                for (i = 0; i < len; i++) {
                    x0 = rad * Math.random();
                    y0 = x0 * 0.5;
                    a0 = Math.PI * 2 * Math.random();
                    x1 = x0 * Math.sin(a0);
                    y1 = y0 * Math.cos(a0);
                    cv = Math.cos(a1);
                    sv = Math.sin(a1);

                    tip.push(new Hair(
                        this.x + x1 * cv - y1 * sv,
                        this.y + x1 * sv + y1 * cv,
                        this.inkAmount,
                        this.color
                    ));
                }
            }
        };


        /**
         * Hair
         * @private
         */
        function Hair(x, y, inkAmount, color) {
            this.x = x || 0;
            this.y = y || 0;
            this.inkAmount = inkAmount;
            this.color = color;

            this._latestPos = { x: this.x, y: this.y };
        }

        Hair.prototype = {
            x:          0,
            y:          0,
            inkAmount:  7,
            color:      '#000',
            _latestPos: null,

            render: function(ctx, offsetX, offsetY, offsetLength) {
                this._latestPos.x = this.x;
                this._latestPos.y = this.y;
                this.x += offsetX;
                this.y += offsetY;

                var per = offsetLength ? this.inkAmount / offsetLength : 0;
                if      (per > 1) per = 1;
                else if (per < 0) per = 0;

                ctx.save();
                ctx.lineCap = ctx.lineJoin = 'round';
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.inkAmount * per;
                ctx.beginPath();
                ctx.moveTo(this._latestPos.x, this._latestPos.y);
                ctx.lineTo(this.x, this.y);
                ctx.stroke();
                ctx.restore();
            }
        };


        /**
         * Drop
         * @private
         */
        function Drop(x, y, size, color, strokeId) {
            this.x = x || 0;
            this.y = y || 0;
            this.size = size;
            this.color = color;
            this.strokeId = strokeId;

            this.life = this.size * 1.5;
            this._latestPos = { x: this.x, y: this.y };
        }

        Drop.prototype = {
            x:          0,
            y:          0,
            size:       7,
            color:      '#000',
            strokeId:   null,
            life:       0,
            _latestPos: null,
            _xOffRatio: 0,

            render: function(ctx) {
                if (Math.random() < 0.03) {
                    this._xOffRatio += 0.06 * Math.random() - 0.03;
                } else if (Math.random() < 0.1) {
                    this._xOffRatio *= 0.003;
                }

                this._latestPos.x = this.x;
                this._latestPos.y = this.y;
                this.x += this.life * this._xOffRatio;
                this.y += (this.life * 0.5) * Math.random();

                this.life -= (0.05 - 0.01) * Math.random() + 0.01;

                ctx.save();
                ctx.lineCap = ctx.lineJoin = 'round';
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.size + this.life * 0.3;
                ctx.beginPath();
                ctx.moveTo(this._latestPos.x, this._latestPos.y);
                ctx.lineTo(this.x, this.y);
                ctx.stroke();
                ctx.restore();
                ctx.restore();
            }
        };

        return Brush;

    })();


    /********************
     * Brushstroke utils
     ********************/

    // Type of elements, most from anime.js

    var is = {
        obj: function(a) { return Object.prototype.toString.call(a).indexOf('Object') > -1 },
        num: function(a) { return typeof a === 'number' },
        str: function(a) { return typeof a === 'string' },
        fnc: function(a) { return typeof a === 'function' },
        und: function(a) { return typeof a === 'undefined' }
    };

    // Functions

    function callFunction(fn, context, params) {
        if (is.fnc(fn)) fn.call(context, params);
    }

    // Objects

    function extendSingle(target, source) {
        for (var key in source)
            target[key] = source[key];
        return target;
    }

    function extend(target, source) {
        if (!target) target = {};
        for (var i = 1; i < arguments.length; i++)
            extendSingle(target, arguments[i]);
        return target;
    }

    // Styles

    function validProperty(property, value) {
        try {
            return !is.und(value) &&
                !is.obj(value) &&
                !is.fnc(value) &&
                value.length > 0 &&
                value != parseInt(value) &&
                property != parseInt(property);
        } catch (e) {
            return false;
        }
    }

    function setStyle(el) {
        var computedStyle = getComputedStyle(el);
        var style = '';
        for (var property in computedStyle) {
            if (validProperty(property, computedStyle[property])) {
                style += property + ':' + computedStyle[property] + ';';
            }
        }
        el.style.cssText += style + ';visibility:visible;';
    }

    function setStyleAll(el, list) {
        var children = el.children;
        for (var i = 0; i < children.length; i++)
            setStyleAll(children[i], list);
        list.push({el: el, style: el.style.cssText});
        setStyle(el);
    }

    function restoreStyleAll(list) {
        var current;
        for (var i = 0; i < list.length; i++) {
            current = list[i];
            if (current.style) {
                current.el.style.cssText = current.style;
            } else {
                current.el.removeAttribute('style');
            }
        }
    }

    function getOuterHTML(el) {
        var list = [];
        setStyleAll(el, list);
        var html = el.outerHTML;
        restoreStyleAll(list);
        return html;
    }

    function fixRootPosition(root) {
        var style = getComputedStyle(root);
        var position = style.getPropertyValue('position');
        if (position === 'static') {
            root.style.position = 'relative';
        }
    }

    function setPosition(o) {
        var elRect = o.el.getBoundingClientRect();
        var rootRect = o.root.getBoundingClientRect();
        o.top = elRect.top - rootRect.top;
        o.left = elRect.left - rootRect.left;
    }

    // Promises

    function deferred() {
        return new function () {
            this.resolve = null;
            this.reject = null;

            this.promise = new Promise(function (resolve, reject) {
                this.resolve = resolve;
                this.reject = reject;
            }.bind(this));
        };
    }

    // Get random points in a 2d space

    function randomize(num, width, height) {
        var numPoints = num || 10;
        var points = [];
        for (var i = 0; i < numPoints; i++) {
            points.push(
                (width * Math.random() * 0.9 + width * 0.05) | 0,
                (height * Math.random() * 0.9 + height * 0.05) | 0
            );
        }
        return points;
    }

    // Canvas

    function resizeImage(img, o) {
        var canvas = document.createElement('canvas');
        canvas.width = o.width;
        canvas.height = o.height;
        var ctx = canvas.getContext("2d");
        if (o.stretch) {
            ctx.drawImage(img, 0, 0, o.width, o.height);
        } else {
            var width = img.width;
            var height = img.height;
            var left = o.width / 2 - width / 2;
            var top = o.height / 2 - height / 2;
            ctx.drawImage(img, left, top, width, height);
        }
        return canvas;
    }

    function initCanvas(o) {
        if (o.el) {
            o.width = o.el.offsetWidth;
            o.height = o.el.offsetHeight;
            setPosition(o);
        }
        var canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = o.top + 'px';
        canvas.style.left = o.left + 'px';
        canvas.width = o.width;
        canvas.height = o.height;
        canvas.style.visibility = 'hidden';
        o.canvas = canvas;
        o.ctx = canvas.getContext('2d');
        fixRootPosition(o.root);
        o.root.appendChild(o.canvas);
    }


    /**************
     * Brushstroke
     **************/

    function Brushstroke(options) {

        // Default values

        this.defaults = {
            animation: 'to-bottom',
            path: undefined,
            points: undefined,
            frameAnimation: false,
            frames: 0,
            duration: 0,
            delay: 0,
            color: '#ccc',
            width: 300,
            height: 120,
            size: 40,
            inkAmount: 1,
            lifting: false,
            dripping: false,
            splashing: true,
            padding: 30,
            overlap: 10,
            tension: 0.5,
            reduceOverflow: 20,
            root: document.body,
            el: undefined,
            image: undefined,
            repeat: 'no-repeat',
            stretch: false,
            centered: false,
            queue: false
        };

        this.init(options);
    }

    Brushstroke.prototype = {

        init: function (options) {
            var o = extend(this.defaults, options);
            if (is.str(o.root)) o.root = document.querySelector(o.root);
            if (is.str(o.el)) o.el = document.querySelector(o.el);
            initCanvas(o);

            var d = deferred();
            this.promise = d.promise;
            d.resolve();
        },

        run: function (options) {
            var that = this;

            function start() {
                options.canvas.style.visibility = 'visible';
                if (options.render) {
                    that.render(options);
                } else {
                    callFunction(that.animations[options.animation], that, options);
                }
            }

            if (options.clear) {
                options.ctx.clearRect(0, 0, options.width, options.height);
                options.d.resolve();
            } else if (options.el) {
                if (options.pattern) {
                    start();
                } else {
                    var html = '<style>body{margin:0;}</style>' + getOuterHTML(options.el);
                    rasterizeHTML.drawHTML(html, null)
                        .then(function success(renderResult) {
                            if (options.fill) {
                                options.ctx.drawImage(renderResult.image, 0, 0, options.width, options.height);
                                options.d.resolve();
                            } else {
                                options.pattern = options.ctx.createPattern(renderResult.image, options.repeat);
                                start();
                            }
                        }, function error(e) {
                            console.log('rasterizeHTMLError: ' + e);
                        });
                }
            } else if (options.image) {
                var img = new Image();
                img.onload = function() {
                    if (options.stretch || options.centered) img = resizeImage(img, options);
                    if (options.fill) {
                        options.ctx.drawImage(img, 0, 0, options.width, options.height);
                        options.d.resolve();
                    } else {
                        options.pattern = options.ctx.createPattern(img, options.repeat);
                        start();
                    }
                };
                img.src = options.image;
            } else {
                start();
            }
        },

        draw: function (options) {
            var that = this;
            var o = extend({}, this.defaults, options);
            var _draw = function () {
                var d = deferred();
                that.run(extend(o, {d: d}));
                return d.promise;
            };
            if (o.queue) {
                this.promise = this.promise.then(_draw);
            } else {
                _draw();
            }
        },

        erase: function (options) {
            this.draw(extend({}, options, {erase: true}));
        },

        fill: function (options) {
            this.draw(extend({}, options, {fill: true}));
        },

        clear: function (options) {
            this.draw(extend({}, options, {clear: true}));
        },

        setPath: function (o) {
            var path = o.path;
            if (is.str(path)) {
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', o.path);
                o.path = path;
            }
            o.pathLenght = path.getTotalLength();
        },

        pointAt: function (t, o) {
            switch (o.animation) {
                case 'points':
                    var points = o.points;
                    var length = points.length;
                    var i = Math.round((length * t) / 2) * 2;
                    if (i >= length) i = length - 2;
                    return {x: points[i], y: points[i + 1]};
                case 'path':
                    return o.path.getPointAtLength(o.pathLenght * t);
                default:
                    return null;
            }
        },

        setPos: function (o, pos) {
            var first = !pos;
            if (first) pos = {};
            switch (o.direction) {
                case 'bottom':
                    pos.startY = first ? o.padding : pos.startY + o.size - o.overlap;
                    this.setPosBottomTop(o, pos, first);
                    break;
                case 'top':
                    pos.startY = first ? o.height - o.padding : pos.startY - o.size + o.overlap;
                    this.setPosBottomTop(o, pos, first);
                    break;
                case 'right':
                    pos.startX = first ? o.padding : pos.startX + o.size - o.overlap;
                    this.setPosRightLeft(o, pos, first);
                    break;
                case 'left':
                    pos.startX = first ? o.width - o.padding : pos.startX - o.size + o.overlap;
                    this.setPosRightLeft(o, pos, first);
                    break;
            }
            return pos;
        },

        setPosBottomTop: function (o, pos, first) {
            if (first) {
                pos.vertical = true;
            } else {
                var aux = pos.startX;
            }
            pos.startX = first ? o.padding : pos.x;
            pos.x = first ? o.width - o.padding : aux;
            pos.y = pos.startY;
        },

        setPosRightLeft: function (o, pos, first) {
            if (first) {
                pos.vertical = false;
            } else {
                var aux = pos.startY;
            }
            pos.x = pos.startX;
            pos.startY = first ? o.padding : pos.y;
            pos.y = first ? o.height - o.padding : aux;
        },

        render: function (o) {
            if (!is.und(o.duration) || !is.und(o.frames)) {
                var that = this;

                if (o.delay) {
                    var delay = o.delay;
                    delete o.delay;
                    setTimeout(function () {
                        that.render(o);
                    }, delay * 1000);
                    return;
                }

                if (o.erase) o.ctx.globalCompositeOperation = 'destination-out';

                var frame = 1, elapsed, time, t, point, x = 0, y = 0;
                var startTime = new Date();

                if (!is.und(o.startX)) x = o.startX;
                if (!is.und(o.startY)) y = o.startY;

                var brush = new Brush(x, y, o.pattern || o.color, o.size, o.inkAmount, o.angle, o.dripping, o.splashing);
                brush.startStroke(x, y);
                callFunction(o.begin);

                if (o.frameAnimation && o.duration) {
                    if (!o.frames) o.frames = parseFloat(o.duration) * 60;
                    delete o.duration;
                }

                (function calc() {
                    if (o.duration) {
                        elapsed = (new Date() - startTime) / 1000;
                        time = elapsed / parseFloat(o.duration);
                    } else {
                        time = frame / parseFloat(o.frames);
                    }
                    t = time;

                    if (is.fnc(o.easing)) {
                        t = o.easing(t);
                    }

                    if (time > 1) {
                        t = 1;
                    }

                    point = that.pointAt(t, o);
                    if (!point) {
                        point = {
                            x: x + (o.x - x) * t,
                            y: y + (o.y - y) * t
                        };
                    }

                    x = point.x;
                    y = point.y;
                    brush.render(o.ctx, x, y);

                    if (time >= 1) {
                        brush.endStroke();
                        if (o.erase) o.ctx.globalCompositeOperation = 'source-over';
                        callFunction(o.end);
                        o.d.resolve();
                    } else {
                        if (o.duration) {
                            requestAnimationFrame(calc);
                        } else {
                            frame++;
                            o.frameAnimation ? requestAnimationFrame(calc) : calc();
                        }
                    }
                })();
            }
        },

        animations: {
            'to-bottom': function(o) {
                callFunction(this.animations.basic, this, extend(o, {direction: 'bottom'}));
            },
            'to-top': function(o) {
                callFunction(this.animations.basic, this, extend(o, {direction: 'top'}));
            },
            'to-right': function(o) {
                callFunction(this.animations.basic, this, extend(o, {direction: 'right'}));
            },
            'to-left': function(o) {
                callFunction(this.animations.basic, this, extend(o, {direction: 'left'}));
            },
            'basic': function(o) {
                var pos = this.setPos(o);
                var brushstrokes = Math.ceil(((pos.vertical ? o.height : o.width) + (o.size / 2) - (o.padding * 2)) / (o.size - o.overlap));
                var angle = pos.vertical ? Math.PI * 0.5 : 0;
                var duration = o.duration / brushstrokes;
                var frames = o.frames / brushstrokes;
                var points = [];
                var alt = true;
                var overflow = o.reduceOverflow;
                var opts, first, last;

                function fixOverflow(axis) {
                    if (i === 0) pos[axis] = pos[axis] - overflow;
                    if (i === 1) pos[axis] = pos[axis] + overflow;
                    if (i === brushstrokes - 1) pos[axis] = alt ? pos[axis] + overflow : pos[axis] - overflow;
                }

                for (var i = 0; i < brushstrokes; i++) {
                    if (o.lifting) {
                        first = i === 0;
                        last = i === brushstrokes - 1;
                        opts = extend({}, o, pos, {duration: duration, frames: frames, angle: angle, render: true, queue: true});
                        if (!first) opts.begin = null;
                        if (!last) opts.end = null;
                        this.draw(opts);
                    } else {
                        if (overflow) {
                            pos.vertical ? fixOverflow('x') : fixOverflow('y');
                        }
                        points.push(pos.startX, pos.startY, pos.x, pos.y);
                    }
                    this.setPos(o, pos);
                    alt = !alt;
                }

                if (o.lifting) {
                    o.d.resolve();
                } else {
                    callFunction(this.animations.points, this, extend(o, {animation: 'points', points: points, angle: angle}));
                }
            },
            'path': function(o) {
                this.setPath(o);
                var point = this.pointAt(0, o);
                this.render(extend(o, {startX: point.x, startY: point.y}));
            },
            'points': function(o) {
                var points = o.points || 0;
                points = is.num(points) ? randomize(points, o.width, o.height) : points;
                points = getCurvePoints(points, o.tension);
                this.render(extend(o, {points: points, startX: points[0], startY: points[1]}));
            }
        }
    };

    return Brushstroke;

}));
