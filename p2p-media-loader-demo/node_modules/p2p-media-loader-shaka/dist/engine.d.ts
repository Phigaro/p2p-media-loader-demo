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
import { EventEmitter } from "events";
import { HybridLoaderSettings } from "p2p-media-loader-core";
import { SegmentManagerSettings } from "./segment-manager";
export interface ShakaEngineSettings {
    loader: Partial<HybridLoaderSettings>;
    segments: Partial<SegmentManagerSettings>;
}
export declare class Engine extends EventEmitter {
    static isSupported(): boolean;
    private readonly loader;
    private readonly segmentManager;
    constructor(settings?: Partial<ShakaEngineSettings>);
    destroy(): Promise<void>;
    getSettings(): any;
    getDetails(): any;
    initShakaPlayer(player: any): void;
}
export interface Asset {
    masterSwarmId: string;
    masterManifestUri: string;
    requestUri: string;
    requestRange?: string;
    responseUri: string;
    data: ArrayBuffer;
}
export interface AssetsStorage {
    storeAsset(asset: Asset): Promise<void>;
    getAsset(requestUri: string, requestRange: string | undefined, masterSwarmId: string): Promise<Asset | undefined>;
    destroy(): Promise<void>;
}
