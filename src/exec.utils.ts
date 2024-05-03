import {
  Observable,
  filter,
  from,
  lastValueFrom,
  map,
  scan,
  startWith,
  timeout,
} from "rxjs";
import { exec } from "child_process";
import shellEscape = require("shell-escape");
import * as chalk from "chalk";

export class ExecUtils {
  static exec(
    program: string,
    args: string[],
  ): Observable<{ stream: "stdout" | "stderr"; data: string }> {
    return new Observable((subscriber) => {
      const command = `${program} ${shellEscape(args)}`;
      console.log(chalk.cyan(">"), chalk.cyan(command));
      const childProcess = exec(command);

      childProcess.stdout?.on("data", (data: string) => {
        //console.log('>', data);
        subscriber.next({
          stream: "stdout",
          data,
        });
      });

      childProcess.stderr?.on("data", (data: string) => {
        //console.log('>', data);
        subscriber.next({
          stream: "stderr",
          data,
        });
      });

      childProcess.on("close", (code: number) => {
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

  static execAndGetStdout(
    program: string,
    args: string[],
    execTimeout: number,
  ): Promise<string> {
    return lastValueFrom(
      this.exec(program, args).pipe(
        timeout(execTimeout),
        filter((data) => data.stream === "stdout"),
        startWith({
          stream: "stdout",
          data: "",
        }),
        scan((acc, value) => [...acc, value.data], [] as string[]),
        map((acc) => acc.join("\n")),
      ),
    );
  }
}
