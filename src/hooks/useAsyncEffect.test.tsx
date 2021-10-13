import { OnErrorEvent, OnSuccessEvent, useAsyncEffect } from "./useAsyncEffect";
import { act, cleanup, renderHook } from "@testing-library/react-hooks";
import { AsyncCallbackStatus } from "../enums";
import { ErrorHandlerProvider } from "../providers/errorHandlerProvider";
import React, { useState } from "react";
import { HasCanceledError } from "../utils";

//HELPERS
const ErrorHandlerProviderWrapper = (errorHandler: (e: unknown) => void): React.FC => ({ children }) => (
    <ErrorHandlerProvider errorHandlerCallback={errorHandler}>{children}</ErrorHandlerProvider>
);

const useCancelOnDepsChange = (
    onSuccess: OnSuccessEvent<unknown>,
    onError: OnErrorEvent<HasCanceledError>,
    cleanup: () => void,
) => {
    const [promise, setPromise] = useState<void | Promise<string | void | undefined> | undefined>();
    const [result, setResult] = useState<string | void | undefined>();
    const status = useAsyncEffect<string>(
        () => ({
            asyncCallback: () => promise,
            onSuccess: (res) => {
                onSuccess?.(res);
                setResult(res);
            },
            onError,
            cleanup,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [promise],
    );

    return {
        execute: (promise: void | Promise<string | void | undefined> | undefined) => setPromise(promise),
        status,
        result,
    };
};

describe("useAsyncEffect tests", () => {
    afterEach(() => {
        cleanup();
    });

    //TEST CASES

    test("useAsyncEffect is defined", () => {
        expect(useAsyncEffect).toBeDefined();
    });

    test("resolve a successfull async callback", async () => {
        const errorHandler = jest.fn();
        const successHandler = jest.fn();
        const { asyncCallback, resolvePromise } = getUnsafeCallback();
        const { waitForNextUpdate } = renderHook(() =>
            useAsyncEffect<AsyncCallbackStatus>(
                () => ({
                    asyncCallback,
                    onSuccess: successHandler,
                    onError: errorHandler,
                    cleanup,
                }),
                [],
            ),
        );

        const asyncResult = "Resolved!!!";
        act(() => {
            resolvePromise?.(asyncResult);
        });
        await waitForNextUpdate?.();
        expect(successHandler).toHaveBeenCalledWith(asyncResult);
        expect(errorHandler).not.toHaveBeenCalled();
    });

    test("rejected promise - error handler from args", async () => {
        const errorHandler = jest.fn();
        const successHandler = jest.fn();

        const { asyncCallback, rejectPromise } = getUnsafeCallback();
        const { result, waitForNextUpdate } = renderHook(() =>
            useAsyncEffect(
                () => ({
                    asyncCallback,
                    onSuccess: successHandler,
                    onError: errorHandler,
                }),
                [],
            ),
        );
        expect(result.current).toEqual(AsyncCallbackStatus.evaluating);
        act(() => {
            rejectPromise?.(new Error("Timeout"));
        });
        await waitForNextUpdate?.();
        expect(result.current).toEqual(AsyncCallbackStatus.failed);
        expect(successHandler).not.toHaveBeenCalled();
        expect(errorHandler).toHaveBeenCalled();
    });

    test("rejected promise - error handler from provider", async () => {
        const errorHandler = jest.fn();
        const { asyncCallback, rejectPromise } = getUnsafeCallback();
        const { result, waitForNextUpdate } = renderHook(
            () =>
                useAsyncEffect(
                    () => ({
                        asyncCallback,
                        onSuccess: () => {},
                    }),
                    [],
                ),
            { wrapper: ErrorHandlerProviderWrapper(errorHandler) },
        );
        expect(result.current).toEqual(AsyncCallbackStatus.evaluating);
        act(() => {
            rejectPromise?.(new Error("Rejected Promise Timeout"));
        });
        await waitForNextUpdate?.();
        expect(result.current).toEqual(AsyncCallbackStatus.failed);
        expect(errorHandler).toHaveBeenCalled();
    });

    test("rejected promise - error handler from arg priority over error handler from provider", async () => {
        const errorHandler = jest.fn();
        const errorHandlerFromProvider = jest.fn();

        const { asyncCallback, rejectPromise } = getUnsafeCallback();
        const { result, waitForNextUpdate } = renderHook(
            () =>
                useAsyncEffect(
                    () => ({
                        asyncCallback,
                        onSuccess: () => {},
                        onError: errorHandler,
                    }),
                    [],
                ),
            { wrapper: ErrorHandlerProviderWrapper(errorHandlerFromProvider) },
        ) ?? { result: { current: { status: undefined } } };
        expect(result.current).toEqual(AsyncCallbackStatus.evaluating);
        act(() => {
            rejectPromise?.(new Error("Rejected Promise Timeout"));
        });
        await waitForNextUpdate?.();
        expect(result.current).toEqual(AsyncCallbackStatus.failed);
        expect(errorHandler).toHaveBeenCalled();
        expect(errorHandlerFromProvider).not.toHaveBeenCalled();
    });

    test("race condition safe", async () => {
        const cleanup = jest.fn();
        const onError = jest.fn();
        const onSuccess = jest.fn();
        const { unsafePromise, resolvePromise } = getUnsafePromise();
        const { unsafePromise: unsafePromise1, rejectPromise: rejectPromise1 } = getUnsafePromise();
        const { unsafePromise: unsafePromise2, resolvePromise: resolvePromise2 } = getUnsafePromise();
        const { result } = renderHook(() => useCancelOnDepsChange(onSuccess, onError, cleanup));

        const resolvedResult = "!!!!Resolved!!!";
        const resolvedResult1 = "!!!!Resolved 1!!!";
        const resolvedResult2 = "!!!!Resolved 2!!!";

        await act(async () => {
            // Simulate race condition
            result.current.execute(unsafePromise);

            // Interrupts this line of execution and wait for next tick
            // so the code within the useCancelOnDepsChange can run.
            await waitForNextTick();

            // Change the useCancelOnDepsChange's promise state (a useAsyncEffect dependency)
            // while the first promise has not being fullfilled.
            result.current.execute(unsafePromise1);

            await waitForNextTick();

            // Again one more time the useAsyncEffect dependency is changed
            // before the previous promises has been fullfilled.
            result.current.execute(unsafePromise2);

            await waitForNextTick();

            result.current.execute();

            // Resolves the promises in different order of the async callbacks execution.
            resolvePromise?.(resolvedResult);
            resolvePromise2?.(resolvedResult2);
            // Simulate a failed call
            rejectPromise1?.(resolvedResult1);
            await waitForNextTick();
        });

        // Despite the multiple calls and one being rejected, the result is
        // successfull because of the last call being resolved successfully
        expect(result.current.status).toEqual(AsyncCallbackStatus.success);
        expect(onError).not.toHaveBeenCalled();
        // onSuccess is executed only when the last promise is resolved.
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith(resolvedResult2);
        // Number of times the deps changed.
        expect(cleanup).toHaveBeenCalledTimes(3);
    });

    [
        {
            asyncCallback: async () => {
                await new Promise(() => {
                    throw new Error("Rejected Promise");
                });
            },
            description: "error thrown within a promise",
        },
        {
            asyncCallback: async () => {
                await new Promise((_, reject) => reject(new Error("Rejected Promise")));
            },
            description: "rejected with error",
        },
        {
            asyncCallback: async () => {
                throw new Error("Rejected Promise");
            },
            description: "error thrown",
        },
    ].forEach(({ description, asyncCallback }) => {
        test(`${description}`, async () => {
            const errorHandler = jest.fn();
            const successHandler = jest.fn();
            const { result } = renderHook(() =>
                useAsyncEffect(() => ({ asyncCallback, onSuccess: successHandler, onError: errorHandler }), []),
            );

            expect(result.current).toEqual(AsyncCallbackStatus.evaluating);
            await act(async () => {
                //Wait for the next tick
                await Promise.resolve();
            });
            expect(result.current).toEqual(AsyncCallbackStatus.failed);
            expect(successHandler).not.toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith(new Error("Rejected Promise"));
        });
    });
});
