# subtitle-extractor

Uses ffmpeg to extract embedded subtitles from every video file in a folder. 

The script will check if there is already a subtitle folder with the same modification date as the video file before trying to extract new subtitles.


usage:
```
Usage: subtitle-extractor [options] [command]

  Options:
    -h, --help          Output usage information
    -l, --language      SUBTITLE_EXTRACTOR_LANGUAGE | Language code to extract subtitles (defaults to ["en"])
    -p, --path          SUBTITLE_EXTRACTOR_PATH     | Directory to search for video files (defaults to [])
    -t, --timeout       SUBTITLE_EXTRACTOR_TIMEOUT  | Timeout for ffmpeg commands (defaults to 150000)
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
