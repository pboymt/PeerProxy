
declare module 'multiplex' {

    import { Duplex } from "stream";

    namespace Multiplex {
        export interface MultiplexInstance extends Duplex {
            createStream(id?: string, opts?: MultiplexSubStreamOptions): MultiplexSubStream;
            receiveStream(id: string, opts?: MultiplexSubStreamOptions): MultiplexSubStream;
            createSharedStream(id: string, opts: MultiplexSubStreamOptions): MultiplexSubStream;
        }
        export interface MultiplexInstanceOptions {
            limit: number;
        }
        export interface MultiplexSubStream extends Duplex {

        }
        export interface MultiplexSubStreamOptions {
            chunked: boolean;
            halfOpen: boolean;
        }
    }

    function Multiplex(onStream?: (stream: Multiplex.MultiplexSubStream, id: string) => void): Multiplex.MultiplexInstance;
    function Multiplex(opts: Multiplex.MultiplexInstanceOptions, onStream?: (stream: Multiplex.MultiplexSubStream, id: string) => void): Multiplex.MultiplexInstance;

    export = Multiplex;
}
