import * as chalk from "chalk";
import { FileUtils } from "./file.utils";
import { SubtitleStream, VideoUtils } from "./video.utils";
import * as args from "args";
import * as path from "path";

export class Extractor {
  static async extractSubtitles(
    paths: string[],
    languages: string[],
    extensions: string[],
    timeout: number,
  ): Promise<void> {
    for (const path of paths) {
      console.log(`Processing all video files in "${chalk.dim(path)}"...`);
      let count = 0;
      for await (const file of FileUtils.walk(extensions, path)) {
        count++;
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
      console.log(
        `Processed ${chalk.yellow(count)} video file(s) in "${chalk.dim(path)}".`,
      );
    }
  }
}
