import {
  EMPTY,
  ObservableInput,
  ObservedValueOf,
  OperatorFunction,
  Subject,
  exhaustMap,
  finalize,
  from,
  map,
  merge,
  scan,
} from "rxjs";

type QueueAction<T> =
  | {
      action: "add" | "remove";
      value: T;
    }
  | {
      action: "refresh";
    };

export const queueMap = <T, O extends ObservableInput<any>>(
  transformer: (value: T) => O,
  comparator: (a: T, b: T) => boolean = (a, b) => a === b,
): OperatorFunction<T, ObservedValueOf<O>> => {
  return (source$) => {
    const queueActions$ = new Subject<QueueAction<T>>();
    return merge(
      source$.pipe(map((value): QueueAction<T> => ({ action: "add", value }))),
      queueActions$,
    ).pipe(
      scan((buffer: T[], data: QueueAction<T>) => {
        if (data.action === "add") {
          if (
            !buffer.some((bufferValue) => comparator(data.value, bufferValue))
          ) {
            return [...buffer, data.value];
          }
        } else if (data.action === "remove") {
          return buffer.filter(
            (bufferValue) => !comparator(data.value, bufferValue),
          );
        } 
        return buffer;
      }, []),
      exhaustMap((queue) => {
        if (queue.length > 0) {
          const value = queue[0];
          queueActions$.next({
            action: "remove",
            value,
          });
          return from(transformer(value)).pipe(
            finalize(() => queueActions$.next({ action: "refresh" })),
          );
        } else {
          return EMPTY;
        }
      }),
    );
  };
};
