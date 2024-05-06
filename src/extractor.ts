import * as chalk from "chalk";
import { FileUtils } from "./file.utils";
import { VideoUtils } from "./video.utils";

export class Extractor {
  static async extractSubtitles(
    paths: string[],
    options: {
      languages: string[];
      videoFormats: string[];
      subtitleFormats: string[];
      timeout: number;
    },
  ): Promise<void> {
    for (const path of paths) {
      if (!(await FileUtils.exists(path))) {
        console.error(
          chalk.red(
            `The following path can't be accessed: "${chalk.dim(path)}"`,
          ),
        );
      } else {
        console.log(`Processing all video files in "${chalk.dim(path)}"...`);
        let count = 0;
        for await (const file of FileUtils.walk(options.videoFormats, path)) {
          count++;
          if (
            file.subtitles.length > 0 &&
            file.subtitles.every((subtitle) => subtitle.upToDate)
          ) {
            console.log(
              `Found ${chalk.yellow(file.subtitles.length)} up to date subtitle(s) for "${chalk.dim(file.path)}"`,
            );
          } else {
            console.log(
              `Extracting subtitles for "${chalk.dim(file.path)}"...`,
            );

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
              options.timeout,
            );
            subtitleStreams = subtitleStreams
              .filter((subtitleStream) =>
                options.languages.some((language) =>
                  subtitleStream.language.includes(language),
                ),
              )
              .filter((subtitleStreams) =>
                options.subtitleFormats.includes(subtitleStreams.type),
              );
            for (const subtitleStream of subtitleStreams) {
              const subtitlePath = await VideoUtils.extractSubtitleStream(
                file,
                subtitleStream,
                options.timeout,
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
}
