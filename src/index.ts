#!/usr/bin/env ts-node

import * as chalk from "chalk";
import { FileUtils } from "./file.utils";
import { SubtitleStream, VideoUtils } from "./video.utils";
import * as args from "args";
import path = require("path");

args
  .option(
    "path",
    "SUBTITLE_EXTRACTOR_PATH | Directory to search for video files",
    [],
  )
  .option(
    "language",
    "SUBTITLE_EXTRACTOR_LANGUAGE | Language code to extract subtitles",
    ["en"],
  )
  .option(
    "timeout",
    "SUBTITLE_EXTRACTOR_TIMEOUT | Timeout for ffmpeg commands",
    150000,
  );

(async () => {
  const flags = args.parse(process.argv);
  const paths: string[] = process.env.SUBTITLE_EXTRACTOR_PATH
    ? [process.env.SUBTITLE_EXTRACTOR_PATH]
    : flags.path;
  let languages: string[] = process.env.SUBTITLE_EXTRACTOR_LANGUAGE
    ? process.env.SUBTITLE_EXTRACTOR_LANGUAGE.split(",")
    : flags.language;
  const timeout: number =
    parseInt(process.env.SUBTITLE_EXTRACTOR_TIMEOUT || "0") || flags.timeout;

  if (paths.length === 0 || languages.length === 0) {
    args.showHelp();
  }
  languages = languages.map((language) => language.trim());

  console.log(
    `Allowed language(s): ${languages.map((language) => chalk.yellow(language)).join(", ")}`,
  );
  for (const path of paths) {
    console.log(`Processing all video files in "${chalk.dim(path)}"...`);
    for await (const file of FileUtils.walk(path)) {
      if (
        file.subtitles.length > 0 &&
        file.subtitles.every((subtitle) => subtitle.upToDate)
      ) {
        console.log(
          `Found ${chalk.yellow(file.subtitles.length)} up to date subtitle(s) for "${chalk.dim(file.path)}"`,
        );
      } else {
        console.log(`Extracting subtitles for "${chalk.dim(file.path)}"...`);

        if (file.subtitles.length > 0) {
          console.log(
            `Removing ${chalk.red(file.subtitles.length)} out of date subtitle file(s)...`,
          );
          for (const subtitle of file.subtitles) {
            await FileUtils.deleteFile(subtitle.path);
          }
        }

        let subtitleStreams = await VideoUtils.getSubtitleStreams(
          file,
          timeout,
        );
        subtitleStreams = subtitleStreams.filter((subtitleStream) =>
          languages.some((language) =>
            subtitleStream.language.includes(language),
          ),
        );
        for (const subtitleStream of subtitleStreams) {
          const subtitlePath = await VideoUtils.extractSubtitleStream(
            file,
            subtitleStream,
            timeout,
          );
          await FileUtils.setFileLastModifiedTime(
            subtitlePath,
            file.lastModificationDate,
          );
        }
        console.log(
          `Extracted ${chalk.yellow(subtitleStreams.length)} subtitle file(s)`,
        );
      }
    }
  }
})().catch((error) => {
  console.error(chalk.red(error));
});
