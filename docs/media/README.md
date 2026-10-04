# Demo overview video / 演示导览视频

[Play the 60-second video](lecture-ppt-workflow-overview.mp4).

The video uses this repository's original Chinese demo slides with English captions. It is a silent visual walkthrough, **not a screen recording**, and does not show live model execution, real-time generation speed, or animation playback. It does not validate English-course output.

视频使用本仓库原创中文课件预览，附英文说明，无配音。它展示内容组织的前后变化；不是操作录屏，不证明生成速度、模型调用成功或实际点击动画效果。

The source order and captions are in [`scripts/build_overview_video.py`](../../scripts/build_overview_video.py). To reproduce it, supply your own FFmpeg executable and fresh output/work paths:

```text
python scripts/build_overview_video.py --ffmpeg /path/to/ffmpeg --out scratch/video-new/overview.mp4 --work scratch/video-new/work
```

FFmpeg and fonts are not bundled. The video contains only the project's demonstration images and added text; no private instructor materials or external photos are used.
