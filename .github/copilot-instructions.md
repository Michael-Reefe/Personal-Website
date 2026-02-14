# Personal Astrophysics Research Website

This is a single-page interactive personal website for an MIT astrophysics PhD candidate. The site features an image-map based navigation system with hover effects and a pixel-art aesthetic.

## Architecture

**Landing Page (`index.html`)**: Interactive image map where hovering over different regions of a Cygnus A composite image reveals navigation overlays and previews. Includes a hidden audio player easter egg (top-left corner).

**Content Pages**: Static HTML files ([about.html](../about.html), [cv.html](../cv.html), [affiliations.html](../affiliations.html), [publications.html](../publications.html), [research.html](../research.html)) with navigation bar using Cygnus A image variants as thumbnails.

**Data Management**: [data.yaml](../data.yaml) stores page content in YAML format with HTML markup for future dynamic rendering (currently unused - content is hardcoded in HTML files).

## Key Technical Patterns

### Image-Relative Coordinate System
Navigation overlays use fractional coordinates (0.0-1.0) relative to the source image dimensions, not viewport. The [animations-or-something.js](../animations-or-something.js) script calculates positions dynamically:

- Images use `object-fit: contain` to prevent cropping (letterboxing with black bars)
- Overlay regions map to image features regardless of viewport size
- Example: `data-x="0.25" data-y="0.25" data-w="0.50" data-h="0.50"` places a region at 25% from left/top, spanning 50% width/height of the image

### Hover Preview System
When hovering navigation regions on [index.html](../index.html):
- `.hover-preview` element displays the alternate image variant (`data-img` attribute)
- Main background dims/desaturates (`.link-hovered` class on `.bg-wrapper`)
- Labels for other sections gray out via `[data-hover]` attribute matching

### Anchored Elements
Elements like `.site-title` and `.credit` use `data-x`/`data-y` attributes to position relative to the displayed image, not the viewport. The script translates these to CSS percentage positioning.

## Styling Conventions

**Font**: PixelOperator (custom pixel font in [fonts/](../fonts/)) for retro aesthetic throughout all pages

**Colors**: 
- Background: Pure black (`#000`)
- Links: Yellow (`#e5eb71`) / visited purple (`#a76ea2`)
- Content boxes: Semi-transparent black overlay (`rgba(0,0,0,0.72)`)

**Responsive**: Font sizes use `clamp()` for scaling; content pages have `.content-page` class restricting scroll to `.content-box` only

## Dependencies

- jQuery 3.7.1 (used for potential future dynamic content loading)
- js-yaml 4.1.0 (loaded but not actively used - intended for [data.yaml](../data.yaml) parsing)

Dependencies are served from `node_modules/`. Run `npm install` to populate.

## Development Notes

- **No build system**: Direct HTML/CSS/JS files, no bundler or transpiler
- **Image assets**: Navigation uses specific regions of `images/cygnus_a/iyl_cyga*.png` variants (X-ray, optical, radio wavelengths)
- **Secret feature**: Clicking top-left image region (`link-secret`) reveals audio player with Vivaldi concerto from [super-secret-folder-wow-what-could-it-be/](../super-secret-folder-wow-what-could-it-be/)
- **Version busting**: CSS/JS files use `?v=1.2` query strings in HTML to force cache refreshes

## Editing Content

Content pages currently hardcode HTML despite [data.yaml](../data.yaml) structure. To update:
- **For now**: Edit HTML directly in individual files ([about.html](../about.html), etc.)
- **Future enhancement**: Implement YAML-driven rendering to sync with [data.yaml](../data.yaml)

When adjusting navigation regions on [index.html](../index.html), modify `data-x/y/w/h` attributes on `.bg-link` elements to match visual features in the Cygnus A image.
