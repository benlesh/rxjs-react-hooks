# rxjs-react-hooks

License: MIT

A small library for integrating not-in-the-render-cycle reactivity with React using RxJS.

## APIs

## useObservedValue

Gets values from any async/observable type (Observables, Promises, AsyncIterators, Iterables, et al), as handled safely by RxJS. **The reference you pass is important!**. Will automatically clean up if the passed reference changes.

### Use with Observable:

```ts
import { useState, useMemo } from 'react';
import { timer, map } from 'rxjs';
import { useObservedValue } from 'rxjs-react-hooks';

// Numbers incrementing once a second, over time.
const numbers$ = timer(0, 1000);

export function App() {
	const [userInput, setUserInput] = useState(2);

	// It's recommended to use memoization to apply
	// pipable operations to observables, this ensures you have
	// the same reference unless something changes.
	const dividedNumbers$ = useMemo(
		() => numbers$.pipe(map(number => number / userInput)),
		[numbers$, userInput]
	);

	// Get the values from the observable. If the observable reference
	// changes, this will unsubscribe and subscribe to the new reference.
	const result = useObservedValue(numbers$);

	return (
		<div>
			<label>Divide by:</label>
			<input
				type="number"
				value={userInput}
				onChange={e => setUserInput(parseFloat(e.target.value))}
			/>
			<output>{result}</output>
		</div>
	);
}
```

### Use with async iterables (async generators):

```ts
import { useMemo, useState } from 'react';
import { useObservedValue } from 'rxjs-react-hooks';

export function App() {
	const [delay, setDelay] = useState(1000);

	// An async iterable of incrementing numbers over time
	const ticker = useMemo(
		async function* () {
			let n = 0;
			while (true) {
				await sleep(delay);
				yield n;
			}
		},
		[delay]
	);

	// "Subscribe" to the async iterable to get the values out.
	// Again, the *instance* reference matters here. If it changes,
	// This will "unsubscribe" and start over.
	const tick = useObservedValue(ticker);

	return (
		<div>
			<label htmlFor="delay">Delay</label>
			<input
				id="delay"
				type="range"
				min="100"
				max="3000"
				value={delay}
				onChange={e => setDelay(parseInt(e.target.value))}
			/>
			<output>{tick}</output>
		</div>
	);
}

/**
 * Returns a promise that fires after a specified delay
 */
function sleep(ms: number) {
	return new Promise(res => setTimeout(res, ms));
}
```

## useReactiveCallback

Creates a function and observable pair. Calling the function will cause the observable to emit. This observable cannot error or complete.

```ts
export function App() {
	// Get a function and observable that we'll
	// wire up to our input below.
	const [handleChanges, changeEvents$] =
		useReactiveCallback<React.ChangeEvent>();

	// Get an observable of throttled values
	const throttledInput$ = useMemo(
		() => changeEvents$.pipe(throttleTime(1000)),
		[changeEvents$]
	);

	// Get the throttled values has they arrive from our observable.
	const throttledValue = useObservedValue(throttledInput$);

	return (
		<>
			<input onChange={handleChanges} />
			<output>{trottledValue}</output>
		</>
	);
}
```
