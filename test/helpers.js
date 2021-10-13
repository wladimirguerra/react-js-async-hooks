global.getUnsafePromise = () => {
    let resolvePromise;
    let rejectPromise;
    const unsafePromise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    return { unsafePromise, resolvePromise, rejectPromise };
};

/**
 *
 * @return {{asyncCallback: jest.Mock<Promise<unknown>, []>, rejectPromise, resolvePromise}}
 * `rejectPromise` and `resolvePromise` will be undefined until asyncCallback is executed.
 */
global.getUnsafeCallback = () => {
    const { unsafePromise, resolvePromise, rejectPromise } = getUnsafePromise();

    const asyncCallback = jest.fn(() => unsafePromise);
    return { resolvePromise, asyncCallback, rejectPromise };
};

global.getUnsafePromiseList = (number) => {
    let list = [];
    for (let i = 0; i < number; i += 1) {
        list.push(getUnsafePromise());
    }
    return list;
};

global.waitForNextTick = () => new Promise((resolve) => setTimeout(resolve, 0));
