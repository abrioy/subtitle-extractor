import chalk = require("chalk");
import { differenceInMilliseconds } from "date-fns";
import { Dirent, FSWatcher, promises as fs, watch } from "fs";
import * as path from "path";
import {
  Observable,
  interval,
  lastValueFrom,
  switchMap,
  takeUntil,
  takeWhile,
  timer,
} from "rxjs";

export interface SubtitleFile {
  path: string;
  upToDate: boolean;
  dummy: boolean;
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
          dummy: entryPath.endsWith(".nosub"),
        });
      }
    }
    return result;
  }

  static async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async toDirectory(unknownPath: string): Promise<string | null> {
    if (unknownPath) {
      try {
        const stat = await fs.stat(unknownPath);
        if (!stat.isDirectory()) {
          return path.dirname(unknownPath);
        }
      } catch (error) {
        const code = (error as any)?.code;
        if (code === "ENOENT") {
          console.error(`Path does not exist: "${chalk.red(unknownPath)}"`);
          return null;
        } else {
          console.error(
            `Error while fetching directory for path: "${chalk.red(unknownPath)}"`,
            error,
          );
          return null;
        }
      }
    }
    return unknownPath;
  }

  static async setFileLastModifiedTime(
    path: string,
    time: Date,
  ): Promise<void> {
    await fs.utimes(path, time, time);
  }

  static async deleteFile(path: string): Promise<void> {
    if (await FileUtils.exists(path)) {
      await fs.unlink(path);
    }
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

  static async createFile(path: string): Promise<void> {
    await fs.writeFile(path, "");
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
