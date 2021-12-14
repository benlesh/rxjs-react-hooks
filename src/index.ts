import { useCallback, useEffect, useMemo, useState } from 'react';
import { from, identity, Observable, ObservableInput, Subject } from 'rxjs';

export function useObservedValue<V, D>(
	valueSource: ObservableInput<V> | null | undefined,
	config: {
		defaultValue: D;
		onError?: (error: any) => void;
		onComplete?: () => void;
	}
): V | D;
export function useObservedValue<V, D>(
	valueSource: ObservableInput<V> | null | undefined,
	config?: {
		defaultValue?: undefined;
		onError?: (error: any) => void;
		onComplete?: () => void;
	}
): V;
export function useObservedValue<V, D>(
	valueSource: ObservableInput<V> | null | undefined,
	config?: {
		defaultValue?: D;
		onError?: (error: any) => void;
		onComplete?: () => void;
	}
) {
	const { defaultValue, onError, onComplete } = config ?? {};
	const [value, setValue] = useState(defaultValue as V | D);

	useEffect(() => {
		if (valueSource) {
			const subscription = from(valueSource).subscribe({
				next: setValue,
				error: onError,
				complete: onComplete,
			});
			return () => subscription.unsubscribe();
		}
	}, [valueSource]);

	return value;
}

export function useReactiveCallback<V, R>(config: {
	selector: (value: V) => R;
	connector?: () => Subject<R>;
}): [Observable<R>, (value: V) => void];

export function useReactiveCallback<V>(config?: {
	selector?: undefined;
	connector?: () => Subject<V>;
}): [Observable<V>, (value: V) => void];

export function useReactiveCallback<V, R>(config?: {
	selector?: (value: V) => R;
	connector?: () => Subject<V | R>;
}): [Observable<V | R>, (value: V) => void] {
	const { selector, connector = () => new Subject() } = config ?? {};
	const subject = useMemo(connector, []);
	const callback = useCallback(
		(value: V) => {
			if (selector) {
				let result: R;
				try {
					result = selector(value);
				} catch (err: any) {
					subject.error(err);
					return;
				}
				subject.next(result);
			} else {
				subject.next(value);
			}
		},
		[subject, selector]
	);
	const observable = useMemo(() => subject.asObservable(), [subject]);
	return [observable, callback];
}
