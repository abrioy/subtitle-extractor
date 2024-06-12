import * as chalk from "chalk";
import { formatDuration, intervalToDuration } from "date-fns";
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
      refresh: boolean;
    },
  ): Promise<void> {
    for (let path of paths) {
      if (!(await FileUtils.exists(path))) {
        console.error(
          chalk.red(
            `The following path can't be accessed: "${chalk.dim(path)}"`,
          ),
        );
      } else {
        console.log(`Processing all video files in "${chalk.dim(path)}"...`);
        let videoCount = 0;
        let newVideoCount = 0;
        let subtitleCount = 0;
        const startTime = new Date();
        for await (const file of FileUtils.walk(options.videoFormats, path)) {
          videoCount++;
          if (
            !options.refresh &&
            file.subtitles.length > 0 &&
            file.subtitles.every((subtitle) => subtitle.upToDate)
          ) {
            console.log(
              `Found ${chalk.yellow(file.subtitles.filter((subtitle) => !subtitle.dummy).length)} up to date subtitle(s) for "${chalk.dim(file.path)}"`,
            );
          } else {
            newVideoCount++;
            console.log(
              `Extracting subtitles for "${chalk.dim(file.path)}"...`,
            );

            if (file.subtitles.length > 0) {
              console.log(
                `Removing ${chalk.red(file.subtitles.length)}${options.refresh ? " " : " out of date subtitle "}file(s)...`,
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
                options.subtitleFormats.includes(subtitleStreams.extension),
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
              subtitleCount++;
            }

            if (subtitleStreams.length === 0) {
              const subtitlePath = await VideoUtils.createDummySubtitle(file);
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
        console.log(`Path: ${chalk.dim(path)}`);
        const duration =
          formatDuration(
            intervalToDuration({
              start: startTime,
              end: new Date(),
            }),
          ) || "0s";
        console.log(
          `Processed ${chalk.yellow(videoCount)} (${chalk.cyan(newVideoCount)} new) video file(s) and extracted ${chalk.yellow(subtitleCount)} subtitle(s) in ${chalk.dim(duration)}.`,
        );
      }
    }
  }
}
