import { useState } from "react";
import { useAsyncCallback } from "./useAsyncCallback";
import { act, renderHook } from "@testing-library/react-hooks";

describe("useAsyncCallbackExecutor", () => {
    test("resolve async callback promisse", async () => {
        const { resolvePromise, asyncCallback } = getUnsafeCallback();
        const { result } = renderHook(() => useAsyncCallback(asyncCallback, []));

        let safePromise: Promise<unknown> | undefined;
        const promiseResult = "____result!!____";
        act(() => {
            // Execute the asyncCallback
            safePromise = result.current();
            // Resolves promise
            resolvePromise?.(promiseResult);
        });
        expect(await safePromise).toEqual(promiseResult);
    });

    test("canceled promise is not executed", async () => {
        const { resolvePromise, asyncCallback } = getUnsafeCallback();

        const { result } = renderHook(() => {
            const [invalidatePromise, setInvalidatePromise] = useState<boolean>();
            return {
                useAsyncCallback: useAsyncCallback(asyncCallback, [invalidatePromise]),
                changeDep: setInvalidatePromise,
            };
        });

        let safePromise: Promise<unknown> | undefined;
        const promiseResult = "__Will never be returned__";
        act(() => {
            // Run the async callback
            safePromise = result.current.useAsyncCallback();
            // Invalidate promise before it resolves
            result.current.changeDep(true);
            // Resolve promise
            resolvePromise?.(promiseResult);
        });

        await expect(safePromise).rejects.toThrowError("Promise Canceled");
    });
});
