import Mock = jest.Mock;

declare interface UnsafePromise {
    unsafePromise: void | Promise<string | void | undefined> | undefined;
    resolvePromise: ((value: unknown) => void) | undefined;
    rejectPromise: ((reason: unknown) => void) | undefined;
}

declare interface UnsafeAsyncCallback extends Omit<UnsafePromise, "unsafePromise"> {
    asyncCallback: Mock;
}

declare function getUnsafeCallback(): UnsafeAsyncCallback;

declare function getUnsafePromise(): UnsafePromise;

declare function getUnsafePromiseList(number: number): UnsafeAsyncCallback[];

declare function waitForNextTick(): Promise<void>;
