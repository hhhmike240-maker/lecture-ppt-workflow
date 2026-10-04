# Example prompts

[English overview](../README.en.md) · [Quick start](../docs/QUICKSTART.en.md) · [中文提示词](PROMPTS.md)

Use these prompts in a new Codex task opened in the repository after following the quick start. The installed Skill is `.agents/skills/lecture-ppt-workflow` when you use the project-scoped installation. Mention the Python virtual environment you prepared so the task uses the same dependencies.

These prompts are in English. The bundled lecture and reference slides are in Chinese, and the first prompt deliberately requests a Chinese deck. Detailed Skill instructions and references remain primarily in Chinese. Complete English slide output has not yet been validated.

## Check discovery and the environment

```text
Use $lecture-ppt-workflow. First confirm that you can discover and read
.agents/skills/lecture-ppt-workflow/SKILL.md in this project. If it is not
available, report that instead of claiming the Skill was used.

Inspect the required tools, fonts, and rendering options before generating
slides. Use this repository's .venv Python environment, where available.
Report missing dependencies and relevant runtime limitations. Do not install
dependencies or silently switch generation engines. Make no slides yet.
```

## Create the short Chinese demo

```text
Use $lecture-ppt-workflow. Use demo/lecture.md as the content source,
demo/standard.pptx as the visual reference, and the Skill's
course-profile.example.json as a source of preferences.

Check runtime availability and licensing requirements first. If generation
dependencies are missing, stop generation and report what is missing.
Do not silently substitute another engine.

Create a three-slide Chinese teaching deck. Cover the handover framework,
the supplied fictional scenario, and a final relationship diagram. Preserve
speaker notes. Make the scenario's reference analysis fade in on a teacher's
click. Do not add outside stories or school branding.

Write a new output file, render and inspect every slide, and report any
unresolved issue. Distinguish structural validation, static inspection,
and actual slideshow playback; do not report an unperformed check as passed.
```

## Revise one slide after feedback

Run this after a deck has been created. If several files exist, specify the exact target file first.

```text
Use $lecture-ppt-workflow. Revise only slide 2 of the deck we just created.
Keep the teaching content, but arrange the scenario as materials at the top,
discussion at the lower left, and reference analysis at the lower right.
Reveal the reference analysis on click.

Place subheadings below the horizontal rule with space before the body text.
Keep the fictional-scenario label in its own bottom region, clear of the
body. Preserve the content and speaker notes on slides 1 and 3. Do not
expand the scenario or change other slides.

Save a new file, inspect the revised slide, and give a short change report
that states which checks were actually performed.
```

## Extract a reference style without generating slides

```text
Use $lecture-ppt-workflow. Analyze demo/standard.pptx only. Identify its
canvas size, title, horizontal rule, body text, source region, and font roles.
Suggest a reusable course profile and explain any uncertain observations.
Do not copy its teaching content or generate a new slide deck.
```

## Add a supplied teaching scenario

Attach or identify the existing knowledge deck and your scenario material before running this prompt.

```text
Use $lecture-ppt-workflow. Add the scenario material I provided to the
existing knowledge deck and deliver a complete enhanced version as a new
file. Keep the original knowledge deck and all required knowledge content.

Show scenario materials on the slides and reveal reference analysis on click.
The teaching sequence should remain coherent if the scenario is skipped.
Do not invent missing scenarios. Preserve source information and any
fictional labels. Render and inspect the result and state the limits of
the checks you performed.
```

## Trial with your own English materials

This is a suggested trial, not a validated English-output example. Supply English lecture notes and a reference deck with suitable fonts; replace the bracketed fields before sending it.

```text
Use $lecture-ppt-workflow. The lecture source is [lecture file] and the
visual reference is [reference PPTX]. The audience is [student level and
background], the teaching time is [duration], and the requested scope is
[chapter or section]. Produce the slides and speaker notes in English.

Confirm Skill discovery and runtime availability first. Read the full
source and inspect its figures. Map required knowledge and original figures
to planned slides. Follow the supplied reference deck's visual roles and
use fonts available in this environment. Keep technical meaning and source
information intact. Use only the scenarios I supplied unless I explicitly
authorize additional fictional material.

Create an editable deck with speaker notes and a final relationship diagram
that reflects the actual chapter. Write a new output file. Inspect content
coverage, English terminology, text fit, and every rendered slide. Report
unresolved issues and clearly distinguish static checks from actual
slideshow testing. Treat this as an English-output trial requiring my review.
```

## What has been tested

The shipped demo was produced from specifications reviewed within the original task, then reproduced with `run_demo.py` and the supporting scripts. The runner does not call a model. These prompts offer starting points for a new task; they are not evidence that independent Codex invocation, English output, or actual animation playback has passed validation. See the [validation record in Chinese](../docs/VALIDATION.md).

To report a trial result, [open an issue](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues/new/choose) with the prompt, environment, and a small example you have permission to share. Remove student information, private course materials, and personal paths.
