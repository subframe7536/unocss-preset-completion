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

function cls(...args: any): string {
  return args
}
