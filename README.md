# Brushstroke

Brushstrokes on the web: draw solid colors, images, or even HTML!

[**DEMO**](https://lmgonzalves.github.io/brushstroke/)

[**TUTORIAL**](https://scotch.io/tutorials/drawing-creative-brushstrokes-with-javascript)

## Usage

The `brushstroke` library has no mandatory dependencies, but:

- It uses promises, so if you want to support IE or any other browser that does not support native promises, you need a polyfill. [This](https://github.com/taylorhakes/promise-polyfill) is a tiny one :)
- To draw HTML, it uses [rasterizeHTML.js](https://github.com/cburgmer/rasterizeHTML.js).

So, include the `brushstroke` script (and dependencies mentioned above, if you need them) and start drawing things:

```html
<!-- Optional dependencies goes here -->
<script src="dist/brushstroke.min.js"></script>
<script>
    // Options for customization, see full list below
    var options = {
        duration: 1,
        queue: true
    };

    // Initialization
    var bs = new Brushstroke(options);

    // Draw, erase, etc...
    bs.draw();
    bs.erase();
    bs.draw();
</script>
```

## Options

For customization, you can pass `options` (in object notation) to `Brushstroke` constructor. These options overrides defaults, and will be used for any operation (draw, erase, etc.). You can also override options for an specific operation. Here is the complete list, for reference:

| Name                    | Type                    | Default         | Description |
|-------------------------|-------------------------|-----------------|-------------|
|`animation`              | String                  | 'to-bottom'     | Type of animation. Possible values are: `to-bottom`, `to-top`, `to-right`, `to-left`, `path`, `points`. See details below. |
|`path`                   | String or DOM Element   | undefined       | Path element (or `d` attribute as String) to perform a `path` animation. |
|`points`                 | Array or Integer        | undefined       | Array of points (or a number indicating the amount of random points to generate an Array) to perform a `points` animation. |
|`frameAnimation`         | Boolean                 | false           | If true, the animation will be frame-based instead time-based. This could be better to get a consistent drawing, but it can affect performance. |
|`frames`                 | Integer                 | 0               | Number of frames to perform a frame-based animation. If `frameAnimation` is `false` and you define `frames > 0`, there will be no animation, but drawing will be calculated and showed ASAP, using the number of frames defined. |
|`duration`               | Float                   | 0               | Duration (in seconds) to perform a time-based animation. If `frameAnimation` is `true` and `frames` is not defined, duration will be translated to frames, considering `1 second = 60 frames`. |
|`delay`                  | Float                   | 0               | Delay (in seconds) to begin the animation. |
|`color`                  | String                  | '#ccc'          | Valid color value to be used in drawing. |
|`width`                  | Float                   | 300             | Width (in pixels) for the `canvas`. |
|`height`                 | Float                   | 120             | Height (in pixels) for the `canvas`. |
|`size`                   | Float                   | 40              | Size of the brush. |
|`inkAmount`              | Float                   | 1               | Amount of "ink" used. Higher values results in stronger drawings. |
|`lifting`                | Boolean                 | false           | Determines if basic animations (`to-bottom`, `to-top`, `to-right`, `to-left`) must be performed without lifting the brush (continuous drawing), or as several separate drawings (straight lines). |
|`dripping`               | Boolean                 | false           | Determines if it should drips in case there is to much ink. |
|`splashing`              | Boolean                 | true            | Determines if the brush should splash in case of fast draw. |
|`padding`                | Float                   | 30              | Separation between border and drawing for basic animations (`to-bottom`, `to-top`, `to-right`, `to-left`). |
|`overlap`                | Float                   | 10              | Overlap among lines for basic animations (`to-bottom`, `to-top`, `to-right`, `to-left`). |
|`tension`                | Float                   | 0.5             | Used in `points` and basic animations (`to-bottom`, `to-top`, `to-right`, `to-left`) to customize curvature. Typically between [0.0, 1.0] but can be exceeded. |
|`reduceOverflow`         | Integer                 | 20              | This value decreases the overflow in generated curves for basic animations (`to-bottom`, `to-top`, `to-right`, `to-left`). |
|`root`                   | String or DOM Element   | body            | DOM Element (or String selector to get it) to append `canvas`. |
|`el`                     | String or DOM Element   | undefined       | DOM Element (or String selector to get it) to rasterize as image to draw. This require [rasterizeHTML.js](https://github.com/cburgmer/rasterizeHTML.js). |
|`image`                  | String                  | undefined       | Image `src` to draw. |
|`repeat`                 | String                  | 'no-repeat'     | Indicates how to repeat the image. Possible values are: `no-repeat`, `repeat`, `repeat-x`, `repeat-y`. |
|`stretch`                | Boolean                 | true            | Indicates if the image should be stretched in canvas. |
|`queue`                  | Boolean                 | false           | Indicates if animations should be queued. |

### Possible animation values

These are all the possible `animation` values:

- Basic animations (`to-bottom`, `to-top`, `to-right`, `to-left`): This will perform the drawing in te specified direction.
- Path animations (`path`): This will perform the drawing using a SVG path as reference. You must defined the `path` option to specify the path element (or `d` attribute as String).
- Points animations (`points`): This will perform the drawing using a curve generated from an Array of points in format `[x1, y1, x2, y2, ...]`. You must defined the `points` option to specify the Array of points (or a number indicating the amount of random points to generate an Array).

## Operations

These are all the possible operations can be performed with a `Brushstroke` instance:

- `draw(options)`: Draw using the specified configuration.
- `erase(options)`: Like draw, but instead it erase the canvas.
- `fill(options)`: Fill the canvas with defined `el` (HTML) or `image` with no animation.
- `clear()`: Clear the canvas with no animation.
