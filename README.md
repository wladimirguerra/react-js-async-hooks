# React Async Hooks

> Simple yet effective hooks to handle async functions within react components.

[![NPM](https://img.shields.io/npm/v/react-js-async-hooks.svg)](https://www.npmjs.com/package/react-common-mui-components) [![JavaScript Style Guide](https://img.shields.io/badge/code%20style-prettier-blueviolet)](https://prettier.io)

The aim of this library is to prevent boilerplate code to handle async callback, providing a simple interface to deal
with states changes.

## Install

This library requires [React.JS v17](https://reactjs.org).

To install this library run:

```bash
npm install --save react-js-async-hooks
```

Or:

```bash
yarn add react-js-async-hooks
```

### ESLint Configuration

`exhaustive-deps` can be configure to validate dependencies of
`useAsyncEffect` hook.

> *The dependency validation is highly recommended!*

Add or edit `"react-hooks/exhaustive-deps"` rule to have something like the following snippet in the `.eslintrc.json`.

```json
{
  "rules": {
    "react-hooks/exhaustive-deps": [
      "warn",
      {
        "additionalHooks": "(useAsyncEffect|useAsyncCallback)"
      }
    ]
  }
}
```

For more details
see [`eslint-plugin-react-hooks` documentation.](https://www.npmjs.com/package/eslint-plugin-react-hooks)

### Jest Configuration

This library complys ECMAScript standard, so it is not compatible
with [Node.JS defaults](https://nodejs.org/api/esm.html#esm_enabling). In order to proper run the tests using this
library you need to configure Jest properly.

In your `jest.config.js` include this library in the `transformIgnorePattern` option and enable ts-jest transformation,
like this:

```js

const { jsWithTs: tsjPreset } = require("ts-jest/presets");

module.exports = {
  // [...]
  transform: {
    ...tsjPreset.transform,
  },
  transformIgnorePatterns: [
    "<rootDir>/node_modules/(?!react-common-mui-components)",
  ],
  // [...]
};
```

In your `tsconfig.json` file make shure that `allowJs` is `true`.

If you don't want to mess your `tsconfig.json` file you can configure the
`jest.config.js` like this:

```js
const { jsWithTs: tsjPreset } = require("ts-jest/presets");

module.exports = {
  //[...]
  transform: {
    ...tsjPreset.transform,
  },
  transformIgnorePatterns: [
    "<rootDir>/node_modules/(?!react-common-mui-components)",
  ],
  // Specifies a different tsconfig file for testing
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
};
```

And create a `tsconfig.test.json` file with:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "allowJs": "true"
  }
}
```

See [ts-jest documentation](https://kulshekhar.github.io/ts-jest/docs/) for more info.

## Hooks

### `useAsyncEffect`

This hook provides a way to safely execute async calls without worry with memory leak.

#### Usage

```tsx
import axios from "axios";

const Component = () => {
  const [query, setQuery] = useState<string>();
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const status = useAsyncEffect(
    () => ({
      asyncCallback: () => {
        // Must return the promise, so it is possible to
        // cancel it if needed, or to proper send result to
        // onSuccess callback.
        return axios.get(encodeURI(`/countries?query=${query}`));
      },
      onSuccess: (countries) => {
        // Do anything with result
        // IT IS SAFE TO CHANGE STATES HERE
        setCountries(countries)
      },
      onError: (error) => {
        // Handle errors here
        // IT IS SAFE TO CHANGE STATES HERE

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          setErrorMessage("Unauthorized.")
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          setErrorMessage("Server is not responding.")
        } else {
          // Something happened in setting up the request that triggered an Error
          setErrorMessage("Failed to fetch countries.");
        }
      },
      cleanup: () => {
        // remove subscriptions here
        // DON'T CHANGE STATES HERE!!
      }
    }),
    [fetchCountries]
  );

  const handleSelect = (country: Country) => {
    // do stuff here
  }

  return (
    <div>
      <Loading
        show={status === AsyncCallbackStatus.evaluating}
      />
      <ErrorMessage message={errorMessage} />
      <CountrySelector
        countries={countries}
        onSelect={handleSelect}
        value={address.country}
      />
    < /div>
  )
};
```

### `useAsyncCallback`

This hook provides a way to execute the async callback within an imperative function.

#### Usage:

 ```tsx
import { useAsyncCallback } from "react-js-async-hooks"
import axios from "axios";
import { AsyncCallbackStatus } from "./enums";
//[...]

const Component: React.FC = (props) => {
  const updateAddress = useAsyncCallback(
    (address: Address) =>
      // Must return the Promise!!!
      axios.post(
        encodeURI(`/address/${address.id}/save`),
        { ...address }
      ),
    []
  );
  const countries = useCountries();
  const [address, setAddress] = useState<Address>()
  const [status, setStatus] = useState(AsyncCallbackStatus.idle);

  function handleSelect(country: Country) {
    const updatedAddress = { ...address, country }
    setStatus(AsyncCallbackStatus.evaluating)
    updateAddress(updatedAddress)
      .then((savedAddress) => {
        // Do whatherver you want with the async callback result
        // IT IS SAFE TO CHANGE STATES HERE
        setAddress(savedAddress);
        setStatus(AsyncCallbackStatus.success)
      })
      .catch((e) => {
        // Handle error here
        
        if (!e.isCanceled) {
          // IT IS SAFE TO CHANGE STATES HERE
          setStatus(AsyncCallbackStatus.failed)
        }
        
        // IT IS NOT SAFE TO CHANGE STATES HERE
      });
  }

  return (
    <div>
      <AddressUpdateStatus status={status} />
      <CountrySelector
        countries={countries}
        onSelect={handleSelect}
        value={address.country}
      />
      <!-- ... -->
    </div>
  )
}
 ```
