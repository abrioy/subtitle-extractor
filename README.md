# subtitle-extractor

Uses ffmpeg to extract embedded subtitles from every video file in a folder. 

The script will check if there is already a subtitle folder with the same modification date as the video file before trying to extract new subtitles.


usage:
```
Usage: subtitle-extractor [options] [command]

  Options:
    -h, --help          Output usage information
    -p, --path          SUBTITLE_EXTRACTOR_PATH     | Directory to search for video files
    -l, --language      SUBTITLE_EXTRACTOR_LANGUAGE | Language code to extract subtitles (defaults to ["en"])
    -e, --extension     SUBTITLE_EXTRACTOR_EXT      | Video file extensions (defaults to ["mkv","mp4","avi"])
    -w, --watch         SUBTITLE_EXTRACTOR_WATCH    | Watch specified paths for change (disabled by default)
    -t, --timeout       SUBTITLE_EXTRACTOR_TIMEOUT  | Timeout for ffmpeg commands (defaults to 150000)

  Examples:
    - Extracts the english subtitles of mkv files in the specified directories
    $ --path /media/series --path /media/movies --language en --extension mkv
```


docker compose example:

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
