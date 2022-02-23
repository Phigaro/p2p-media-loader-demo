/**
 * Copyright 2018 Novage LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ParserSegment } from "./parser-segment";
export declare class ShakaManifestParserProxy {
    private readonly cache;
    private readonly originalManifestParser;
    private manifest;
    constructor(originalManifestParser: any);
    isHls(): boolean;
    isDash(): boolean;
    start(uri: string, playerInterface: any): any;
    configure(config: any): any;
    stop(): any;
    update(): any;
    onExpirationUpdated(): any;
    find(uri: string, range?: string): ParserSegment | undefined;
    reset(): void;
    private hookGetSegmentReference;
}
export declare class ShakaDashManifestParserProxy extends ShakaManifestParserProxy {
    constructor();
}
export declare class ShakaHlsManifestParserProxy extends ShakaManifestParserProxy {
    constructor();
}
