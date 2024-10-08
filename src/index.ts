#!/usr/bin/env ts-node

import * as args from "args";
import * as chalk from "chalk";
import {
  catchError,
  concatMap,
  delay,
  filter,
  lastValueFrom,
  startWith,
  switchMap,
  timer,
} from "rxjs";
import { Extractor } from "./extractor";
import { FileUtils } from "./file.utils";
import { queueMap } from "./queue-operator";

(async () => {
  args
    .option(
      ["p", "path"],
      "SUBTITLE_EXTRACTOR_PATH | Directory to search for video files",
      [],
    )
    .option(
      ["l", "language"],
      "SUBTITLE_EXTRACTOR_LANGUAGE | Language code to extract subtitles",
      ["en"],
    )
    .option(
      ["w", "watch"],
      "SUBTITLE_EXTRACTOR_WATCH | Watch specified paths for change",
      false,
    )
    .option(
      ["v", "video-format"],
      "SUBTITLE_EXTRACTOR_VIDEO_FORMAT | Allowed video file extensions",
      ["mkv", "mp4", "avi"],
    )
    .option(
      ["s", "subtitle-format"],
      "SUBTITLE_EXTRACTOR_SUBTITLE_FORMAT | Allowed subtitle file extensions",
      ["srt", "ass", "sup"],
    )
    .option(
      ["d", "delay"],
      "SUBTITLE_EXTRACTOR_DELAY | Delay before processing a watched directory",
      10000,
    )
    .option(
      ["t", "timeout"],
      "SUBTITLE_EXTRACTOR_TIMEOUT | Timeout for ffmpeg commands",
      150000,
    )
    .option(
      ["r", "refresh"],
      "SUBTITLE_EXTRACTOR_REFRESH | Refresh exising subtitles",
      false,
    )
    .example(
      "--path /media/series --path /media/movies --language en --extension mkv",
      "Extracts the english subtitles of mkv files in the specified directories",
    );
  const flags = args.parse(process.argv);

  let paths: string[] = process.env.SUBTITLE_EXTRACTOR_PATH
    ? [process.env.SUBTITLE_EXTRACTOR_PATH]
    : flags.path;
  let languages: string[] = process.env.SUBTITLE_EXTRACTOR_LANGUAGE
    ? process.env.SUBTITLE_EXTRACTOR_LANGUAGE.split(",")
    : flags.language;
  const watch: number = process.env.SUBTITLE_EXTRACTOR_WATCH
    ? process.env.SUBTITLE_EXTRACTOR_WATCH === "1" ||
      process.env.SUBTITLE_EXTRACTOR_WATCH === "true"
    : flags.watch;
  let videoFormats: string[] = process.env.SUBTITLE_EXTRACTOR_VIDEO_FORMAT
    ? process.env.SUBTITLE_EXTRACTOR_VIDEO_FORMAT.split(",")
    : flags.videoFormat;
  let subtitleFormats: string[] = process.env.SUBTITLE_EXTRACTOR_SUBTITLE_FORMAT
    ? process.env.SUBTITLE_EXTRACTOR_SUBTITLE_FORMAT.split(",")
    : flags.subtitleFormat;
  const watchDelay: number =
    parseInt(process.env.SUBTITLE_EXTRACTOR_DELAY || "0") || flags.delay;
  const timeout: number =
    parseInt(process.env.SUBTITLE_EXTRACTOR_TIMEOUT || "0") || flags.timeout;
  const refresh: boolean = process.env.SUBTITLE_EXTRACTOR_REFRESH
    ? process.env.SUBTITLE_EXTRACTOR_REFRESH === "1" ||
      process.env.SUBTITLE_EXTRACTOR_REFRESH === "true"
    : flags.refresh;

  paths = (
    await Promise.all(paths.map((path) => FileUtils.toDirectory(path)))
  ).filter((path): path is string => !!path);

  if (paths.length === 0 || languages.length === 0) {
    args.showHelp();
  }
  languages = languages.map((language) => language.trim());
  videoFormats = videoFormats.map((extension) => `.${extension.trim()}`);
  subtitleFormats = subtitleFormats.map((extension) => `.${extension.trim()}`);

  console.log(
    `Allowed language(s): ${languages.map((language) => chalk.yellow(language)).join(", ")}`,
  );
  console.log(
    `Allowed video format(s): ${videoFormats.map((videoFormat) => chalk.yellow(videoFormat)).join(", ")}`,
  );
  console.log(
    `Allowed subtitle format(s): ${subtitleFormats.map((subtitleFormat) => chalk.yellow(subtitleFormat)).join(", ")}`,
  );
  console.log(
    `timeout: ${chalk.yellow(timeout / 1000)}s, refresh: ${chalk.yellow(refresh)}, watch delay: ${chalk.yellow(watchDelay / 1000)}s`,
  );

  if (watch) {
    await lastValueFrom(
      FileUtils.watchPaths(paths).pipe(
        catchError((error, caught) => {
          console.error(
            chalk.red("Error while watching for changes:"),
            chalk.red(error),
          );
          return timer(watchDelay).pipe(switchMap(() => caught));
        }),
        delay(watchDelay),
        startWith(...paths),
        concatMap((path) => FileUtils.toDirectory(path)),
        filter((path): path is string => !!path),
        queueMap((changedPath) =>
          Extractor.extractSubtitles([changedPath], {
            languages,
            videoFormats,
            subtitleFormats,
            timeout,
            refresh,
          }).catch((error) => {
            console.error(chalk.red(error));
            return null;
          }),
        ),
      ),
    );
  } else {
    await Extractor.extractSubtitles(paths, {
      languages,
      videoFormats,
      subtitleFormats,
      timeout,
      refresh,
    });
  }
})().catch((error) => {
  console.error(chalk.red(error));
});
