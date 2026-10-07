# Course profile and priority of standards

Current request > latest teacher feedback > role styles of the named reference deck > the user's course profile > design judgment. A standard decides only the look; it does not make the academic content correct.

See `course-profile.example.json` in this skill. It is a preference record for the model to read and is not injected into the generator automatically: write its values into the page specification, and generate a `style_check` policy when needed. Each time, record which standard it came from and its hash. Re-check after a template change; never carry over an old institution's marks.

A profile records: canvas, font roles and sizes, colors, the heading/rule relationship, the content safe area, the source area, case permission, the chapter review style, and single-heading exceptions. The example uses 960×540 px. 96 px = 1 inch, pt = px × 0.75; do not treat pixels as points.

The number of heading levels comes from the standard. With two levels, the main heading usually sits above the rule and the slide topic below it; do not add a repeated section label automatically. If a teacher really needs a third level, set spacing for rule–label, label–topic and topic–body separately, and check the actual glyphs, not just the box coordinates. Keep the source area clear of body text and corner decorations.

A gray background is an internal course preference, not a default for every course. Treat white backgrounds inside images separately. Do not shrink fonts to fit content; split first. Users can apply their own templates and preferences; no particular institution's deck is required.
