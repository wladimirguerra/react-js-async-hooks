export class HasCanceledError extends Error {
    isCanceled: boolean;

    constructor() {
        super("Promise Canceled");
        this.isCanceled = true;
    }
}

/**
 * The following function was based on [@istarkov code](https://github.com/facebook/react/issues/5465#issuecomment-157888325)
 *
 * @param promise
 */
export const makeCancelable = <T>(promise: Promise<T>): [Promise<T>, () => void] => {
    let hasCanceled_ = false;

    if (!promise) throw "Promise must not be null!";

    const wrappedPromise = new Promise<T>((resolve, reject) => {
        promise.then(
            (val) => (hasCanceled_ ? reject(new HasCanceledError()) : resolve(val)),
            (error) => (hasCanceled_ ? reject(new HasCanceledError()) : reject(error)),
        );
    });

    return [
        wrappedPromise,
        () => {
            hasCanceled_ = true;
        },
    ];
};
