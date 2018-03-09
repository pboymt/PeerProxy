import chalk from "chalk";

namespace out {
    export function info(msg: any) {
        console.log(`${chalk.green('[info]\t ')}${msg}`);
    }

    export function log(msg: any) {
        console.log(`${chalk.blue('[log]\t ')}${msg}`);
    }

    export function message(msg: any) {
        console.log(`${chalk.white('[server] ')}${msg}`);
    }

    export function error(msg: any) {
        console.log(`${chalk.red('[error]\t ')}${msg}`);
    }

    export function warn(msg: any) {
        console.log(`${chalk.yellow('[warn]\t ')}${msg}`);
    }

    export function help(msg: string) {
        console.log(`${chalk.redBright('[help]\t ')}${msg}`);
    }

    export function peer(msg: string) {
        console.log(`${chalk.magenta('[peer]\t ')}${msg}`);
    }
}

export default out;