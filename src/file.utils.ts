import chalk = require("chalk");
import exp = require("constants");
import { differenceInMilliseconds } from "date-fns";
import { promises as fs, Dirent, FSWatcher, watch } from "fs";
import * as path from "path";
import { Observable } from "rxjs";

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
  static async *walk(
    allowedExtensions: string[],
    dirPath: string,
  ): AsyncGenerator<VideoFile> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        yield* this.walk(allowedExtensions, fullPath);
      } else if (this.isVideoFile(allowedExtensions, fullPath)) {
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

  static exists(path: string): Promise<boolean> {
    return fs
      .access(path)
      .then(() => true)
      .catch(() => false);
  }

  static async toDirectory(unknownPath: string): Promise<string> {
    const stat = await fs.stat(unknownPath);
    if (!stat.isDirectory()) {
      return path.dirname(unknownPath);
    } else {
      return unknownPath;
    }
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

  static watchPaths(dirPaths: string[]): Observable<string> {
    return new Observable<string>((subscriber) => {
      const watchers: FSWatcher[] = [];

      for (const dirPath of dirPaths) {
        console.log(
          chalk.bold(`Watching for changes in "${chalk.dim(dirPath)}"...`),
        );
        const watcher = watch(
          dirPath,
          { persistent: true, recursive: true },
          (event, filename) => {
            if (event === "change" && filename) {
              subscriber.next(path.join(dirPath, filename));
            }
          },
        );
        watchers.push(watcher);
      }

      return () => {
        watchers.forEach((watcher) => watcher.close());
      };
    });
  }

  private static isVideoFile(
    allowedExtensions: string[],
    filePath: string,
  ): boolean {
    const fileExt = path.extname(filePath);
    return !!fileExt && allowedExtensions.includes(fileExt);
  }

  private static isEmbeddedSubtitleFile(fileName: string): boolean {
    return !!/[.]embedded_/.exec(fileName);
  }
}
