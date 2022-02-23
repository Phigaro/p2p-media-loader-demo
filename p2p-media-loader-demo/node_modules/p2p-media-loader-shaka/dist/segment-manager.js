"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const p2p_media_loader_core_1 = require("p2p-media-loader-core");
const utils_1 = require("./utils");
const defaultSettings = {
    forwardSegmentCount: 20,
    maxHistorySegments: 50,
    swarmId: undefined,
    assetsStorage: undefined,
};
class SegmentManager {
    constructor(loader, settings = {}) {
        this.debug = Debug("p2pml:shaka:sm");
        this.requests = new Map();
        this.manifestUri = "";
        this.playheadTime = 0;
        this.segmentHistory = [];
        this.onSegmentLoaded = (segment) => {
            if (this.requests.has(segment.id)) {
                this.reportSuccess(this.requests.get(segment.id), segment);
                this.debug("request delete", segment.id);
                this.requests.delete(segment.id);
            }
        };
        this.onSegmentError = (segment, error) => {
            if (this.requests.has(segment.id)) {
                this.reportError(this.requests.get(segment.id), error);
                this.debug("request delete from error", segment.id);
                this.requests.delete(segment.id);
            }
        };
        this.onSegmentAbort = (segment) => {
            if (this.requests.has(segment.id)) {
                this.reportError(this.requests.get(segment.id), "Internal abort");
                this.debug("request delete from abort", segment.id);
                this.requests.delete(segment.id);
            }
        };
        this.settings = Object.assign(Object.assign({}, defaultSettings), settings);
        this.loader = loader;
        this.loader.on(p2p_media_loader_core_1.Events.SegmentLoaded, this.onSegmentLoaded);
        this.loader.on(p2p_media_loader_core_1.Events.SegmentError, this.onSegmentError);
        this.loader.on(p2p_media_loader_core_1.Events.SegmentAbort, this.onSegmentAbort);
    }
    async destroy() {
        if (this.requests.size !== 0) {
            console.error("Destroying segment manager with active request(s)!");
            for (const request of this.requests.values()) {
                this.reportError(request, "Request aborted due to destroy call");
            }
            this.requests.clear();
        }
        this.playheadTime = 0;
        this.segmentHistory.splice(0);
        if (this.settings.assetsStorage !== undefined) {
            await this.settings.assetsStorage.destroy();
        }
        await this.loader.destroy();
    }
    getSettings() {
        return this.settings;
    }
    async load(parserSegment, manifestUri, playheadTime) {
        this.manifestUri = manifestUri;
        this.playheadTime = playheadTime;
        this.pushSegmentHistory(parserSegment);
        const lastRequestedSegment = this.refreshLoad();
        const alreadyLoadedSegment = await this.loader.getSegment(lastRequestedSegment.id);
        return new Promise((resolve, reject) => {
            const request = new Request(lastRequestedSegment.id, resolve, reject);
            if (alreadyLoadedSegment) {
                this.reportSuccess(request, alreadyLoadedSegment);
            }
            else {
                this.debug("request add", request.id);
                this.requests.set(request.id, request);
            }
        });
    }
    setPlayheadTime(time) {
        this.playheadTime = time;
        if (this.segmentHistory.length > 0) {
            this.refreshLoad();
        }
    }
    refreshLoad() {
        const lastRequestedSegment = this.segmentHistory[this.segmentHistory.length - 1];
        const safePlayheadTime = this.playheadTime > 0.1 ? this.playheadTime : lastRequestedSegment.start;
        const sequence = this.segmentHistory.reduce((a, i) => {
            if (i.start >= safePlayheadTime) {
                a.push(i);
            }
            return a;
        }, []);
        if (sequence.length === 0) {
            sequence.push(lastRequestedSegment);
        }
        const lastRequestedSegmentIndex = sequence.length - 1;
        do {
            const next = sequence[sequence.length - 1].next();
            if (next) {
                sequence.push(next);
            }
            else {
                break;
            }
        } while (sequence.length < this.settings.forwardSegmentCount);
        const masterSwarmId = utils_1.getMasterSwarmId(this.manifestUri, this.settings);
        const loaderSegments = sequence.map((s, i) => ({
            id: `${masterSwarmId}+${s.streamIdentity}+${s.identity}`,
            url: s.uri,
            masterSwarmId: masterSwarmId,
            masterManifestUri: this.manifestUri,
            streamId: s.streamIdentity,
            sequence: s.identity,
            range: s.range,
            priority: i,
        }));
        this.loader.load(loaderSegments, `${masterSwarmId}+${lastRequestedSegment.streamIdentity}`);
        return loaderSegments[lastRequestedSegmentIndex];
    }
    pushSegmentHistory(segment) {
        if (this.segmentHistory.length >= this.settings.maxHistorySegments) {
            this.debug("segment history auto shrink");
            this.segmentHistory.splice(0, this.settings.maxHistorySegments * 0.2);
        }
        if (this.segmentHistory.length > 0 && this.segmentHistory[this.segmentHistory.length - 1].start > segment.start) {
            this.debug("segment history reset due to playhead seek back");
            this.segmentHistory.splice(0);
        }
        this.segmentHistory.push(segment);
    }
    reportSuccess(request, loaderSegment) {
        let timeMs;
        if (loaderSegment.downloadBandwidth !== undefined && loaderSegment.downloadBandwidth > 0 && loaderSegment.data && loaderSegment.data.byteLength > 0) {
            timeMs = Math.trunc(loaderSegment.data.byteLength / loaderSegment.downloadBandwidth);
        }
        this.debug("report success", request.id);
        request.resolve({ data: loaderSegment.data, timeMs });
    }
    reportError(request, error) {
        if (request.reject) {
            this.debug("report error", request.id);
            request.reject(error);
        }
    }
} // end of SegmentManager
exports.SegmentManager = SegmentManager;
class Request {
    constructor(id, resolve, reject) {
        this.id = id;
        this.resolve = resolve;
        this.reject = reject;
    }
}
