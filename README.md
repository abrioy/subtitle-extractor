# subtitle-extractor

A tool that uses ffmpeg to extract embedded subtitles from every video file in a folder.

## How It Works

Given a directory, the tool recursively traverses it to locate video and subtitle files. If the last modification date of both files is identical, the subtitles are assumed to be up to date.

If a video file lacks subtitles, the tool attempts to extract every track for the specified languages using ffmpeg. If no matching tracks are found, a file named `$VIDEO_FILE.nosub` is created to indicate that the file doesn't need to be checked again.

This approach enables very fast subsequent runs if no changes are detected (less than a second for a few thousand files), although the initial pass will still take some time since the process is not parallelized.

The `--watch` option uses [`fs.watch`](https://nodejs.org/docs/latest/api/fs.html#fspromiseswatchfilename-options) to monitor any new or modified video files.

### Supported Formats

Since ffmpeg handles the heavy lifting, please refer to the documentation of the version installed on your system, or check the Docker image: https://hub.docker.com/r/linuxserver/ffmpeg.

# Usage
```
Usage: subtitle-extractor [options] [command]

  Options:
    -h, --help              Output usage information
    -p, --path              SUBTITLE_EXTRACTOR_PATH              | Directory to search for video files
    -l, --language          SUBTITLE_EXTRACTOR_LANGUAGE          | Language code to extract subtitles (defaults to ["en"])
    -v, --video-format      SUBTITLE_EXTRACTOR_VIDEO_FORMAT      | Allowed video file extensions (defaults to ["mkv","mp4","avi"])
    -s, --subtitle-format   SUBTITLE_EXTRACTOR_SUBTITLE_FORMAT   | Allowed subtitle file extensions (defaults to ["srt","ass","sup"])
    -w, --watch             SUBTITLE_EXTRACTOR_WATCH             | Watch specified paths for change (disabled by default)
    -d, --delay             SUBTITLE_EXTRACTOR_DELAY             | Delay before processing a watched directory (defaults to 10000)
    -t, --timeout           SUBTITLE_EXTRACTOR_TIMEOUT           | Timeout for ffmpeg commands (defaults to 150000)

  Examples:
    - Extracts the english subtitles of mkv files in the specified directories
    $ --path /media/series --path /media/movies --language en --extension mkv
```

# Docker Compose
```yaml
version: "3.8"
services:

  subtitle-extractor:
    container_name: subtitle-extractor
    image: abrioy/subtitle-extractor:latest
    restart: unless-stopped
    environment:
      TZ: Europe/Paris
      SUBTITLE_EXTRACTOR_PATH: /data
      SUBTITLE_EXTRACTOR_LANGUAGE: "en, fr"
    volumes:
      - /usr/media:/data
```
