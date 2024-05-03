import exp = require("constants");
import { differenceInMilliseconds } from "date-fns";
import { promises as fs, Dirent } from "fs";
import * as path from "path";

export interface SubtitleFile {
  path: string;
  upToDate: boolean;
}

export interface VideoFile {
  path: string;
  dirPath: string;
  name: string;
  lastModificationDate: Date;
  subtitles: SubtitleFile[];
}

export class FileUtils {
  static async *walk(dirPath: string): AsyncGenerator<VideoFile> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        yield* this.walk(fullPath);
      } else if (this.isVideoFile(fullPath)) {
        const stats = await fs.stat(fullPath);
        const file: VideoFile = {
          path: fullPath,
          dirPath,
          name: path.basename(fullPath, path.extname(fullPath)),
          lastModificationDate: stats.mtime,
          subtitles: [],
        };
        file.subtitles = await this.findExistingSubtitles(
          dirPath,
          entries,
          file.name,
          file.lastModificationDate,
        );
        yield file;
      }
    }
  }

  private static async findExistingSubtitles(
    dirPath: string,
    entries: Dirent[],
    fileName: string,
    lastModificationDate: Date,
  ): Promise<SubtitleFile[]> {
    const result: SubtitleFile[] = [];
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const entryFileName = path.basename(entryPath);
      if (
        entryFileName.includes(fileName) &&
        this.isEmbeddedSubtitleFile(entryFileName)
      ) {
        const stats = await fs.stat(entryPath);
        result.push({
          path: entryPath,
          upToDate:
            differenceInMilliseconds(lastModificationDate, stats.mtime) < 1000,
        });
      }
    }
    return result;
  }

  private static isVideoFile(filePath: string): boolean {
    const fileExt = path.extname(filePath);
    return !!fileExt && [".mkv"].includes(fileExt);
  }

  private static isEmbeddedSubtitleFile(fileName: string): boolean {
    return !!/[.]embedded_/.exec(fileName);
  }

  static async setFileLastModifiedTime(
    path: string,
    time: Date,
  ): Promise<void> {
    await fs.utimes(path, time, time);
  }

  static async deleteFile(path: string): Promise<void> {
    await fs.unlink(path);
  }
}
