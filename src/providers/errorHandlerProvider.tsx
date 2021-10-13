import React, { createContext, useContext } from "react";

export type ErrorHandlerCallback = (e: Error) => void;

export const ErrorHandlerContext = createContext<ErrorHandlerCallback | undefined>(undefined);

interface ErrorHandlerProviderProps {
    errorHandlerCallback: ErrorHandlerCallback;
}

export const ErrorHandlerProvider: React.FC<ErrorHandlerProviderProps> = ({ errorHandlerCallback, children }) => {
    return <ErrorHandlerContext.Provider value={errorHandlerCallback}> {children} </ErrorHandlerContext.Provider>;
};

export const useErrorHandlerCallback = () => useContext(ErrorHandlerContext);
