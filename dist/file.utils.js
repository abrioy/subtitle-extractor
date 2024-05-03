"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUtils = void 0;
const date_fns_1 = require("date-fns");
const fs_1 = require("fs");
const path = require("path");
class FileUtils {
    static async *walk(dirPath) {
        const entries = await fs_1.promises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                yield* this.walk(fullPath);
            }
            else if (this.isVideoFile(fullPath)) {
                const stats = await fs_1.promises.stat(fullPath);
                const file = {
                    path: fullPath,
                    dirPath,
                    name: path.basename(fullPath, path.extname(fullPath)),
                    lastModificationDate: stats.mtime,
                    subtitles: [],
                };
                file.subtitles = await this.findExistingSubtitles(dirPath, entries, file.name, file.lastModificationDate);
                yield file;
            }
        }
    }
    static async findExistingSubtitles(dirPath, entries, fileName, lastModificationDate) {
        const result = [];
        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            const entryFileName = path.basename(entryPath);
            if (entryFileName.includes(fileName) &&
                this.isEmbeddedSubtitleFile(entryFileName)) {
                const stats = await fs_1.promises.stat(entryPath);
                result.push({
                    path: entryPath,
                    upToDate: (0, date_fns_1.differenceInMilliseconds)(lastModificationDate, stats.mtime) < 1000,
                });
            }
        }
        return result;
    }
    static isVideoFile(filePath) {
        const fileExt = path.extname(filePath);
        return !!fileExt && [".mkv"].includes(fileExt);
    }
    static isEmbeddedSubtitleFile(fileName) {
        return !!/[.]embedded_/.exec(fileName);
    }
    static async setFileLastModifiedTime(path, time) {
        await fs_1.promises.utimes(path, time, time);
    }
    static async deleteFile(path) {
        await fs_1.promises.unlink(path);
    }
}
exports.FileUtils = FileUtils;
