# Animation and notes

Animations are actually written into the PPTX and advance on the teacher's click. Common appear, fade and wipe effects run about 0.3–0.6 s; no automatic slide advance and no sounds. Material and questions show first; clicks reveal hints and the suggested analysis. A process unfolds in the order of its logic and is fully readable at the end. Splitting content over several slides does not by itself count as animation.

New slides can use the tool's `reveal_group_object` naming: each group is one click and its objects fade in together. The tool handles only the new slides you name explicitly and refuses to overwrite existing timing; it must not be used to rebuild a teacher's whole animation. Inherited slides keep their media triggers and notes. Invalid names, duplicate object IDs, and animating a group together with its children are errors.

Notes help the teacher teach: purpose, misconceptions, conditions of use, links to the previous and next slide, and sources. Case slides add suggested timing, questions and follow-ups, likely student answers, the suggested analysis and the click order. Do not write tool or check logs into notes, and do not just copy the slide text.

Verification has layers: the package's target references and click structure; final static content and rendering; real PowerPoint/WPS playback (hidden at start, revealed on click, media playing). Reading the animation collection over COM is not seeing the slideshow, and a spot check is not compatibility with every program. Without a way to play the deck, keep the correct structure and state what was not verified.
