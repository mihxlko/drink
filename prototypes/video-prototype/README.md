# Sip motion prototype

Workspace path: `/Users/a7mih/conductor/workspaces/sip/sanaa`

To reopen the prototype after disconnecting:

```sh
cd /Users/a7mih/conductor/workspaces/sip/sanaa
pnpm lab
```

Open <http://127.0.0.1:4177>. If dependencies are missing, run `npm ci` once before `pnpm lab`. Adjust the controls and select **Download MP4**. The default export is a 12 second, 4K, 30 fps H.264 MP4. The button uses local Chrome and FFmpeg to render each HTML frame at a fixed time, so the result does not depend on screen recording speed. FFmpeg must be installed locally.

The HTML, fonts, background, and bottle artwork are all in this directory. To change the marquee order or its artwork, edit `BOTTLES` in `index.html` and the corresponding files in `assets/`. The preview controls also let you change notification copy, its bottle, the photo backdrop, the loop length, marquee speed, bottle spacing, edge fades, container opacity, the video and container paddings, the gap between the bottles and the toast, and whether the notification animates. The bottles and the toast scale together to fill whatever space the paddings leave; the toast uses the production measurements from `packages/ui/src/toast-styles.css`. The Paper notification is available as `assets/notification-reference.png` for comparison.

**Variants.** The Variant menu at the top of the panel switches between saved looks, which live in `VARIANTS` in `index.html`. **Copy settings** puts the current settings on the clipboard as JSON and **Paste settings** applies them; to save a new variant, paste that JSON into `VARIANTS` under a new name. Uploaded images are copied as a file name only, so put the file in `assets/` and point the variant at it.

**Export area.** *Full video* exports the 16:9 frame. *Container* crops to the container that holds the bottles and the toast, with square corners and no video padding, for placing inside a container on another page.

**Remove photo backdrop.** MP4 cannot be see-through, so with this ticked the download is a zip holding two transparent videos of the same loop: `sip-motion.webm` (VP9, for Chrome and Firefox) and `sip-motion.mov` (HEVC with alpha, for Safari). The container keeps its own opacity, so placing either file over a photo on a web page reproduces the preview.

**Quality.** 1080p, 1440p or 4K, all at 30 fps. The value is the width of the exported file (1920, 2560 or 3840).

**No toast.** Untick *Show notification* to drop the toast; the bottles then scale up to fill the container's height. The *Photo backdrop* menu also has plain white (`#ffffff`). `variant-2` is variant-1 with both.

**Bottle size.** Scales the marquee bottles (and their spacing) within the space the layout gives them, centred vertically. At time 0 the first bottle sits where the left edge fade ends. `variant-2` uses 50%, which fits the six Yeti bottles between the fades, with a 40 s pass and 40 s loop.
