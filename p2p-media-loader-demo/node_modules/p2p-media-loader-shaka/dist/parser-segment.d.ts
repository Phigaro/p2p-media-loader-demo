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
export declare class ParserSegment {
    readonly streamId: number;
    readonly streamType: string;
    readonly streamPosition: number;
    readonly streamIdentity: string;
    readonly identity: string;
    readonly position: number;
    readonly start: number;
    readonly end: number;
    readonly uri: string;
    readonly range: string | undefined;
    readonly prev: () => ParserSegment | undefined;
    readonly next: () => ParserSegment | undefined;
    static create(stream: any, position: number): ParserSegment | undefined;
    private constructor();
}
export declare class ParserSegmentCache {
    private readonly segments;
    private readonly maxSegments;
    constructor(maxSegments: number);
    find(uri: string, range?: string): ParserSegment | undefined;
    add(stream: any, position: number): void;
    clear(): void;
}
