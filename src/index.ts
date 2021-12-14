import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { from, Observable, ObservableInput, Subject } from 'rxjs';

export function useObservedValue<V, D>(
	valueSource: ObservableInput<V> | null | undefined,
	config: {
		defaultValue: D;
		onError?: (error: any) => void;
		onComplete?: () => void;
		suspense?: boolean;
	}
): V | D;
export function useObservedValue<V, D>(
	valueSource: ObservableInput<V> | null | undefined,
	config?: {
		defaultValue?: undefined;
		onError?: (error: any) => void;
		onComplete?: () => void;
		suspense?: boolean;
	}
): V;
export function useObservedValue<V, D>(
	valueSource: ObservableInput<V> | null | undefined,
	config?: {
		defaultValue?: D;
		onError?: (error: any) => void;
		onComplete?: () => void;
		suspense?: boolean;
	}
) {
	const susRef = useRef(
		null as null | { sus: Promise<void> | null; found: (() => void) | null }
	);

	const { defaultValue, onError, onComplete, suspense } = config ?? {};
	const [value, setValue] = useState(defaultValue as V | D);

	useEffect(() => {
		if (valueSource) {
			const subscription = from(valueSource).subscribe({
				next: value => {
					susRef.current?.found?.();
					setValue(value);
				},
				error: err => {
					susRef.current?.found?.();
					onError?.(err);
				},
				complete: () => {
					susRef.current?.found?.();
					onComplete?.();
				},
			});
			return () => subscription.unsubscribe();
		}
	}, [valueSource]);

	if (suspense) {
		if (!susRef.current) {
			let resolver: () => void;
			const sus = new Promise<void>(resolve => {
				resolver = resolve;
			});
			susRef.current = {
				sus,
				found() {
					this.sus = this.found = null;
					resolver!();
				},
			};
		}
		if (susRef.current.sus) {
			throw susRef.current.sus;
		}
	}

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
