"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoUtils = void 0;
const exec_utils_1 = require("./exec.utils");
const path = require("path");
const chalk = require("chalk");
class VideoUtils {
    static FFPROBE_TIMEOUT = 15000;
    static FFMPEG_TIMEOUT = 150000;
    static async getSubtitleStreams(file) {
        const ffprobeOutput = JSON.parse(await exec_utils_1.ExecUtils.execAndGetStdout("ffprobe", [
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            file.path,
        ], this.FFPROBE_TIMEOUT));
        return ffprobeOutput.streams
            .filter((stream) => stream.codec_type === "subtitle")
            .map((steam) => ({
            index: steam.index,
            type: steam.codec_name,
            title: steam.tags.title,
            language: steam.tags.language,
        }));
    }
    static async extractSubtitleStream(file, subtitleStream) {
        const subtitlePath = this.generateSubtitlePath(file, subtitleStream);
        console.log(`Extracting subtitle "${chalk.bold(subtitleStream.title)}" to "${chalk.dim(subtitlePath)}"...`);
        await exec_utils_1.ExecUtils.execAndGetStdout("ffmpeg", [
            "-y",
            "-i",
            file.path,
            "-map",
            `0:${subtitleStream.index}`,
            "-c:s",
            subtitleStream.type,
            subtitlePath,
        ], this.FFMPEG_TIMEOUT);
        return subtitlePath;
    }
    static generateSubtitlePath(file, subtitleStream) {
        return path.join(file.dirPath, `${file.name}.${subtitleStream.language}.embedded_${subtitleStream.index}_${this.formatSubtitleTitle(subtitleStream.title)}.${subtitleStream.type}`);
    }
    static formatSubtitleTitle(title) {
        return title.toLowerCase().replaceAll(/[^a-z0-9]/gi, "_");
    }
}
exports.VideoUtils = VideoUtils;
