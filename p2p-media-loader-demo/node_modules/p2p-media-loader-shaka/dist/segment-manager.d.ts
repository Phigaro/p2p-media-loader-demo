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
import { LoaderInterface } from "p2p-media-loader-core";
import { ParserSegment } from "./parser-segment";
import { AssetsStorage } from "./engine";
export declare class SegmentManager {
    private readonly debug;
    private readonly loader;
    private readonly requests;
    private manifestUri;
    private playheadTime;
    private readonly segmentHistory;
    private readonly settings;
    constructor(loader: LoaderInterface, settings?: Partial<SegmentManagerSettings>);
    destroy(): Promise<void>;
    getSettings(): SegmentManagerSettings;
    load(parserSegment: ParserSegment, manifestUri: string, playheadTime: number): Promise<{
        data: ArrayBuffer;
        timeMs: number | undefined;
    }>;
    setPlayheadTime(time: number): void;
    private refreshLoad;
    private pushSegmentHistory;
    private reportSuccess;
    private reportError;
    private onSegmentLoaded;
    private onSegmentError;
    private onSegmentAbort;
}
export interface SegmentManagerSettings {
    /**
     * Number of segments for building up predicted forward segments sequence; used to predownload and share via P2P
     */
    forwardSegmentCount: number;
    /**
     * Maximum amount of requested segments manager should remember; used to build up sequence with correct priorities for P2P sharing
     */
    maxHistorySegments: number;
    /**
     * Override default swarm ID that is used to identify unique media stream with trackers (manifest URL without
     * query parameters is used as the swarm ID if the parameter is not specified)
     */
    swarmId?: string;
    /**
     * A storage for the downloaded assets: manifests, subtitles, init segments, DRM assets etc. By default the assets are not stored.
     */
    assetsStorage?: AssetsStorage;
}
