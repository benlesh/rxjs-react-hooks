import React, { useMemo } from 'react';
import { useObservedValue, useReactiveCallback } from '.';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { config, NEVER, ObservableInput, of, scan, Subject } from 'rxjs';

describe('useObservedValue', () => {
	describe('basic use case', () => {
		function TestComp({ source }: { source: ObservableInput<any> }) {
			const value = useObservedValue(source);
			return <output data-testid="output">{value}</output>;
		}

		test('should exist', () => {
			expect(useObservedValue).toBeDefined();
		});

		test('gets values for render', async () => {
			const subject = new Subject<string>();

			render(<TestComp source={subject} />);
			expect(screen.getByTestId('output')).toHaveTextContent('');

			subject.next('Hi');
			expect(screen.getByTestId('output')).toHaveTextContent('Hi');

			subject.next('There');
			expect(screen.getByTestId('output')).toHaveTextContent('There');
		});

		test('gets values for sync case', async () => {
			const values$ = of('Sync value');

			render(<TestComp source={values$} />);
			expect(screen.getByTestId('output')).toHaveTextContent('Sync value');
		});
	});

	describe('error handling', () => {
		beforeEach(() => {
			config.onUnhandledError = jest.fn();
		});

		afterEach(() => {
			config.onUnhandledError = null;
		});

		function TestComp({
			source,
			onError,
		}: {
			source: ObservableInput<any>;
			onError?: (err: any) => void;
		}) {
			const value = useObservedValue(source, {
				onError,
			});
			return <output data-testid="output">{value}</output>;
		}

		test('should fire an event for errors', () => {
			const errorHandler = jest.fn();
			const subject = new Subject<string>();

			render(<TestComp source={subject} onError={errorHandler} />);

			expect(screen.getByTestId('output')).toHaveTextContent('');

			subject.next('Test');
			expect(screen.getByTestId('output')).toHaveTextContent('Test');

			const error = new Error('test');
			subject.error(error);
			expect(errorHandler).toHaveBeenCalledWith(error);
			expect(screen.getByTestId('output')).toHaveTextContent('Test');
		});

		test('should use default RxJS error handling for unhandled errors', async () => {
			const subject = new Subject<string>();

			render(<TestComp source={subject} />);

			expect(screen.getByTestId('output')).toHaveTextContent('');

			subject.next('Test');
			expect(screen.getByTestId('output')).toHaveTextContent('Test');

			expect(config.onUnhandledError).not.toHaveBeenCalled();

			const error = new Error('test');
			subject.error(error);

			// Wait long enough for onUnhandledError to be called in RxJS.
			await sleep(0);

			expect(config.onUnhandledError).toHaveBeenCalledWith(error);
			expect(screen.getByTestId('output')).toHaveTextContent('Test');
		});
	});

	describe('completion callback', () => {
		function TestComp({
			source,
			onComplete,
		}: {
			source: ObservableInput<any>;
			onComplete?: () => void;
		}) {
			const value = useObservedValue(source, {
				onComplete,
			});
			return <output data-testid="output">{value}</output>;
		}

		test('should fire a completion handler if the observable completes', () => {
			const subject = new Subject<string>();
			const completeHandler = jest.fn();
			render(<TestComp source={subject} onComplete={completeHandler} />);

			expect(completeHandler).not.toHaveBeenCalled();
			subject.next('Test');
			expect(screen.getByTestId('output')).toHaveTextContent('Test');

			subject.complete();
			expect(completeHandler).toHaveBeenCalled();
		});
	});

	describe('default value', () => {
		function TestComp({ source }: { source: ObservableInput<any> }) {
			const value = useObservedValue(source, { defaultValue: 'Default' });
			return <output data-testid="output">{value}</output>;
		}

		test('should render the default value first', () => {
			const subject = new Subject<string>();
			render(<TestComp source={subject} />);

			expect(screen.getByTestId('output')).toHaveTextContent('Default');
			subject.next('Updated!');

			expect(screen.getByTestId('output')).toHaveTextContent('Updated!');
		});
	});
});

describe('useReactiveCallback', () => {
	test('should exist', () => {
		expect(useReactiveCallback).toBeDefined();
	});

	describe('used with useObservedValue', () => {
		function TestComp() {
			const [incrementClicks$, handleIncrementClick] = useReactiveCallback();

			const values$ = useMemo(
				() => incrementClicks$.pipe(scan(value => value + 1, 0)),
				[incrementClicks$]
			);

			const value = useObservedValue(values$, {
				defaultValue: 'Click the button',
			});

			return (
				<>
					<button onClick={handleIncrementClick}>Increment</button>
					<output data-testid="output">{value}</output>
				</>
			);
		}

		test('should work together', () => {
			render(<TestComp />);

			expect(screen.getByTestId('output')).toHaveTextContent(
				'Click the button'
			);

			fireEvent.click(screen.getByText('Increment'));
			expect(screen.getByTestId('output')).toHaveTextContent('1');

			fireEvent.click(screen.getByText('Increment'));
			expect(screen.getByTestId('output')).toHaveTextContent('2');
		});
	});

	describe('with selector specified', () => {
		function TestComp() {
			const [inputValues$, handleInputChange] = useReactiveCallback({
				selector: (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
			});

			const value = useObservedValue(inputValues$, {
				defaultValue: 'Awaiting input',
			});

			return (
				<>
					<label htmlFor="userinput">User Input</label>
					<input id="userinput" onChange={handleInputChange} />
					<output data-testid="output">{value}</output>
				</>
			);
		}

		test('should transform the event values', () => {
			render(<TestComp />);

			expect(screen.getByTestId('output')).toHaveTextContent('Awaiting input');

			fireEvent.change(screen.getByLabelText('User Input'), {
				target: { value: 'Hello' },
			});

			expect(screen.getByTestId('output')).toHaveTextContent('Hello');

			fireEvent.change(screen.getByLabelText('User Input'), {
				target: { value: 'World' },
			});

			expect(screen.getByTestId('output')).toHaveTextContent('World');
		});
	});
});

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
