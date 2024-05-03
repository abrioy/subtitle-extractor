#!/usr/bin/env ts-node

import * as chalk from "chalk";
import { FileUtils } from "./file.utils";
import { VideoUtils } from "./video.utils";

(async () => {
  for await (const file of FileUtils.walk("./test")) {
    if (
      file.subtitles.length >  0  && file.subtitles.every((subtitle) => subtitle.upToDate)
    ) {
        console.log(`Found ${chalk.yellow(file.subtitles.length)} up to date subtitle(s) for "${chalk.dim(file.path)}"`);
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

      const subtitleStreams = await VideoUtils.getSubtitleStreams(file);
      for (const subtitleStream of subtitleStreams) {
        const subtitlePath = await VideoUtils.extractSubtitleStream(
          file,
          subtitleStream,
        );
        await FileUtils.setFileLastModifiedTime(
          subtitlePath,
          file.lastModificationDate,
        );
      }
      console.log(`Extracted ${chalk.yellow(subtitleStreams.length)} subtitle file(s)`);
    }
  }
})().catch((error) => {
  console.error(chalk.red(error));
});
