/* eslint-disable react-hooks/exhaustive-deps */
import { DependencyList, useCallback, useEffect, useRef } from "react";
import { makeCancelable } from "../utils";

/**
 * This hook allows a safe execution of an async callback within an imperative funcion.
 *
 */
export const useAsyncCallback = <R, P extends Array<unknown>>(
    asyncCallback: (...params: P) => Promise<R | void | undefined>,
    deps: DependencyList,
) => {
    const cancelPromise = useRef<() => void>();

    useEffect(() => {
        return () => {
            cancelPromise.current?.();
        };
    }, [...deps]);

    return useCallback(
        (...params: P) => {
            const [safePromise, cancel] = makeCancelable(asyncCallback(...params));
            cancelPromise.current = cancel;
            return safePromise;
        },
        [...deps],
    );
};
