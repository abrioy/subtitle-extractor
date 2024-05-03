"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecUtils = void 0;
const rxjs_1 = require("rxjs");
const child_process_1 = require("child_process");
const shellEscape = require("shell-escape");
const chalk = require("chalk");
class ExecUtils {
    static exec(program, args) {
        return new rxjs_1.Observable((subscriber) => {
            const command = `${program} ${shellEscape(args)}`;
            console.log(chalk.cyan(">"), chalk.cyan(command));
            const childProcess = (0, child_process_1.exec)(command);
            childProcess.stdout?.on("data", (data) => {
                //console.log('>', data);
                subscriber.next({
                    stream: "stdout",
                    data,
                });
            });
            childProcess.stderr?.on("data", (data) => {
                //console.log('>', data);
                subscriber.next({
                    stream: "stderr",
                    data,
                });
            });
            childProcess.on("close", (code) => {
                if (code !== 0) {
                    subscriber.error(`Process exited with code ${code}`);
                }
                subscriber.complete();
            });
            return () => {
                childProcess.kill();
            };
        });
    }
    static execAndGetStdout(program, args, execTimeout) {
        return (0, rxjs_1.lastValueFrom)(this.exec(program, args).pipe((0, rxjs_1.timeout)(execTimeout), (0, rxjs_1.filter)((data) => data.stream === "stdout"), (0, rxjs_1.startWith)({
            stream: "stdout",
            data: "",
        }), (0, rxjs_1.scan)((acc, value) => [...acc, value.data], []), (0, rxjs_1.map)((acc) => acc.join("\n"))));
    }
}
exports.ExecUtils = ExecUtils;
