> **Source-repository guide.** The commands and prompt paths below assume a checkout of the [source repository](https://github.com/hhhmike240-maker/lecture-ppt-workflow), not the extracted plugin root or assets directory. Paths such as `install.py`, `demo/`, and `.agents/skills/` belong to that repository setup. For this plugin package, follow the [plugin README](../../README.md) instead: its Skill is under `skills/lecture-ppt-workflow`, its example inputs are under `assets/demo`, and discovery must use the actual installed plugin location. This is the 0.2.0 package.

> **源代码仓库指南。** 下方命令和提示词路径以完整源代码仓库为起点，不能直接在插件根目录执行。插件包请按上方插件说明操作：示例在 `assets/demo`，Skill 在 `skills/lecture-ppt-workflow`，应用发现需确认真实安装位置。本包为 0.2.0 版。

# FAQ

[English README](../README.en.md) · [Quick start](QUICKSTART.en.md) · [中文常见问题](FAQ.md)

### Do I need to install anything?

Not for the [web page](https://hhhmike240-maker.github.io/lecture-ppt-workflow/app/?lang=en): you need a browser and an AI chatbot. To open the downloaded deck you need PowerPoint or WPS.

### Does any AI chatbot work?

Yes. ChatGPT, Claude, Gemini, Copilot, DeepSeek and others can follow the prompt and output an outline. Chatbots that accept Word/PDF uploads are the most convenient; otherwise paste the text of your notes. If the AI's JSON has an error, the page shows where; send that message back and ask it to "output only the corrected, complete JSON".

### Are my notes uploaded?

The page itself uploads nothing: parsing the outline, reading your template and building the PPTX all happen in your browser. What you send to the AI is governed by that service's terms; choose tools your institution allows and do not send student personal data.

### Can it use my institution's template?

Yes. Upload one of your decks (.pptx) in step 3 of the page. Logo images, title rules, color blocks, backgrounds, fonts and main colors are reused; for English decks the template's Latin font is used. Placeholder styles and text in the slide master are not copied. Preview the result and check that headings and text do not overlap template decorations. Before sharing a deck publicly, make sure you may use your institution's marks.

### Why does a slide say the content "overflows the slide"?

Font sizes are fixed per layout so slides stay readable when projected. When content does not fit, the tool asks you to split or trim the slide instead of quietly shrinking the text, and gives you the sentence to send the AI, such as "Slide 5 has too many points: split it into two slides, or cut each point to 12 words or fewer".

### Where are the click animations?

The suggested analysis on case slides and the answers on quiz slides are hidden in the slideshow and fade in on click. The speaker notes list the click order. Microsoft 365 PowerPoint (Windows) and WPS Office (Windows) recognize them as "on click, fade"; the Mac version has not been verified yet.

### What about figures in my notes?

The AI does not redraw figures from your notes. It makes a figure slide with a dashed placeholder saying which figure goes there. Insert the original in PowerPoint, or upload the images in step 3 of the page: an image is placed automatically when its file name matches the `image` field in the outline.

### Does it work for English courses?

Yes. Use the English prompt; slide text follows the language of your notes, and labels the tool adds ("Answer:", "Suggested analysis", the click order in the notes) follow the outline's `language`. English decks default to Calibri. The page interface switches between English and Chinese. In a real test, Claude turned the English sample notes into a 19-slide outline that passed the layout check first time. Other chatbots have not been tested with English notes yet, so feedback is especially welcome.

### Does it cost anything?

It is free and open source (MIT). The AI service and office software you use have their own pricing.

### I want to use it in Codex or Claude Code

See "As a skill" in the [quick start](QUICKSTART.en.md). After installation the agent can read Word notes directly, write the outline, build the deck and check every slide.
