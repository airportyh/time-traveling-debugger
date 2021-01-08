import { HistoryServer } from "../spawn-history-server.mjs";

import child_process from "child_process";
import path from "path";
import fs from "fs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import exitHook from 'exit-hook';

async function main() {
    let url;
    let historyServer;
    const argument = process.argv[2];
    if (!argument) {
        console.log("Please provide either a URL or a file.");
        return;
    }
    
    if (argument.startsWith("http://")) {
        url = argument;
    } else {
        url = "http://localhost:1337";
        // start the history server
        console.log(`Starting history API server`);
        historyServer = HistoryServer(argument, 1337);
        await historyServer.start();
        exitHook(() => {
            historyServer.stop();
        });
    }
    
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const webpackPath = path.resolve(__dirname, "../../node_modules/.bin/webpack");
    const webpackConfigPath = path.resolve(__dirname, "../../zoom-debugger.webpack.test.config.js");
    const proc = child_process.spawn(webpackPath, [
        "serve",
        "--config", 
        webpackConfigPath
    ]);
    
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);

    proc.on('exit', (code) => {
        console.log(`child process exited with code ${code}`);
    });
    
    exitHook(stop);
    
    function stop() {
        proc.kill();
    }
}

main().catch(err => console.log(err.stack));