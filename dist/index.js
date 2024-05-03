#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const file_utils_1 = require("./file.utils");
const video_utils_1 = require("./video.utils");
(async () => {
    for await (const file of file_utils_1.FileUtils.walk("./test")) {
        if (file.subtitles.length > 0 && file.subtitles.every((subtitle) => subtitle.upToDate)) {
            console.log(`Found ${chalk.yellow(file.subtitles.length)} up to date subtitle(s) for "${chalk.dim(file.path)}"`);
        }
        else {
            console.log(`Extracting subtitles for "${chalk.dim(file.path)}"...`);
            if (file.subtitles.length > 0) {
                console.log(`Removing ${chalk.red(file.subtitles.length)} out of date subtitle file(s)...`);
                for (const subtitle of file.subtitles) {
                    await file_utils_1.FileUtils.deleteFile(subtitle.path);
                }
            }
            const subtitleStreams = await video_utils_1.VideoUtils.getSubtitleStreams(file);
            for (const subtitleStream of subtitleStreams) {
                const subtitlePath = await video_utils_1.VideoUtils.extractSubtitleStream(file, subtitleStream);
                await file_utils_1.FileUtils.setFileLastModifiedTime(subtitlePath, file.lastModificationDate);
            }
            console.log(`Extracted ${chalk.yellow(subtitleStreams.length)} subtitle file(s)`);
        }
    }
})().catch((error) => {
    console.error(chalk.red(error));
});
