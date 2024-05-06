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
    disposition: {
      default: 0 | 1;
      dub: 0 | 1;
      original: 0 | 1;
      comment: 0 | 1;
      lyrics: 0 | 1;
      karaoke: 0 | 1;
      forced: 0 | 1;
      hearing_impaired: 0 | 1;
      visual_impaired: 0 | 1;
      clean_effects: 0 | 1;
      attached_pic: 0 | 1;
      timed_thumbnails: 0 | 1;
      captions: 0 | 1;
      descriptions: 0 | 1;
      metadata: 0 | 1;
      dependent: 0 | 1;
      still_image: 0 | 1;
    };
    tags: {
      language: string;
      title: string;
    };
  }[];
}

export interface SubtitleStream {
  index: number;
  type: string;
  extension: string;
  title: string | null;
  dispositions: string[];
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
          "json=compact=1",
          "-show_streams",
          "-show_entries",
          "stream=index,codec_name,codec_type,tags,disposition",
          file.path,
        ],
        timeout,
      ),
    );
    return ffprobeOutput.streams
      .filter((stream) => stream.codec_type === "subtitle")
      .map((stream) => ({
        index: stream.index || -1,
        type: stream.codec_name || "",
        extension: this.getSubtitleExtension(stream.codec_name || ""),
        title: stream.tags.title || null,
        dispositions: Object.entries(stream.disposition)
          .filter(([, value]) => !!value)
          .map(([key]) => key),
        language: stream.tags.language || "",
      }))
      .filter(
        (stream) => stream.index !== -1 && stream.type && stream.language,
      );
  }

  static async extractSubtitleStream(
    file: VideoFile,
    subtitleStream: SubtitleStream,
    timeout: number,
  ): Promise<string> {
    const subtitlePath = this.generateSubtitlePath(file, subtitleStream);
    console.log(
      `Extracting subtitle "${chalk.bold(subtitleStream.title || "")}" to "${chalk.dim(subtitlePath)}"...`,
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
        this.getSubtitleEncoder(subtitleStream),
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
      `${file.name}.${subtitleStream.language}.${this.getSubtitleSuffix(subtitleStream)}.${subtitleStream.extension}`,
    );
  }

  private static getSubtitleSuffix(subtitleStream: SubtitleStream): string {
    const dispositions = subtitleStream.dispositions.join(".");
    const title = (subtitleStream.title || "")
      .toLowerCase()
      .replaceAll(/[^a-z0-9]/gi, "_")
      .trim();
    return (
      (dispositions ? `${dispositions}.` : "") +
      `embedded_${subtitleStream.index}` +
      (title ? `_${title}` : "")
    );
  }

  private static getSubtitleEncoder(subtitleStream: SubtitleStream): string {
    switch (subtitleStream.type) {
      case "hdmv_pgs_subtitle":
        return "copy";
      default:
        return subtitleStream.type;
    }
  }

  private static getSubtitleExtension(type: string): string {
    switch (type) {
      case "subrip":
        return "srt";
      case "hdmv_pgs_subtitle":
        return "sup";
      default:
        return type;
    }
  }
}
