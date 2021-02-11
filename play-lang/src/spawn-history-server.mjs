import child_process from "child_process";
import path from "path";
import fs from "fs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

export function HistoryServer(historyFile, portNumber) {
    const self = {
        start,
        stop
    };
    
    const serverLog = fs.createWriteStream("history-server.log");
    const historyFileAbsolutePath = path.resolve(historyFile);
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const serverScriptPath = path.resolve(__dirname, "../history-api/server.js");
    
    let proc;
    
    function start() {
        return new Promise((accept, reject) => {
            proc = child_process.spawn("node", [
                serverScriptPath, 
                historyFileAbsolutePath,
                String(portNumber)
            ]);
            
            proc.stdout.pipe(serverLog);
            proc.stderr.pipe(serverLog);
            
            const listener = (data) => {
                if (data.toString().indexOf("Listening on " + portNumber) !== -1) {
                    proc.stdout.off("data", listener);
                    accept();
                }
            };
            proc.stdout.on("data", listener);

            proc.on('exit', (code) => {
                serverLog.write(`child process exited with code ${code}\n`);
                reject(new Error(`Server process exited with code ${code}`));
            });
        });
    }
    
    function stop() {
        proc.kill();
    }
    
    return self;
}

