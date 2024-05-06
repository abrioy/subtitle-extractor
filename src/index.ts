#!/usr/bin/env ts-node

import * as chalk from "chalk";
import * as args from "args";
import { Extractor } from "./extractor";
import { FileUtils } from "./file.utils";
import {
  EMPTY,
  catchError,
  concatMap,
  map,
  of,
  queue,
  timer,
  interval,
  startWith,
  shareReplay,
} from "rxjs";
import { queueMap } from "./queue-operator";

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
    "SUBTITLE_EXTRACTOR_VIDEO_EXT | Allowed video file extensions",
    ["mkv", "mp4", "avi"],
  )
  .option(
    ["s", "subtitle-format"],
    "SUBTITLE_EXTRACTOR_SUB_EXT | Allowed subtitle file extensions",
    ["srt", "ass", "sup"],
  )
  .option(
    ["t", "timeout"],
    "SUBTITLE_EXTRACTOR_TIMEOUT | Timeout for ffmpeg commands",
    150000,
  )
  .example(
    "--path /media/series --path /media/movies --language en --extension mkv",
    "Extracts the english subtitles of mkv files in the specified directories",
  );
const flags = args.parse(process.argv);

const paths: string[] = process.env.SUBTITLE_EXTRACTOR_PATH
  ? [process.env.SUBTITLE_EXTRACTOR_PATH]
  : flags.path;
let languages: string[] = process.env.SUBTITLE_EXTRACTOR_LANGUAGE
  ? process.env.SUBTITLE_EXTRACTOR_LANGUAGE.split(",")
  : flags.language;
const watch: number = process.env.SUBTITLE_EXTRACTOR_WATCH
  ? process.env.SUBTITLE_EXTRACTOR_WATCH === "1" ||
    process.env.SUBTITLE_EXTRACTOR_WATCH === "true"
  : flags.watch;
let videoFormats: string[] = process.env.SUBTITLE_EXTRACTOR_EXT
  ? process.env.SUBTITLE_EXTRACTOR_EXT.split(",")
  : flags.videoFormat;
let subtitleFormats: string[] = process.env.SUBTITLE_EXTRACTOR_EXT
  ? process.env.SUBTITLE_EXTRACTOR_EXT.split(",")
  : flags.subtitleFormat;
const timeout: number =
  parseInt(process.env.SUBTITLE_EXTRACTOR_TIMEOUT || "0") || flags.timeout;

if (paths.length === 0 || languages.length === 0) {
  args.showHelp();
}
languages = languages.map((language) => language.trim());
videoFormats = videoFormats.map((extension) => `.${extension}`.trim());
subtitleFormats = subtitleFormats.map((extension) => `.${extension}`.trim());

console.log(
  `Allowed language(s): ${languages.map((language) => chalk.yellow(language)).join(", ")}`,
);
console.log(
  `Allowed video format(s): ${videoFormats.map((videoFormat) => chalk.yellow(videoFormat)).join(", ")}`,
);
console.log(
  `Allowed subtitle format(s): ${subtitleFormats.map((subtitleFormat) => chalk.yellow(subtitleFormat)).join(", ")}`,
);

if (watch) {
  FileUtils.watchPaths(paths)
    .pipe(
      startWith(...paths),
      queueMap((changedPath) =>
        Extractor.extractSubtitles([changedPath], {
          languages,
          videoFormats,
          subtitleFormats,
          timeout,
        }).catch((error) => {
          console.error(chalk.red(error));
        }),
      ),
    )
    .subscribe();
} else {
  Extractor.extractSubtitles(paths, {
    languages,
    videoFormats,
    subtitleFormats,
    timeout,
  }).catch((error) => console.error(chalk.red(error)));
}
