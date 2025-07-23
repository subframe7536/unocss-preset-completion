interface Props {
  name: string
  class: string
}
export function Test(_props: Props): any {
  return <div className="" />
}
export function Icon(props: Props): any {
  return (
    <div
      className={cls(`i-${props.name} text-red`, props.name && '', props.class)}
      title={props.name}
    />
  )
}

export function Test1(props: Props): any {
  return <div className={cls('', 1 ? (2 > 0 ? 'foo' : 'bar') : 'baz', props.class)} />
}

export function Test2(props: Props): any {
  return (
    <div
      className={cls(
        'pointer-events-none b-(1 solid #555) block size-5 translate-x-0 rounded-full shadow-lg ring-0 transition-transform data-[checked]:translate-x-5',
        props.class,
      )}
    />
  )
}

function cls(...args: any): string {
  return args
}
