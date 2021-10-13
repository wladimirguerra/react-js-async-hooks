import { DependencyList, useCallback, useEffect, useState } from "react";
import { HasCanceledError, makeCancelable } from "../utils";
import { useErrorHandlerCallback } from "../providers/errorHandlerProvider";
import { AsyncCallbackStatus } from "../enums";

export type OnSuccessEvent<R> = (result: R | void | undefined) => void;
export type OnErrorEvent<E extends HasCanceledError> = (e: E) => void | undefined;
export type UnsafeAsyncCallback<T> = () => Promise<T | void | undefined> | undefined | void;

export interface AsyncCallback<T, E extends HasCanceledError = HasCanceledError> {
    asyncCallback: UnsafeAsyncCallback<T>;
    /**
     * Here is were the states changes in response to async
     * callback result should be. There is no need to be concerned with memory
     * leaks or race conditions.
     * @param result The `asyncCallback` result.
     */
    onSuccess: OnSuccessEvent<T>;
    /**
     * This callback is executed whenever the `asyncFunction` throws
     * or rejects an error.
     * It will not be executed if the promise is canceled, namely when the component
     * is unmounted during the `asyncFunction` execution. So it is safe to change
     * states within this callback.
     * @param e
     */
    onError?: OnErrorEvent<E>;
    /**
     * Here is possible to add cleanup code (like removing
     * subscriptions). **Don't change states here!**
     */
    cleanup?: () => void;
}

/**
 * This hook provide a way to call any async function without the need to handle
 * race conditions or memory leak problems.
 *
 * The state change due to errors response must be done within `onError`
 * param. Any other successful result can safely change states withing
 * `onSuccess`.
 *
 * It is possible to add an error handler context in a component tree using the
 * {@link ErrorHandlerProvider}. The `onError` param has precedence over
 * the error handler in the context.
 *
 *
 * @param effect
 * @param deps
 */
export const useAsyncEffect = <T, E extends HasCanceledError = HasCanceledError>(
    effect: () => AsyncCallback<T, E>,
    deps: DependencyList,
) => {
    const errorHandlerFromProvider = useErrorHandlerCallback();
    const [status, setStatus] = useState(AsyncCallbackStatus.idle);
    const { asyncCallback, onError, onSuccess, cleanup } = effect();

    const errorHandler = useCallback(
        (e: E) => {
            if (e?.isCanceled) return;
            if (e) {
                onError?.(e);
                if (!onError) errorHandlerFromProvider?.(e);
            }
            setStatus(AsyncCallbackStatus.failed);
        },
        // The error handler is update every time a dependency change
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [...deps],
    );

    useEffect(() => {
        if (asyncCallback == null || typeof asyncCallback !== "function") return;
        const unsafePromise = asyncCallback();

        if (!unsafePromise) return;

        const [promise, cancel] = makeCancelable(unsafePromise);

        setStatus(AsyncCallbackStatus.evaluating);
        promise
            .then((result) => {
                onSuccess?.(result);
                setStatus(AsyncCallbackStatus.success);
            }, errorHandler)
            .catch(errorHandler);
        return () => {
            cancel?.();
            cleanup?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps]);

    return status;
};
