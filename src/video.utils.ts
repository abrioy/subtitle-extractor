import { promises as fs, Dirent } from "fs";
import { VideoFile } from "./file.utils";
import { ExecUtils } from "./exec.utils";
import * as path from "path";
import * as chalk from "chalk";

export interface FFProbeOutput {
  streams: {
    index: number;
    codec_name: string;
    codec_type: string;
    tags: {
      language: string;
      title: string;
    };
  }[];
}

export interface SubtitleStream {
  index: number;
  type: string;
  title: string;
  language: string;
}

export class VideoUtils {
  static async getSubtitleStreams(
    file: VideoFile,
    timeout: number,
  ): Promise<SubtitleStream[]> {
    const ffprobeOutput: FFProbeOutput = JSON.parse(
      await ExecUtils.execAndGetStdout(
        "ffprobe",
        [
          "-v",
          "quiet",
          "-print_format",
          "json",
          "-show_format",
          "-show_streams",
          file.path,
        ],
        timeout,
      ),
    );
    return ffprobeOutput.streams
      .filter((stream) => stream.codec_type === "subtitle")
      .map((steam) => ({
        index: steam.index,
        type: steam.codec_name,
        title: steam.tags.title,
        language: steam.tags.language,
      }));
  }

  static async extractSubtitleStream(
    file: VideoFile,
    subtitleStream: SubtitleStream,
    timeout: number,
  ): Promise<string> {
    const subtitlePath = this.generateSubtitlePath(file, subtitleStream);
    console.log(
      `Extracting subtitle "${chalk.bold(subtitleStream.title)}" to "${chalk.dim(subtitlePath)}"...`,
    );
    await ExecUtils.execAndGetStdout(
      "ffmpeg",
      [
        "-y",
        "-i",
        file.path,
        "-map",
        `0:${subtitleStream.index}`,
        "-c:s",
        subtitleStream.type,
        subtitlePath,
      ],
      timeout,
    );
    return subtitlePath;
  }

  private static generateSubtitlePath(
    file: VideoFile,
    subtitleStream: SubtitleStream,
  ): string {
    return path.join(
      file.dirPath,
      `${file.name}.${subtitleStream.language}.embedded_${subtitleStream.index}_${this.formatSubtitleTitle(subtitleStream.title)}.${subtitleStream.type}`,
    );
  }

  private static formatSubtitleTitle(title: string): string {
    return title.toLowerCase().replaceAll(/[^a-z0-9]/gi, "_");
  }
}
