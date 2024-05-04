#!/usr/bin/env ts-node

import * as chalk from "chalk";
import * as args from "args";
import { Extractor } from "./extractor";
import { FileUtils } from "./file.utils";
import { EMPTY, catchError, concatMap } from "rxjs";

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
    ["e", "extension"],
    "SUBTITLE_EXTRACTOR_EXT | Video file extensions",
    ["mkv", "mp4", "avi"],
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
let extensions: string[] = process.env.SUBTITLE_EXTRACTOR_EXT
  ? process.env.SUBTITLE_EXTRACTOR_EXT.split(",")
  : flags.extension;
const timeout: number =
  parseInt(process.env.SUBTITLE_EXTRACTOR_TIMEOUT || "0") || flags.timeout;

if (paths.length === 0 || languages.length === 0) {
  args.showHelp();
}
languages = languages.map((language) => language.trim());
extensions = extensions.map((extension) => `.${extension}`.trim());

console.log(
  `Allowed language(s): ${languages.map((language) => chalk.yellow(language)).join(", ")}`,
);
console.log(
  `Allowed extension(s): ${extensions.map((extension) => chalk.yellow(extension)).join(", ")}`,
);

if (watch) {
  FileUtils.watchPaths(paths)
    .pipe(
      concatMap((changedPath) =>
        Extractor.extractSubtitles(
          [changedPath],
          languages,
          extensions,
          timeout,
        ),
      ),
      catchError((error, caught) => {
        console.error(chalk.red(error));
        return caught;
      }),
    )
    .subscribe();
}

Extractor.extractSubtitles(paths, languages, extensions, timeout).catch(
  (error) => console.error(chalk.red(error)),
);
